import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { AlertsService } from "./alerts.service.js";
import {
  AlertsQuerySchema,
  AlertIdParamsSchema,
  UpdateAlertStatusBodySchema,
} from "./alerts.schema.js";
import { sendError, Errors } from "../../lib/errors.js";
import { SupabaseAlertRepository } from "../../repositories/alert.repository.js";
import { SupabaseCaseRepository } from "../../repositories/case.repository.js";

const alertsRouter: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const alertRepo = new SupabaseAlertRepository(fastify.supabase);
  const caseRepo = new SupabaseCaseRepository(fastify.supabase);
  const alertsService = new AlertsService(fastify.supabase, fastify.log, alertRepo, caseRepo);

  fastify.get(
    "/",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden acceder a este recurso")
        );
      }

      const parseResult = AlertsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            parseResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await alertsService.listAlerts(
          request.user.campus,
          parseResult.data
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "List alerts failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.get(
    "/:alertId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden acceder a este recurso")
        );
      }

      const paramsResult = AlertIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await alertsService.getAlertDetail(
          paramsResult.data.alertId,
          request.user.sub,
          request.user.campus
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Get alert detail failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.post(
    "/:alertId/accept",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden aceptar alertas")
        );
      }

      const paramsResult = AlertIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await alertsService.acceptAlert(
          paramsResult.data.alertId,
          request.user.sub,
          request.user.campus
        );
        return reply.status(200).send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Accept alert failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.patch(
    "/:alertId/status",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden cambiar el estado de alertas")
        );
      }

      const paramsResult = AlertIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      const bodyResult = UpdateAlertStatusBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            bodyResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await alertsService.updateAlertStatus(
          paramsResult.data.alertId,
          request.user.sub,
          bodyResult.data.status
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Update alert status failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );
};

export default alertsRouter;
