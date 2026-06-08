import { z } from "zod";

export const UpdateStudentProfileBodySchema = z.object({
  nombre_completo: z.string().max(200).optional(),
  programa: z.string().max(10).optional(),
  semestre: z.number().int().min(1).max(12).optional(),
  correo_contacto: z.string().email().max(200).optional(),
  pseudonym: z.string().min(1).max(30).optional(),
  password: z.string().min(8).optional(),
});

export type UpdateStudentProfileBody = z.infer<typeof UpdateStudentProfileBodySchema>;
