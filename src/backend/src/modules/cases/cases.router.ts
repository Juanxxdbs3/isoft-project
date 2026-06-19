import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { CasesService } from "./cases.service.js";
import {
  CaseIdParamsSchema,
  CreateCaseBodySchema,
  FormalActiveParamsSchema,
  CasesQuerySchema,
  ArchiveChatBodySchema,
  CreateConsentBodySchema,
} from "./cases.schema.js";
import { sendError, Errors } from "../../lib/errors.js";
import { SupabaseCaseRepository } from "../../repositories/case.repository.js";
import { ChatService } from "../chat/chat.service.js";
import { CreateMessageBodySchema } from "../chat/chat.schema.js";

const casesRouter: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const caseRepo = new SupabaseCaseRepository(fastify.supabase);
  const casesService = new CasesService(fastify.supabase, fastify.log, caseRepo);
  const chatService = new ChatService(fastify.supabase, fastify.log);

  fastify.get(
    "/",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden listar casos")
        );
      }

      const parseResult = CasesQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            parseResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await casesService.listCases(
          request.user.sub,
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
        request.log.error({ err }, "List cases failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.get(
    "/:caseId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden acceder a un caso")
        );
      }

      const paramsResult = CaseIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await casesService.getCaseById(
          paramsResult.data.caseId,
          request.user.sub
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
        request.log.error({ err }, "Get case failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.post(
    "/",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "student") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los estudiantes pueden autoderivarse")
        );
      }

      const parseResult = CreateCaseBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            parseResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await casesService.createSelfReferral(
          request.user.sub
        );
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
        request.log.error({ err }, "Create self-referral failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.patch(
    "/:caseId/formal-active",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden activar el caso formal")
        );
      }

      const paramsResult = FormalActiveParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await casesService.setFormalActive(
          paramsResult.data.caseId,
          request.user.sub
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
        request.log.error({ err }, "Set formal active failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );
  // ── Chat ──

  fastify.post(
    "/:caseId/chat",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden crear salas de chat")
        );
      }

      const paramsResult = CaseIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(paramsResult.error.issues.map((i) => i.message).join("; "))
        );
      }

      try {
        const result = await casesService.createChatRoom(
          paramsResult.data.caseId,
          request.user.sub
        );
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Create chat room failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.get(
    "/:caseId/chat",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = CaseIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(paramsResult.error.issues.map((i) => i.message).join("; "))
        );
      }

      try {
        const caseId = paramsResult.data.caseId;
        request.log.debug({ caseId }, "GET /:caseId/chat — querying chat_room");

        const { data: room, error: roomError } = await fastify.supabase
          .from("chat_room")
          .select("id, status")
          .eq("case_id", caseId)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (roomError) {
          request.log.error({ err: roomError, caseId }, "chat_room query error");
        }

        if (!room) {
          request.log.warn({ caseId }, "No active chat_room found for case, trying without status filter");
          const { data: anyRoom, error: anyError } = await fastify.supabase
            .from("chat_room")
            .select("id, status")
            .eq("case_id", caseId)
            .maybeSingle();
          if (anyError) {
            request.log.error({ err: anyError, caseId }, "Fallback chat_room query error");
          }
          request.log.warn({ anyRoom, anyError }, "Fallback query result");
          return reply.send({
            data: { chat_id: null, status: null, messages: [] },
          });
        }

        const messages = await chatService.getMessages(
          room.id,
          request.user.sub,
          { limit: 50 }
        );

        return reply.send({
          data: {
            chat_id: room.id,
            status: room.status,
            messages,
          },
        });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Get case chat failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.post(
    "/:caseId/chat/messages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = CaseIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(paramsResult.error.issues.map((i) => i.message).join("; "))
        );
      }

      const bodyResult = CreateMessageBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(bodyResult.error.issues.map((i) => i.message).join("; "))
        );
      }

      try {
        const { data: room } = await fastify.supabase
          .from("chat_room")
          .select("id")
          .eq("case_id", paramsResult.data.caseId)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (!room) {
          return sendError(
            reply,
            Errors.NOT_FOUND("Sala de chat no encontrada para este caso")
          );
        }

        const result = await chatService.createMessage(
          room.id,
          request.user.sub,
          request.user.role.toUpperCase(),
          bodyResult.data.text_content,
          bodyResult.data.type,
        );
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Send chat message failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  fastify.patch(
    "/:caseId/chat",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden archivar salas de chat")
        );
      }

      const paramsResult = CaseIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(paramsResult.error.issues.map((i) => i.message).join("; "))
        );
      }

      const bodyResult = ArchiveChatBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(bodyResult.error.issues.map((i) => i.message).join("; "))
        );
      }

      try {
        const result = await casesService.archiveChatRoom(
          paramsResult.data.caseId,
          request.user.sub
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Archive chat room failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ── Consent ──

  fastify.post(
    "/:caseId/consent",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "psychologist") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los psicólogos pueden registrar consentimientos")
        );
      }

      const paramsResult = CaseIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(paramsResult.error.issues.map((i) => i.message).join("; "))
        );
      }

      const bodyResult = CreateConsentBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(bodyResult.error.issues.map((i) => i.message).join("; "))
        );
      }

      try {
        const result = await casesService.createConsent(
          paramsResult.data.caseId,
          request.user.sub,
          request.user.campus,
          bodyResult.data.document_version
        );
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Create consent failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );
};

export default casesRouter;
