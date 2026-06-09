import { FastifyBaseLogger } from "fastify";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  RegisterBody,
  LoginBody,
  CheckPseudonymParams,
} from "./auth.schema.js";
import { UdecCampus, UserRole } from "../../types/domain.js";
import { Errors, AppError } from "../../lib/errors.js";
import {
  encryptStudentCode,
  decryptStudentCode,
  computeStudentCodeHash,
  getStudentCodeHash,
} from "../../lib/encryption.js";
import { validateStudentCode } from "../../lib/student-code.js";
import { getEstudianteRolId, getPsicologoRolId } from "../../lib/roles.js";
import { CONFIG } from "../../config.js";

// ──────────────────────────────────────
// Pseudonym generation
// ──────────────────────────────────────
function generatePseudonym(): string {
  const adjectives = [
    "Alegre", "Valiente", "Sereno", "Luminoso", "Sincero",
    "Creativo", "Amable", "Firme", "Constante", "Libre",
  ];
  const nouns = [
    "Sol", "Luna", "Mar", "Río", "Bosque",
    "Estrella", "Viento", "Nube", "Monte", "Flor",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)] as string;
  const noun = nouns[Math.floor(Math.random() * nouns.length)] as string;
  const num = Math.floor(Math.random() * 999) + 1;
  return `${adj}${noun}${num}`;
}

// ──────────────────────────────────────
// AuthService
// ──────────────────────────────────────
export class AuthService {
  constructor(
    private readonly supabaseAdmin: SupabaseClient,
    private readonly supabaseAnon: SupabaseClient,
    private readonly logger: FastifyBaseLogger
  ) {}

