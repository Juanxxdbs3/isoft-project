import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { AuthService } from "./auth.service.js";
import {
  RegisterBodySchema,
  LoginBodySchema,
  CheckPseudonymParamsSchema,
  PasswordResetBodySchema,
} from "./auth.schema.js";
import { sendError, Errors } from "../../lib/errors.js";
import { CONFIG } from "../../config.js";

const authRouter: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const authService = new AuthService(fastify.supabase, fastify.supabaseAnon, fastify.log);

  // ──────────────────────────────────────
  // POST /auth/register
  // ──────────────────────────────────────
  fastify.post(
    "/register",
    {},
    async (request, reply) => {
      const parseResult = RegisterBodySchema.safeParse(request.body);
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
        const result = await authService.register(parseResult.data);
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Register failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // POST /auth/login
  // ──────────────────────────────────────
  fastify.post(
    "/login",
    {},
    async (request, reply) => {
      const parseResult = LoginBodySchema.safeParse(request.body);
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
        const result = await authService.login(parseResult.data);
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Login failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // GET /auth/check-pseudonym/:pseudonym
  // ──────────────────────────────────────
  fastify.get(
    "/check-pseudonym/:pseudonym",
    {},
    async (request, reply) => {
      const parseResult = CheckPseudonymParamsSchema.safeParse(request.params);
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
        const result = await authService.checkPseudonym(parseResult.data);
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "checkPseudonym failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // GET /auth/me
  // ──────────────────────────────────────
  fastify.get(
    "/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const profile = await authService.getProfile(
          request.user.sub,
          request.user.role
        );
        return reply.send({ data: profile });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Get profile failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // POST /auth/logout
  // ──────────────────────────────────────
  fastify.post(
    "/logout",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const refreshToken =
          (request.body as { refresh_token?: string })?.refresh_token || "";
        await authService.logout(refreshToken);
        return reply.status(204).send();
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Logout failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // PATCH /auth/password-reset
  // ──────────────────────────────────────
  fastify.patch(
    "/password-reset",
    {},
    async (request, reply) => {
      // Internal-only: check admin reset secret
      const adminSecret = request.headers["x-admin-reset-secret"];
      if (adminSecret !== CONFIG.NLP_SERVICE_BEARER_TOKEN) {
        return sendError(reply, Errors.FORBIDDEN("Acceso no autorizado"));
      }

      const parseResult = PasswordResetBodySchema.safeParse(request.body);
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
        const result = await authService.resetPassword(
          parseResult.data.student_id,
          parseResult.data.new_password_plain
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "error" in err && "statusCode" in err) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Password reset failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );
};

export default authRouter;
