import { z } from "zod";

export const udecCampusValues = [
  "CLAUSTRO_SAN_AGUSTIN",
  "ZARAGOCILLA",
  "PIEDRA_BOLIVAR",
  "CLAUSTRO_LA_MERCED",
  "CLAUSTRO_SANTO_DOMINGO",
  "EL_CARMEN_DE_BOLIVAR",
  "MAGANGUE",
  "SAN_JUAN_NEPOMUCENO",
  "SANTA_CRUZ_DE_MOMPOS",
  "CERETE",
  "LORICA",
] as const;

export const shiftValues = ["SHIFT_1", "SHIFT_2"] as const;

export const CreatePsychologistBodySchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  correo_institucional: z
    .string()
    .email("Correo institucional inválido"),
  campus: z.enum(udecCampusValues, {
    errorMap: () => ({ message: "Sede inválida" }),
  }),
  shift: z.enum(shiftValues, {
    errorMap: () => ({ message: "Turno inválido. Debe ser SHIFT_1 o SHIFT_2" }),
  }),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type CreatePsychologistBody = z.infer<typeof CreatePsychologistBodySchema>;

export const CreatePsychologistResponseSchema = z.object({
  psychologist_id: z.string().uuid(),
  campus: z.enum(udecCampusValues),
});

export type CreatePsychologistResponse = z.infer<typeof CreatePsychologistResponseSchema>;
