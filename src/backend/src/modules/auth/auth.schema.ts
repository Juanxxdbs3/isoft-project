import { z } from "zod";

// ──────────────────────────────────────
// UdeC campus enum values
// ──────────────────────────────────────
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

// ──────────────────────────────────────
// POST /auth/register
// ──────────────────────────────────────
export const RegisterBodySchema = z.object({
  pseudonym: z
    .string()
    .min(0)
    .max(30)
    .optional()
    .default("")
    .describe("Pseudónimo (vacío → generación automática)"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  student_code: z
    .string()
    .regex(/^\d{10}$/, "El código estudiantil debe tener exactamente 10 dígitos"),
  campus: z.enum(udecCampusValues, {
    errorMap: () => ({ message: "Sede inválida" }),
  }),
  accepted_terms: z
    .boolean()
    .refine((val) => val === true, "Debes aceptar los términos y condiciones"),
  terms_version: z.string().min(1, "La versión de términos es requerida"),
  age_declaration: z
    .boolean()
    .refine((val) => val === true, "Debes declarar que eres mayor de edad"),
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>;

// ──────────────────────────────────────
// POST /auth/login
// ──────────────────────────────────────
export const LoginBodySchema = z.object({
  identifier: z.string().min(1, "El identificador es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
  role: z.enum(["student", "psychologist"], {
    errorMap: () => ({ message: "Rol inválido. Debe ser student o psychologist" }),
  }),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

// ──────────────────────────────────────
// GET /auth/check-pseudonym/:pseudonym
// ──────────────────────────────────────
export const CheckPseudonymParamsSchema = z.object({
  pseudonym: z
    .string()
    .min(1, "El pseudónimo es requerido")
    .max(30, "El pseudónimo no puede exceder 30 caracteres"),
});

export type CheckPseudonymParams = z.infer<typeof CheckPseudonymParamsSchema>;

// ──────────────────────────────────────
// DELETE /auth/account
// ──────────────────────────────────────
export const DeleteAccountBodySchema = z.object({
  password: z.string().min(1, "Contraseña requerida"),
});
export type DeleteAccountBody = z.infer<typeof DeleteAccountBodySchema>;

// ──────────────────────────────────────
// PATCH /auth/password-reset
// ──────────────────────────────────────
export const PasswordResetBodySchema = z.object({
  student_id: z.string().uuid("ID de estudiante inválido"),
  new_password_plain: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export type PasswordResetBody = z.infer<typeof PasswordResetBodySchema>;
