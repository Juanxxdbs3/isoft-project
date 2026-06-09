import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CONFIG } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
    supabaseAnon: SupabaseClient;
  }
}

/**
 * Supabase plugin.
 *
 * Initializes two Supabase clients:
 * - `fastify.supabase`: admin client using the service_role key — bypasses RLS.
 * - `fastify.supabaseAnon`: anon client — respects RLS for public reads.
 *
 * Both use `persistSession: false` to prevent server-side session contamination.
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

  const supabaseAnon = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  fastify.decorate("supabaseAnon", supabaseAnon);

  fastify.log.info("Supabase clients initialized (service_role + anon)");
};

export default fp(supabasePlugin, {
  name: "supabase",
});
