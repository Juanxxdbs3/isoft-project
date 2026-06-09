import { FastifyBaseLogger } from "fastify";
import { SupabaseClient } from "@supabase/supabase-js";
import { IPsychologistRepository } from "../../repositories/interfaces.js";
import { CreatePsychologistBody } from "./psychologists.schema.js";
import { UdecCampus } from "../../types/domain.js";
import { getPsicologoRolId } from "../../lib/roles.js";
import { Errors } from "../../lib/errors.js";

export class PsychologistsService {
  constructor(
    private readonly repo: IPsychologistRepository,
    private readonly supabaseAdmin: SupabaseClient,
    private readonly logger: FastifyBaseLogger
  ) {}

  async createPsychologist(data: CreatePsychologistBody): Promise<{
    psychologist_id: string;
    campus: UdecCampus;
  }> {
    const { nombre, correo_institucional, campus, shift, password } = data;

    // ── Check email uniqueness ──
    const { data: existing } = await this.supabaseAdmin
      .from("psychologist")
      .select("id")
      .eq("correo_institucional", correo_institucional)
      .maybeSingle();

    if (existing) {
      throw Errors.CONFLICT(
        "EMAIL_ALREADY_EXISTS",
        "Este correo institucional ya está registrado"
      );
    }

    // ── Get PSICOLOGO role ID ──
    const psicologoRolId = await getPsicologoRolId(
      this.supabaseAdmin,
      this.logger
    );

    // ── Create Supabase Auth user ──
    const { data: authData, error: authError } =
      await this.supabaseAdmin.auth.admin.createUser({
        email: correo_institucional,
        password,
        email_confirm: true,
        user_metadata: {
          role: "psychologist",
          campus,
        },
        app_metadata: {
          role: "psychologist",
          campus,
        },
      });

    if (authError) {
      this.logger.error({ err: authError }, "Supabase Auth createUser failed for psychologist");
      throw Errors.INTERNAL_SERVER_ERROR(
        "Error al crear la cuenta de autenticación del psicólogo"
      );
    }

    if (!authData.user) {
      throw Errors.INTERNAL_SERVER_ERROR(
        "No se pudo crear el usuario de autenticación"
      );
    }

    const authUserId = authData.user.id;

    // ── Insert psychologist row (admin, bypass RLS) ──
    const { error: insertError } = await this.supabaseAdmin
      .from("psychologist")
      .insert({
        id: authUserId,
        nombre,
        correo_institucional,
        campus,
        shift,
        status: "ACTIVE",
        participacion_foro_habilitada: false,
        email_alerts_subscribed: true,
        pseudonimo_institucional: "Equipo de Bienestar Universitario",
        rol_id: psicologoRolId,
      });

    if (insertError) {
      this.logger.error({ err: insertError }, "Failed to insert psychologist");
      // Rollback: delete auth user
      await this.supabaseAdmin.auth.admin
        .deleteUser(authUserId)
        .catch((e) => {
          this.logger.error({ err: e }, "Failed to rollback auth user for psychologist");
        });

      if (insertError.message?.includes("duplicate key") || insertError.code === "23505") {
        // Also cleanup the auth user we just created
        throw Errors.CONFLICT(
          "EMAIL_ALREADY_EXISTS",
          "Este correo institucional ya está registrado"
        );
      }

      throw Errors.INTERNAL_SERVER_ERROR(
        "Error al crear el perfil del psicólogo"
      );
    }

    this.logger.info(
      { psychologistId: authUserId, nombre, campus, shift },
      "Psychologist created successfully"
    );

    return {
      psychologist_id: authUserId,
      campus,
    };
  }
}
