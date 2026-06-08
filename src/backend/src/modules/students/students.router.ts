import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { StudentsService } from "./students.service.js";
import { UpdateStudentProfileBodySchema } from "./students.schema.js";
import { sendError, Errors } from "../../lib/errors.js";

const studentsRouter: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const studentsService = new StudentsService(fastify.supabase, fastify.log);

  fastify.patch("/me", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== "student") {
      return sendError(reply, Errors.FORBIDDEN("Solo estudiantes pueden actualizar su perfil"));
    }

    const parseResult = UpdateStudentProfileBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(
        reply,
        Errors.VALIDATION_ERROR(parseResult.error.issues.map((i) => i.message).join("; "))
      );
    }

    try {
      const result = await studentsService.updateProfile(request.user.sub, parseResult.data);
      return reply.send({ data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error interno del servidor";
      request.log.error({ err }, "Failed to update student profile");
      return sendError(reply, Errors.INTERNAL_SERVER_ERROR(message));
    }
  });
};

export default studentsRouter;
