import { z } from "zod";

export const AlertsQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "SERVED", "FALSE_POSITIVE", "COMPLEMENTARY"]).optional(),
});

export type AlertsQuery = z.infer<typeof AlertsQuerySchema>;

export const AlertIdParamsSchema = z.object({
  alertId: z.string().uuid("ID de alerta inválido"),
});

export type AlertIdParams = z.infer<typeof AlertIdParamsSchema>;

export const UpdateAlertStatusBodySchema = z.object({
  status: z.enum(["SERVED", "FALSE_POSITIVE"]),
});

export type UpdateAlertStatusBody = z.infer<typeof UpdateAlertStatusBodySchema>;
