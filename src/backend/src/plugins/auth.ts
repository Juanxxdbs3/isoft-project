import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import fp from "fastify-plugin";
import fjwt from "@fastify/jwt";
import { CONFIG } from "../config.js";
import { UdecCampus } from "../types/domain.js";
import { sendError, Errors } from "../lib/errors.js";

// ──────────────────────────────────────
// Augment @fastify/jwt types
// ──────────────────────────────────────
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      role?: string;
      campus?: string;
      user_metadata?: {
        role?: string;
        campus?: string;
      };
      app_metadata?: {
        role?: string;
        campus?: string;
      };
    };
    user: {
      sub: string;
      role: "student" | "psychologist";
      campus: UdecCampus;
    };
  }
}

// ──────────────────────────────────────
// Augment FastifyInstance with authenticate
// ──────────────────────────────────────
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

/**
 * Auth plugin.
 *
 * 1. Registers @fastify/jwt with the JWT secret from config.
 * 2. Provides an `authenticate` preHandler that:
 *    a. Verifies the JWT signature locally via @fastify/jwt.
 *    b. Calls Supabase Auth `getUser()` API for extra verification.
 *    c. Extracts role and campus from metadata and sets request.user.
 *
 * The JWT payload contains role + campus in `app_metadata` (set at registration
 * via Supabase admin API). We fall back to `user_metadata` if absent.
 */
const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ── Register @fastify/jwt ──
  await fastify.register(fjwt, {
    secret: CONFIG.JWT_SECRET,
    sign: {
      expiresIn: "7d",
    },
    trusted: (request, decodedToken) => {
      // Additional validation can go here
      return true;
    },
  });

  // ── authenticate preHandler ──
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return sendError(reply, Errors.UNAUTHORIZED());
      }

      const token = authHeader.slice(7);

      try {
        // Step 1: Verify JWT signature locally
        const decoded = await request.jwtVerify<{
          sub: string;
          role?: string;
          campus?: string;
          app_metadata?: { role?: string; campus?: string };
          user_metadata?: { role?: string; campus?: string };
        }>();

        // Step 2: Extra verification via Supabase Auth API
        const { data: userData, error: userError } =
          await fastify.supabase.auth.getUser(token);

        if (userError || !userData?.user) {
          request.log.warn(
            { err: userError },
            "Supabase Auth getUser failed for token"
          );
          return sendError(
            reply,
            Errors.UNAUTHORIZED("Token inválido o expirado")
          );
        }

        // Step 3: Extract role and campus from metadata
        const appMetadata = decoded.app_metadata || {};
        const userMetadata = decoded.user_metadata || {};
        const role = (appMetadata.role ||
          userMetadata.role ||
          decoded.role) as "student" | "psychologist";
        const campus = (appMetadata.campus ||
          userMetadata.campus ||
          decoded.campus) as UdecCampus;

        if (!role || !campus) {
          request.log.warn(
            { decoded },
            "JWT missing role or campus in metadata"
          );
          return sendError(
            reply,
            Errors.FORBIDDEN("Token sin información de rol o sede")
          );
        }

        // Step 4: Set request.user (overrides @fastify/jwt's default user)
        request.user = {
          sub: decoded.sub,
          role,
          campus,
        };
      } catch (err: any) {
        if (err?.code === "FAST_JWT_EXPIRED") {
          return sendError(reply, Errors.UNAUTHORIZED("Token expirado"));
        }
        if (err?.code === "FAST_JWT_INVALID") {
          return sendError(reply, Errors.UNAUTHORIZED("Token inválido"));
        }
        request.log.error({ err }, "Authentication error");
        return sendError(reply, Errors.UNAUTHORIZED());
      }
    }
  );

  fastify.log.info("Auth plugin initialized");
};

export default fp(authPlugin, {
  name: "auth",
  dependencies: ["supabase"],
});
