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
        // Step 1: Decode JWT locally (no signature verification — Supabase tokens
        // are signed with Supabase's own key, not ours). Real verification
        // is done via Supabase Auth API in step 2.
        const decoded = fastify.jwt.decode<{
          sub: string;
          role?: string;
          campus?: string;
          app_metadata?: { role?: string; campus?: string };
          user_metadata?: { role?: string; campus?: string };
        }>(token);

        if (!decoded || !decoded.sub) {
          return sendError(reply, Errors.UNAUTHORIZED("Token inválido"));
        }

        // Step 2: Verify token via Supabase Auth API
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
        let role = (appMetadata.role ||
          userMetadata.role ||
          decoded.role) as "student" | "psychologist" | undefined;
        let campus = (appMetadata.campus ||
          userMetadata.campus ||
          decoded.campus) as UdecCampus | undefined;

        // Fallback: query DB if metadata is missing (users created directly
        // in Supabase Studio often lack metadata).
        if (!role || !campus) {
          try {
            // Try student table
            const { data: studentData } = await fastify.supabase
              .from("student")
              .select("campus")
              .eq("id", decoded.sub)
              .maybeSingle();

            if (studentData) {
              role = "student";
              campus = studentData.campus as UdecCampus;
            } else {
              // Try psychologist table
              const { data: psychData } = await fastify.supabase
                .from("psychologist")
                .select("campus")
                .eq("id", decoded.sub)
                .maybeSingle();

              if (psychData) {
                role = "psychologist";
                campus = psychData.campus as UdecCampus;
              }
            }
          } catch (dbErr) {
            request.log.error({ err: dbErr }, "DB fallback for auth metadata failed");
          }
        }

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

        // Step 4: Set request.user
        request.user = {
          sub: decoded.sub,
          role,
          campus,
        };
      } catch (err: any) {
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
