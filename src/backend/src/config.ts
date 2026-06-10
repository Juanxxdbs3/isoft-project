import dotenv from "dotenv";
import { z } from "zod";

// Load .env file in non-production environments
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  STUDENT_CODE_ENCRYPTION_KEY: z.string().min(64),
  NLP_SERVICE_URL: z.string().url().optional(),
  NLP_SERVICE_BEARER_TOKEN: z.string().optional(),
  ADMIN_SECRET: z.string().min(1, "ADMIN_SECRET es requerido para aprovisionamiento de psicólogos"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  FO_BU_O13_FORM_URL: z
    .string()
    .url()
    .default("https://forms.gle/placeholder-FO-BU-O13"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const CONFIG = parsed.data;

export type Config = z.infer<typeof envSchema>;