  /**
   * POST /auth/register
   *
   * 1. Validates pseudonym availability.
   * 2. Validates student code uniqueness (decrypts existing codes for comparison).
   * 3. Creates the user in Supabase Auth with email = `${studentCode}@mindbridge.local`.
   * 4. Inserts student, pseudonym, and registration_consent rows.
   */
  async register(data: RegisterBody): Promise<{
    student_id: string;
    pseudonym: string;
    campus: UdecCampus;
  }> {
    const { pseudonym, password, student_code, campus, terms_version } = data;

    // ── Determine pseudonym ──
    const finalPseudonym =
      pseudonym && pseudonym.trim().length > 0
        ? pseudonym.trim()
        : generatePseudonym();

    // ── Validate student code format ──
    const codeValidationError = validateStudentCode(student_code);
    if (codeValidationError) {
      throw Errors.VALIDATION_ERROR(codeValidationError);
    }

    // ── Check pseudonym not taken (admin, RLS bloquea lecturas anónimas) ──
    const { data: existingPseudonym } = await this.supabaseAdmin
      .from("pseudonym")
      .select("id")
      .ilike("texto", finalPseudonym)
      .maybeSingle();

    if (existingPseudonym) {
      throw Errors.PSEUDONYM_ALREADY_TAKEN();
    }

    // ── Check student code not already registered (admin, reads encrypted codes) ──
    const codeHash = computeStudentCodeHash(student_code, CONFIG.STUDENT_CODE_ENCRYPTION_KEY);

    const { data: allStudents } = await this.supabaseAdmin
      .from("student")
      .select("codigo_estudiante_encrypted");

    if (allStudents && allStudents.length > 0) {
      // Fast hash prefix check first
      const hashPrefix = codeHash.substring(0, 16);
      const candidates = allStudents.filter((s: { codigo_estudiante_encrypted: string }) =>
        getStudentCodeHash(s.codigo_estudiante_encrypted).startsWith(hashPrefix)
      );

      for (const candidate of candidates) {
        try {
          const decrypted = decryptStudentCode(
            candidate.codigo_estudiante_encrypted,
            CONFIG.STUDENT_CODE_ENCRYPTION_KEY
          );
          if (decrypted === student_code) {
            throw Errors.STUDENT_CODE_ALREADY_REGISTERED();
          }
        } catch (e) {
          if (e && typeof e === "object" && "error" in e) {
            throw e;
          }
          // Decryption error on existing record — log and continue
          this.logger.warn(
            { encrypted: candidate.codigo_estudiante_encrypted },
            "Failed to decrypt existing student code for dedup check"
          );
        }
      }
    }

    // ── Encrypt student code ──
    const encryptedCode = encryptStudentCode(
      student_code,
      CONFIG.STUDENT_CODE_ENCRYPTION_KEY
    );

    // ── Get ESTUDIANTE role ID (admin, RLS bloquea consultas anónimas a rol) ──
    const estudianteRolId = await getEstudianteRolId(
      this.supabaseAdmin,
      this.logger
    );

    // ── Create Supabase Auth user ──
    const authEmail = `${student_code}@mindbridge.local`;

    const { data: authData, error: authError } =
      await this.supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          role: "student",
          campus,
        },
        app_metadata: {
          role: "student",
          campus,
        },
      });

    if (authError) {
      this.logger.error({ err: authError }, "Supabase Auth createUser failed");
      throw Errors.INTERNAL_SERVER_ERROR(
        "Error al crear la cuenta de autenticación"
      );
    }

    if (!authData.user) {
      throw Errors.INTERNAL_SERVER_ERROR(
        "No se pudo crear el usuario de autenticación"
      );
    }

    const authUserId = authData.user.id;

    // ── Insert student row (admin, bypass RLS) ──
    const { error: studentError } = await this.supabaseAdmin.from("student").insert({
      id: authUserId,
      codigo_estudiante_encrypted: encryptedCode,
      campus,
      status: "ACTIVE",
      active_pseudonym_id: null, // Will update after pseudonym insert
      caso_formal_activo: false,
      rol_id: estudianteRolId,
    });

    if (studentError) {
      this.logger.error({ err: studentError }, "Failed to insert student");
      // Rollback: delete auth user
      await this.supabaseAdmin.auth.admin.deleteUser(authUserId).catch((e) => {
        this.logger.error({ err: e }, "Failed to rollback auth user");
      });
      throw Errors.INTERNAL_SERVER_ERROR("Error al crear el perfil de estudiante");
    }

    // ── Insert pseudonym (admin, bypass RLS) ──
    const { data: pseudonymData, error: pseudonymError } = await this.supabaseAdmin
      .from("pseudonym")
      .insert({
        student_id: authUserId,
        texto: finalPseudonym.toLowerCase(),
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (pseudonymError || !pseudonymData) {
      this.logger.error({ err: pseudonymError }, "Failed to insert pseudonym");
      // Cleanup
      await this.supabaseAdmin.from("student").delete().eq("id", authUserId).catch(() => {});
      await this.supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
      throw Errors.INTERNAL_SERVER_ERROR(
        "Error al crear el seudónimo"
      );
    }

    // ── Update student with active_pseudonym_id ──
    const { error: updateError } = await this.supabaseAdmin
      .from("student")
      .update({ active_pseudonym_id: pseudonymData.id })
      .eq("id", authUserId);

    if (updateError) {
      this.logger.error(
        { err: updateError },
        "Failed to update student active_pseudonym_id"
      );
      // Non-fatal: student can still be found via pseudonym
    }

    // ── Insert registration_consent (admin, bypass RLS) ──
    const { error: consentError } = await this.supabaseAdmin
      .from("registration_consent")
      .insert({
        student_id: authUserId,
        pseudonym_at_acceptance: finalPseudonym,
        document_version: terms_version,
        mechanism: "INTERNAL_CHECKBOX",
      });

    if (consentError) {
      this.logger.error(
        { err: consentError },
        "Failed to insert registration_consent"
      );
      // Non-fatal: consent is logged but registration already succeeded
    }

    this.logger.info(
      { studentId: authUserId, pseudonym: finalPseudonym, campus },
      "Student registered successfully"
    );

    return {
      student_id: authUserId,
      pseudonym: finalPseudonym,
      campus,
    };
  }

  /**
   * POST /auth/login
   *
   * For students:
   *   - Identifier is the pseudonym.
   *   - Look up pseudonym → get student_id → decrypt student code → form email.
   *   - Sign in with email + password.
   *
   * For psychologists:
   *   - Identifier is their institutional email.
   *   - Sign in with email + password.
   */
  async login(data: LoginBody) {
    const { identifier, password, role } = data;

    let userId: string;
    let email: string;

    if (role === "student") {
      // Look up pseudonym (admin, RLS bloquea lecturas anónimas)
      const { data: pseudonymData, error: pseudonymError } = await this.supabaseAdmin
        .from("pseudonym")
        .select("student_id, texto")
        .ilike("texto", identifier)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (pseudonymError || !pseudonymData) {
        throw Errors.INVALID_CREDENTIALS();
      }

      const studentId = pseudonymData.student_id;

      // Get student record to decrypt the code (admin)
      const { data: studentData, error: studentError } = await this.supabaseAdmin
        .from("student")
        .select("codigo_estudiante_encrypted, status")
        .eq("id", studentId)
        .single();

      if (studentError || !studentData) {
        throw Errors.INVALID_CREDENTIALS();
      }

      // Check account status
      if (studentData.status === "SUSPENDED") {
        throw Errors.ACCOUNT_SUSPENDED();
      }
      if (studentData.status === "DELETED") {
        throw Errors.FORBIDDEN("Esta cuenta fue eliminada");
      }

      // Decrypt the student code to form the email
      try {
        const decryptedCode = decryptStudentCode(
          studentData.codigo_estudiante_encrypted,
          CONFIG.STUDENT_CODE_ENCRYPTION_KEY
        );
        email = `${decryptedCode}@mindbridge.local`;
      } catch {
        this.logger.error(
          { studentId },
          "Failed to decrypt student code during login"
        );
        throw Errors.INTERNAL_SERVER_ERROR("Error al procesar credenciales");
      }

      userId = studentId;
    } else {
      // Psychologist: identifier is the institutional email (admin, RLS bloquea lecturas anónimas)
      const { data: psychData, error: psychError } = await this.supabaseAdmin
        .from("psychologist")
        .select("id, status, correo_institucional")
        .eq("correo_institucional", identifier)
        .maybeSingle();

      if (psychError || !psychData) {
        throw Errors.INVALID_CREDENTIALS();
      }

      if (psychData.status === "SUSPENDED") {
        throw Errors.ACCOUNT_SUSPENDED();
      }
      if (psychData.status === "DELETED") {
        throw Errors.FORBIDDEN("Esta cuenta fue eliminada");
      }

      email = psychData.correo_institucional;
      userId = psychData.id;
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await this.supabaseAnon.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      this.logger.warn({ err: authError, email }, "Login failed");
      if (authError.message?.includes("Email not confirmed")) {
        throw Errors.UNAUTHORIZED("Correo electrónico no confirmado");
      }
      throw Errors.INVALID_CREDENTIALS();
    }

    if (!authData.session) {
      throw Errors.INVALID_CREDENTIALS();
    }

    // Fetch campus from DB using admin client (bypasses RLS, safe after auth)
    let campus: UdecCampus;

    if (role === "student") {
      const { data: profile } = await this.supabaseAdmin
        .from("student")
        .select("campus")
        .eq("id", userId)
        .single();

      campus = (profile?.campus || "CLAUSTRO_SAN_AGUSTIN") as UdecCampus;
    } else {
      const { data: profile } = await this.supabaseAdmin
        .from("psychologist")
        .select("campus")
        .eq("id", userId)
        .single();

      campus = (profile?.campus || "CLAUSTRO_SAN_AGUSTIN") as UdecCampus;
    }

    return {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      role,
      campus,
    };
  }

  /**
   * GET /auth/check-pseudonym/:pseudonym
   */
  async checkPseudonym(params: CheckPseudonymParams): Promise<{ available: boolean }> {
    const { pseudonym } = params;

    // Rule: pseudonym must not match real name patterns (basic validation)
    // In a full implementation, this could use a list of common names
    if (pseudonym.length < 3) {
      return { available: false };
    }

    const { data, error } = await this.supabaseAdmin
      .from("pseudonym")
      .select("id")
      .ilike("texto", pseudonym)
      .maybeSingle();

    if (error) {
      this.logger.error({ err: error }, "checkPseudonym query failed");
      throw Errors.INTERNAL_SERVER_ERROR();
    }

    return { available: !data };
  }

  /**
   * GET /auth/me
   *
   * Returns the profile of the authenticated user based on their role.
   */
  async getProfile(userId: string, role: UserRole) {
    if (role === "student") {
      const { data: student, error: studentError } = await this.supabaseAdmin
        .from("student")
        .select(
          `
          id,
          campus,
          status,
          caso_formal_activo,
          created_at,
          updated_at,
          active_pseudonym_id,
          pseudonym!student_active_pseudonym_id_fkey (
            texto,
            avatar_url
          )
        `
        )
        .eq("id", userId)
        .single();

      if (studentError || !student) {
        this.logger.error({ err: studentError, userId }, "Student not found");
        throw Errors.NOT_FOUND("Estudiante");
      }

      return {
        id: student.id,
        role: "student" as const,
        pseudonym: (student as any).pseudonym?.texto || null,
        avatar_url: (student as any).pseudonym?.avatar_url || null,
        campus: student.campus,
        caso_formal_activo: student.caso_formal_activo,
        created_at: student.created_at,
        updated_at: student.updated_at,
      };
    }

    if (role === "psychologist") {
      const { data: psychologist, error: psychError } = await this.supabaseAdmin
        .from("psychologist")
        .select(
          `
          id,
          nombre,
          correo_institucional,
          campus,
          shift,
          participacion_foro_habilitada,
          email_alerts_subscribed,
          pseudonimo_institucional,
          created_at
        `
        )
        .eq("id", userId)
        .single();

      if (psychError || !psychologist) {
        this.logger.error({ err: psychError, userId }, "Psychologist not found");
        throw Errors.NOT_FOUND("Psicólogo");
      }

      return {
        id: psychologist.id,
        role: "psychologist" as const,
        nombre: psychologist.nombre,
        correo_institucional: psychologist.correo_institucional,
        campus: psychologist.campus,
        shift: psychologist.shift,
        participacion_foro_habilitada: psychologist.participacion_foro_habilitada,
        email_alerts_subscribed: psychologist.email_alerts_subscribed,
        pseudonimo_institucional: psychologist.pseudonimo_institucional,
        created_at: psychologist.created_at,
      };
    }

    throw Errors.FORBIDDEN("Rol no soportado");
  }

  /**
   * POST /auth/logout
   */
  async logout(refreshToken: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.signOut(refreshToken);
    if (error) {
      this.logger.warn({ err: error }, "Logout failed");
      // Non-fatal: token will expire naturally
    }
  }

  /**
   * DELETE /auth/account
   *
   * Deletes the student's account by:
   * 1. Verifying the password via Supabase Auth signIn.
   * 2. Setting student.status = 'DELETED'.
   * 3. Clearing active_pseudonym_id.
   */
  async deleteAccount(userId: string, password: string): Promise<{ success: boolean }> {
    // Look up student to get encrypted code (admin, bypass RLS)
    const { data: studentData, error: studentError } = await this.supabaseAdmin
      .from("student")
      .select("codigo_estudiante_encrypted")
      .eq("id", userId)
      .single();

    if (studentError || !studentData) {
      this.logger.error({ err: studentError, userId }, "Student not found for deletion");
      throw Errors.NOT_FOUND("Estudiante");
    }

    // Decrypt the student code to form the email
    let decryptedCode: string;
    try {
      decryptedCode = decryptStudentCode(
        studentData.codigo_estudiante_encrypted,
        CONFIG.STUDENT_CODE_ENCRYPTION_KEY
      );
    } catch {
      this.logger.error({ userId }, "Failed to decrypt student code during account deletion");
      throw Errors.INTERNAL_SERVER_ERROR("Error al procesar credenciales");
    }

    const email = `${decryptedCode}@mindbridge.local`;

    // Verify password via Supabase Auth signIn (uses anon client)
    const { error: authError } = await this.supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      this.logger.warn({ err: authError, userId }, "Account deletion — password verification failed");
      throw Errors.INVALID_CREDENTIALS();
    }

    // Set student status to DELETED and clear active pseudonym (admin client)
    const { error: updateError } = await this.supabaseAdmin
      .from("student")
      .update({
        status: "DELETED",
        active_pseudonym_id: null,
      })
      .eq("id", userId);

    if (updateError) {
      this.logger.error({ err: updateError, userId }, "Failed to update student status to DELETED");
      throw Errors.INTERNAL_SERVER_ERROR("Error al eliminar la cuenta");
    }

    // Deactivate all active pseudonyms for audit trail
    const { error: pseudonymError } = await this.supabaseAdmin
      .from("pseudonym")
      .update({ status: "HISTORICAL", deactivated_at: new Date().toISOString() })
      .eq("student_id", userId)
      .eq("status", "ACTIVE");

    if (pseudonymError) {
      this.logger.error({ err: pseudonymError, userId }, "Failed to deactivate pseudonyms on account deletion");
      // Non-fatal: student already marked DELETED
    }

    this.logger.info({ userId }, "Student account deleted successfully");

    return { success: true };
  }

  /**
   * PATCH /auth/password-reset (internal, X-Admin-Reset-Secret required)
   */
  async resetPassword(
    studentId: string,
    newPassword: string
  ): Promise<{ reset: boolean }> {
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(
      studentId,
      { password: newPassword }
    );

    if (error) {
      this.logger.error({ err: error, studentId }, "Password reset failed");
      throw Errors.INTERNAL_SERVER_ERROR("Error al restablecer la contraseña");
    }

    return { reset: true };
  }
}
