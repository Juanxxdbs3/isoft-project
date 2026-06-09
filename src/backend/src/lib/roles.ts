import { SupabaseClient } from "@supabase/supabase-js";
import { FastifyBaseLogger } from "fastify";
import { Errors } from "./errors.js";

let _estudianteRolId: string | null = null;
let _psicologoRolId: string | null = null;

async function getRolId(
  supabase: SupabaseClient,
  nombre: string,
  logger: FastifyBaseLogger
): Promise<string> {
  const { data, error } = await supabase
    .from("rol")
    .select("id")
    .eq("nombre", nombre)
    .single();

  if (error || !data) {
    logger.error({ err: error, rolName: nombre }, `Rol "${nombre}" no encontrado en BD`);
    throw Errors.INTERNAL_SERVER_ERROR(`Error de configuración: rol "${nombre}" no encontrado`);
  }

  return data.id;
}

export async function getEstudianteRolId(
  supabase: SupabaseClient,
  logger: FastifyBaseLogger
): Promise<string> {
  if (!_estudianteRolId) {
    _estudianteRolId = await getRolId(supabase, "ESTUDIANTE", logger);
  }
  return _estudianteRolId;
}

export async function getPsicologoRolId(
  supabase: SupabaseClient,
  logger: FastifyBaseLogger
): Promise<string> {
  if (!_psicologoRolId) {
    _psicologoRolId = await getRolId(supabase, "PSICOLOGO", logger);
  }
  return _psicologoRolId;
}
