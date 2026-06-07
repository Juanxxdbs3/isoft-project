import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CONFIG } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}

/**
 * Supabase plugin.
 *
 * Initializes two Supabase clients:
 * - `fastify.supabase`: admin client using the service_role key (server-side only).
 *
 * The service_role key bypasses RLS, so it must never be exposed to the frontend.
 */
const supabasePlugin: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  fastify.decorate("supabase", supabase);

  fastify.log.info("Supabase client initialized (service_role)");
};

export default fp(supabasePlugin, {
  name: "supabase",
});
