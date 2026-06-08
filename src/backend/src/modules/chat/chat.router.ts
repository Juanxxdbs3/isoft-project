import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { ChatService } from "./chat.service.js";
import {
  RoomIdParamsSchema,
  CreateMessageBodySchema,
  MessagesQuerySchema,
} from "./chat.schema.js";
import { sendError, Errors } from "../../lib/errors.js";

const chatRouter: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const chatService = new ChatService(fastify.supabase, fastify.log);

  // ──────────────────────────────────────
  // GET /chat/rooms/active — Get active room(s) for current user
  // IMPORTANT: must be registered BEFORE /rooms/:roomId/* routes
  // to prevent "active" from being matched as a roomId param.
  // ──────────────────────────────────────
  fastify.get(
    "/rooms/active",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const result = await chatService.getActiveRoom(
          request.user.sub,
          request.user.role
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
        request.log.error({ err }, "Get active room failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // POST /chat/rooms/:roomId/messages — Create message
  // ──────────────────────────────────────
  fastify.post(
    "/rooms/:roomId/messages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RoomIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      const bodyResult = CreateMessageBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            bodyResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await chatService.createMessage(
          paramsResult.data.roomId,
          request.user.sub,
          request.user.role,
          bodyResult.data.text_content,
          bodyResult.data.type
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
        request.log.error({ err }, "Create message failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // GET /chat/rooms/:roomId/messages — List room messages
  // ──────────────────────────────────────
  fastify.get(
    "/rooms/:roomId/messages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RoomIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      const queryResult = MessagesQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            queryResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await chatService.getMessages(
          paramsResult.data.roomId,
          request.user.sub,
          queryResult.data
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
        request.log.error({ err }, "Get messages failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );
};

export default chatRouter;
