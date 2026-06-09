import { SupabaseClient } from "@supabase/supabase-js";
import { FastifyBaseLogger } from "fastify";

export class StudentsService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: FastifyBaseLogger
  ) {}

  async updateProfile(
    studentId: string,
    data: {
      nombre_completo?: string;
      programa?: string;
      semestre?: number;
      correo_contacto?: string;
      pseudonym?: string;
      password?: string;
    }
  ): Promise<{ updatedComplementary: boolean; updatedPseudonym: boolean; updatedPassword: boolean }> {
    const result = {
      updatedComplementary: false,
      updatedPseudonym: false,
      updatedPassword: false,
    };

    const hasComplementary = data.nombre_completo !== undefined || data.programa !== undefined || data.semestre !== undefined || data.correo_contacto !== undefined;
    const hasPseudonym = data.pseudonym !== undefined;
    const hasPassword = data.password !== undefined;

    if (hasComplementary) {
      const payload: Record<string, unknown> = {};
      if (data.nombre_completo !== undefined) payload.nombre_completo = data.nombre_completo;
      if (data.programa !== undefined) payload.programa = data.programa;
      if (data.semestre !== undefined) payload.semestre = data.semestre;
      if (data.correo_contacto !== undefined) payload.correo_contacto = data.correo_contacto;

      const { error: upsertError } = await this.supabase
        .from("complementary_data")
        .upsert(
          { student_id: studentId, ...payload, updated_at: new Date().toISOString() },
          { onConflict: "student_id" }
        );

      if (upsertError) {
        this.logger.error({ err: upsertError }, "Failed to upsert complementary_data");
        throw new Error("Error al actualizar datos complementarios");
      }
      result.updatedComplementary = true;
    }

    if (hasPseudonym) {
      const { data: activePseudonym, error: lookupError } = await this.supabase
        .from("pseudonym")
        .select("id")
        .eq("student_id", studentId)
        .eq("status", "ACTIVE")
        .single();

      if (lookupError || !activePseudonym) {
        this.logger.error({ err: lookupError }, "Failed to find active pseudonym");
        throw new Error("No se encontró un seudónimo activo");
      }

      // ── Deactivate old pseudonym (preserve audit trail) ──
      const { error: deactivateError } = await this.supabase
        .from("pseudonym")
        .update({
          status: "HISTORICAL",
          deactivated_at: new Date().toISOString(),
        })
        .eq("id", activePseudonym.id);

      if (deactivateError) {
        this.logger.error({ err: deactivateError }, "Failed to deactivate old pseudonym");
        throw new Error("Error al desactivar el seudónimo anterior");
      }

      // ── Insert new pseudonym row ──
      const { data: newPseudonym, error: insertError } = await this.supabase
        .from("pseudonym")
        .insert({
          student_id: studentId,
          texto: data.pseudonym,
          status: "ACTIVE",
        })
        .select("id")
        .single();

      if (insertError || !newPseudonym) {
        this.logger.error({ err: insertError }, "Failed to insert new pseudonym");
        throw new Error("Error al crear el nuevo seudónimo");
      }

      // ── Update student's active_pseudonym_id ──
      const { error: updateStudentError } = await this.supabase
        .from("student")
        .update({ active_pseudonym_id: newPseudonym.id })
        .eq("id", studentId);

      if (updateStudentError) {
        this.logger.error(
          { err: updateStudentError },
          "Failed to update student active_pseudonym_id"
        );
        // Non-fatal: student can still be found via pseudonym
      }

      result.updatedPseudonym = true;
    }

    if (hasPassword) {
      const { error: authError } = await this.supabase.auth.admin.updateUserById(
        studentId,
        { password: data.password }
      );

      if (authError) {
        this.logger.error({ err: authError }, "Failed to update password via Supabase Auth");
        throw new Error("Error al actualizar la contraseña");
      }
      result.updatedPassword = true;
    }

    return result;
  }
}
