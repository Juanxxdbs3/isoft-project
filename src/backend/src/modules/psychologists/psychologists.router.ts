import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { PsychologistsService } from "./psychologists.service.js";
import { SupabasePsychologistRepository } from "../../repositories/psychologist.repository.js";
import { CreatePsychologistBodySchema } from "./psychologists.schema.js";
import { sendError, Errors } from "../../lib/errors.js";
import { CONFIG } from "../../config.js";

const psychologistsRouter: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const repo = new SupabasePsychologistRepository(fastify.supabase);
  const service = new PsychologistsService(repo, fastify.supabase, fastify.log);

  // ──────────────────────────────────────
  // POST /admin/psychologists — Create psychologist (X-Admin-Secret)
  // ──────────────────────────────────────
  fastify.post(
    "/psychologists",
    {},
    async (request, reply) => {
      // Validate admin secret header
      const adminSecret = request.headers["x-admin-secret"];
      if (adminSecret !== CONFIG.ADMIN_SECRET) {
        return sendError(
          reply,
          Errors.UNAUTHORIZED("X-Admin-Secret inválido o ausente")
        );
      }

      // Validate request body
      const parseResult = CreatePsychologistBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            parseResult.error.issues
              .map((i) => i.message)
              .join("; ")
          )
        );
      }

      try {
        const result = await service.createPsychologist(parseResult.data);
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Create psychologist failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );
};

export default psychologistsRouter;
