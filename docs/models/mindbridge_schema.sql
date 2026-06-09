


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."account_status" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DELETED'
);


ALTER TYPE "public"."account_status" OWNER TO "postgres";


CREATE TYPE "public"."adviser_export_status" AS ENUM (
    'NOT_EXPORTED',
    'EXPORTED_SUCCESS',
    'FAILED'
);


ALTER TYPE "public"."adviser_export_status" OWNER TO "postgres";


CREATE TYPE "public"."alert_status" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'SERVED',
    'FALSE_POSITIVE',
    'COMPLEMENTARY'
);


ALTER TYPE "public"."alert_status" OWNER TO "postgres";


CREATE TYPE "public"."case_status" AS ENUM (
    'OPENED',
    'ASSIGNED',
    'ARCHIVED',
    'RESOLVED'
);


ALTER TYPE "public"."case_status" OWNER TO "postgres";


CREATE TYPE "public"."case_type" AS ENUM (
    'AUTOMATIC_ALERT',
    'SELF_REFERRAL'
);


ALTER TYPE "public"."case_type" OWNER TO "postgres";


CREATE TYPE "public"."chat_status" AS ENUM (
    'ACTIVE',
    'CLOSED_BY_INACTIVITY',
    'ARCHIVED'
);


ALTER TYPE "public"."chat_status" OWNER TO "postgres";


CREATE TYPE "public"."content_status" AS ENUM (
    'VISIBLE',
    'MODERATED',
    'DELETED'
);


ALTER TYPE "public"."content_status" OWNER TO "postgres";


CREATE TYPE "public"."content_type" AS ENUM (
    'POST',
    'COMMENT'
);


ALTER TYPE "public"."content_type" OWNER TO "postgres";


CREATE TYPE "public"."export_format" AS ENUM (
    'PDF',
    'XML_PLACEHOLDER'
);


ALTER TYPE "public"."export_format" OWNER TO "postgres";


CREATE TYPE "public"."message_sender_role" AS ENUM (
    'STUDENT',
    'PSYCHOLOGIST'
);


ALTER TYPE "public"."message_sender_role" OWNER TO "postgres";


CREATE TYPE "public"."message_type" AS ENUM (
    'STANDARD_TEXT',
    'APPOINTMENT_PROPOSAL',
    'CHARACTERIZATION_LINK'
);


ALTER TYPE "public"."message_type" OWNER TO "postgres";


CREATE TYPE "public"."pseudonym_status" AS ENUM (
    'ACTIVE',
    'HISTORICAL'
);


ALTER TYPE "public"."pseudonym_status" OWNER TO "postgres";


CREATE TYPE "public"."risk_level" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE "public"."risk_level" OWNER TO "postgres";


CREATE TYPE "public"."shift_type" AS ENUM (
    'SHIFT_1',
    'SHIFT_2'
);


ALTER TYPE "public"."shift_type" OWNER TO "postgres";


CREATE TYPE "public"."udec_campus" AS ENUM (
    'CLAUSTRO_SAN_AGUSTIN',
    'ZARAGOCILLA',
    'PIEDRA_BOLIVAR',
    'CLAUSTRO_LA_MERCED',
    'CLAUSTRO_SANTO_DOMINGO',
    'EL_CARMEN_DE_BOLIVAR',
    'MAGANGUE',
    'SAN_JUAN_NEPOMUCENO',
    'SANTA_CRUZ_DE_MOMPOS',
    'CERETE',
    'LORICA'
);


ALTER TYPE "public"."udec_campus" OWNER TO "postgres";


CREATE TYPE "public"."user_role_type" AS ENUM (
    'STUDENT',
    'PSYCHOLOGIST'
);


ALTER TYPE "public"."user_role_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_chat_message_broadcast"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'room:' || NEW.chat_room_id::text || ':messages', -- topic
    TG_OP,                                              -- event
    TG_OP,                                              -- operation
    TG_TABLE_NAME,                                     -- table
    TG_TABLE_SCHEMA,                                   -- schema
    NEW,                                                -- new record
    OLD                                                 -- old record (NULL en INSERT)
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_chat_message_broadcast"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alert" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "nlp_analysis_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "campus" "public"."udec_campus" NOT NULL,
    "risk_level" "public"."risk_level" NOT NULL,
    "status" "public"."alert_status" DEFAULT 'PENDING'::"public"."alert_status" NOT NULL,
    "assigned_psychologist_id" "uuid",
    "is_complementary" boolean DEFAULT false NOT NULL,
    "ai_generated_summary" "text",
    "historical_snapshot" "jsonb",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    CONSTRAINT "chk_alert_psychologist_by_status" CHECK ((("status" = ANY (ARRAY['PENDING'::"public"."alert_status", 'COMPLEMENTARY'::"public"."alert_status"])) OR ("assigned_psychologist_id" IS NOT NULL)))
);


ALTER TABLE "public"."alert" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_message" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chat_room_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_role" "public"."message_sender_role" NOT NULL,
    "text_content" "text" NOT NULL,
    "message_type" "public"."message_type" DEFAULT 'STANDARD_TEXT'::"public"."message_type" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_message_text_content_check" CHECK (("char_length"("text_content") > 0))
);


ALTER TABLE "public"."chat_message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_room" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "psychologist_id" "uuid" NOT NULL,
    "status" "public"."chat_status" DEFAULT 'ACTIVE'::"public"."chat_status" NOT NULL,
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_activity_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone
);


ALTER TABLE "public"."chat_room" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinical_case" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "case_type" "public"."case_type" DEFAULT 'AUTOMATIC_ALERT'::"public"."case_type" NOT NULL,
    "status" "public"."case_status" DEFAULT 'OPENED'::"public"."case_status" NOT NULL,
    "assigned_psychologist_id" "uuid",
    "is_unsubscribed_from_recapture" boolean DEFAULT false NOT NULL,
    "adviser_export_status" "public"."adviser_export_status" DEFAULT 'NOT_EXPORTED'::"public"."adviser_export_status" NOT NULL,
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clinical_case" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "cited_comment_id" "uuid",
    "text_content" "text" NOT NULL,
    "status" "public"."content_status" DEFAULT 'VISIBLE'::"public"."content_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "comment_text_content_check" CHECK (("char_length"("text_content") > 0))
);


ALTER TABLE "public"."comment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complementary_data" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "nombre_completo" "text",
    "programa" "text",
    "semestre" smallint,
    "correo_contacto" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "complementary_data_semestre_check" CHECK ((("semestre" >= 1) AND ("semestre" <= 12)))
);


ALTER TABLE "public"."complementary_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."export_case" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "psychologist_id" "uuid" NOT NULL,
    "format" "public"."export_format" DEFAULT 'PDF'::"public"."export_format" NOT NULL,
    "send_status" "public"."adviser_export_status" DEFAULT 'NOT_EXPORTED'::"public"."adviser_export_status" NOT NULL,
    "recipient_email" "text",
    "included_optional_fields" "jsonb",
    "exported_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."export_case" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."in_app_notification" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_role" "public"."user_role_type" NOT NULL,
    "message" "text" NOT NULL,
    "risk_level" "public"."risk_level",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."in_app_notification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."informed_consent_signature" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "document_version" "text" NOT NULL,
    "form_code" "text" DEFAULT 'FO-BU-O13'::"text" NOT NULL,
    "signed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."informed_consent_signature" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nlp_analysis" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid",
    "comment_id" "uuid",
    "content_type" "public"."content_type" NOT NULL,
    "analyzed_text_snapshot" "text" NOT NULL,
    "depressive_probability" numeric(5,2),
    "anxiety_probability" numeric(5,2),
    "suicidal_probability" numeric(5,2),
    "base_malaise_index" numeric(5,2),
    "suicidal_override" boolean DEFAULT false NOT NULL,
    "community_rules_infraction" boolean DEFAULT false NOT NULL,
    "top_clinical_label" character varying(50),
    "risk_level" "public"."risk_level" NOT NULL,
    "analyzed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_nlp_single_content" CHECK (((("post_id" IS NOT NULL) AND ("comment_id" IS NULL)) OR (("post_id" IS NULL) AND ("comment_id" IS NOT NULL)))),
    CONSTRAINT "nlp_analysis_anxiety_probability_check" CHECK ((("anxiety_probability" >= (0)::numeric) AND ("anxiety_probability" <= (100)::numeric))),
    CONSTRAINT "nlp_analysis_base_malaise_index_check" CHECK ((("base_malaise_index" >= (0)::numeric) AND ("base_malaise_index" <= (100)::numeric))),
    CONSTRAINT "nlp_analysis_depressive_probability_check" CHECK ((("depressive_probability" >= (0)::numeric) AND ("depressive_probability" <= (100)::numeric))),
    CONSTRAINT "nlp_analysis_suicidal_probability_check" CHECK ((("suicidal_probability" >= (0)::numeric) AND ("suicidal_probability" <= (100)::numeric)))
);


ALTER TABLE "public"."nlp_analysis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "text_content" "text" NOT NULL,
    "status" "public"."content_status" DEFAULT 'VISIBLE'::"public"."content_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_text_content_check" CHECK (("char_length"("text_content") > 0))
);


ALTER TABLE "public"."post" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pseudonym" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "texto" character varying(30) NOT NULL,
    "avatar_url" "text",
    "status" "public"."pseudonym_status" DEFAULT 'ACTIVE'::"public"."pseudonym_status" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deactivated_at" timestamp with time zone
);


ALTER TABLE "public"."pseudonym" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."psychologist" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nombre" "text" NOT NULL,
    "correo_institucional" "text" NOT NULL,
    "campus" "public"."udec_campus" NOT NULL,
    "shift" "public"."shift_type" NOT NULL,
    "status" "public"."account_status" DEFAULT 'ACTIVE'::"public"."account_status" NOT NULL,
    "participacion_foro_habilitada" boolean DEFAULT false NOT NULL,
    "email_alerts_subscribed" boolean DEFAULT true NOT NULL,
    "pseudonimo_institucional" "text" DEFAULT 'Equipo de Bienestar Universitario'::"text" NOT NULL,
    "rol_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."psychologist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registration_consent" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "pseudonym_at_acceptance" character varying(30) NOT NULL,
    "document_version" character varying(20) NOT NULL,
    "mechanism" character varying(50) DEFAULT 'INTERNAL_CHECKBOX'::character varying NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."registration_consent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rol" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nombre" character varying(50) NOT NULL,
    "descripcion" "text"
);


ALTER TABLE "public"."rol" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "codigo_estudiante_encrypted" "text" NOT NULL,
    "campus" "public"."udec_campus" NOT NULL,
    "status" "public"."account_status" DEFAULT 'ACTIVE'::"public"."account_status" NOT NULL,
    "active_pseudonym_id" "uuid",
    "caso_formal_activo" boolean DEFAULT false NOT NULL,
    "rol_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alert"
    ADD CONSTRAINT "alert_nlp_analysis_id_key" UNIQUE ("nlp_analysis_id");



ALTER TABLE ONLY "public"."alert"
    ADD CONSTRAINT "alert_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_room"
    ADD CONSTRAINT "chat_room_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinical_case"
    ADD CONSTRAINT "clinical_case_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complementary_data"
    ADD CONSTRAINT "complementary_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complementary_data"
    ADD CONSTRAINT "complementary_data_student_id_key" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."export_case"
    ADD CONSTRAINT "export_case_case_id_key" UNIQUE ("case_id");



ALTER TABLE ONLY "public"."export_case"
    ADD CONSTRAINT "export_case_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."in_app_notification"
    ADD CONSTRAINT "in_app_notification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."informed_consent_signature"
    ADD CONSTRAINT "informed_consent_signature_case_id_key" UNIQUE ("case_id");



ALTER TABLE ONLY "public"."informed_consent_signature"
    ADD CONSTRAINT "informed_consent_signature_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nlp_analysis"
    ADD CONSTRAINT "nlp_analysis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post"
    ADD CONSTRAINT "post_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pseudonym"
    ADD CONSTRAINT "pseudonym_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."psychologist"
    ADD CONSTRAINT "psychologist_correo_institucional_key" UNIQUE ("correo_institucional");



ALTER TABLE ONLY "public"."psychologist"
    ADD CONSTRAINT "psychologist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registration_consent"
    ADD CONSTRAINT "registration_consent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rol"
    ADD CONSTRAINT "rol_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."rol"
    ADD CONSTRAINT "rol_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_codigo_estudiante_encrypted_key" UNIQUE ("codigo_estudiante_encrypted");



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_alert_campus_status" ON "public"."alert" USING "btree" ("campus", "status");



CREATE INDEX "idx_alert_case_id" ON "public"."alert" USING "btree" ("case_id");



CREATE INDEX "idx_case_status" ON "public"."clinical_case" USING "btree" ("status");



CREATE INDEX "idx_case_student_id" ON "public"."clinical_case" USING "btree" ("student_id");



CREATE INDEX "idx_chatroom_case_id" ON "public"."chat_room" USING "btree" ("case_id");



CREATE INDEX "idx_chatroom_status" ON "public"."chat_room" USING "btree" ("status");



CREATE INDEX "idx_comment_post_id" ON "public"."comment" USING "btree" ("post_id");



CREATE INDEX "idx_message_chatroom_id" ON "public"."chat_message" USING "btree" ("chat_room_id");



CREATE INDEX "idx_message_sender" ON "public"."chat_message" USING "btree" ("sender_id", "sender_role");



CREATE INDEX "idx_nlp_comment_id" ON "public"."nlp_analysis" USING "btree" ("comment_id");



CREATE INDEX "idx_nlp_post_id" ON "public"."nlp_analysis" USING "btree" ("post_id");



CREATE INDEX "idx_nlp_risk_level" ON "public"."nlp_analysis" USING "btree" ("risk_level");



CREATE INDEX "idx_notification_user_unread" ON "public"."in_app_notification" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_post_status" ON "public"."post" USING "btree" ("status");



CREATE INDEX "idx_post_student_id" ON "public"."post" USING "btree" ("student_id");



CREATE INDEX "idx_psychologist_campus_shift" ON "public"."psychologist" USING "btree" ("campus", "shift");



CREATE UNIQUE INDEX "udx_pseudonym_one_active_per_student" ON "public"."pseudonym" USING "btree" ("student_id") WHERE ("status" = 'ACTIVE'::"public"."pseudonym_status");



CREATE UNIQUE INDEX "udx_pseudonym_texto" ON "public"."pseudonym" (LOWER("texto"));



CREATE OR REPLACE TRIGGER "trg_case_updated_at" BEFORE UPDATE ON "public"."clinical_case" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_chat_message_broadcast" AFTER INSERT ON "public"."chat_message" FOR EACH ROW EXECUTE FUNCTION "public"."on_chat_message_broadcast"();



CREATE OR REPLACE TRIGGER "trg_chatroom_updated_at" BEFORE UPDATE ON "public"."chat_room" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_comment_updated_at" BEFORE UPDATE ON "public"."comment" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_complementary_data_updated_at" BEFORE UPDATE ON "public"."complementary_data" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_complementary_updated_at" BEFORE UPDATE ON "public"."complementary_data" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_post_updated_at" BEFORE UPDATE ON "public"."post" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_psychologist_updated_at" BEFORE UPDATE ON "public"."psychologist" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_student_updated_at" BEFORE UPDATE ON "public"."student" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



ALTER TABLE ONLY "public"."alert"
    ADD CONSTRAINT "alert_assigned_psychologist_id_fkey" FOREIGN KEY ("assigned_psychologist_id") REFERENCES "public"."psychologist"("id");



ALTER TABLE ONLY "public"."alert"
    ADD CONSTRAINT "alert_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_case"("id");



ALTER TABLE ONLY "public"."alert"
    ADD CONSTRAINT "alert_nlp_analysis_id_fkey" FOREIGN KEY ("nlp_analysis_id") REFERENCES "public"."nlp_analysis"("id");



ALTER TABLE ONLY "public"."alert"
    ADD CONSTRAINT "alert_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_room"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room"
    ADD CONSTRAINT "chat_room_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_case"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room"
    ADD CONSTRAINT "chat_room_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist"("id");



ALTER TABLE ONLY "public"."clinical_case"
    ADD CONSTRAINT "clinical_case_assigned_psychologist_id_fkey" FOREIGN KEY ("assigned_psychologist_id") REFERENCES "public"."psychologist"("id");



ALTER TABLE ONLY "public"."clinical_case"
    ADD CONSTRAINT "clinical_case_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_cited_comment_id_fkey" FOREIGN KEY ("cited_comment_id") REFERENCES "public"."comment"("id");



ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id");



ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."complementary_data"
    ADD CONSTRAINT "complementary_data_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."export_case"
    ADD CONSTRAINT "export_case_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_case"("id");



ALTER TABLE ONLY "public"."export_case"
    ADD CONSTRAINT "export_case_psychologist_id_fkey" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist"("id");



ALTER TABLE ONLY "public"."psychologist"
    ADD CONSTRAINT "fk_psychologist_auth_user" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "fk_student_active_pseudonym" FOREIGN KEY ("active_pseudonym_id") REFERENCES "public"."pseudonym"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "fk_student_auth_user" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."informed_consent_signature"
    ADD CONSTRAINT "informed_consent_signature_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_case"("id");



ALTER TABLE ONLY "public"."informed_consent_signature"
    ADD CONSTRAINT "informed_consent_signature_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."nlp_analysis"
    ADD CONSTRAINT "nlp_analysis_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id");



ALTER TABLE ONLY "public"."nlp_analysis"
    ADD CONSTRAINT "nlp_analysis_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id");



ALTER TABLE ONLY "public"."post"
    ADD CONSTRAINT "post_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."pseudonym"
    ADD CONSTRAINT "pseudonym_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."psychologist"
    ADD CONSTRAINT "psychologist_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."rol"("id");



ALTER TABLE ONLY "public"."registration_consent"
    ADD CONSTRAINT "registration_consent_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_active_pseudonym_id_fkey" FOREIGN KEY ("active_pseudonym_id") REFERENCES "public"."pseudonym"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."rol"("id");



ALTER TABLE "public"."alert" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alert_select_psychologist_campus" ON "public"."alert" FOR SELECT TO "authenticated" USING ((("campus" = ( SELECT "psychologist"."campus"
   FROM "public"."psychologist"
  WHERE ("psychologist"."id" = "auth"."uid"()))) AND (("status" = 'PENDING'::"public"."alert_status") OR ("status" = 'COMPLEMENTARY'::"public"."alert_status") OR ("assigned_psychologist_id" = "auth"."uid"()))));



CREATE POLICY "alert_update_psychologist_assigned" ON "public"."alert" FOR UPDATE TO "authenticated" USING (("assigned_psychologist_id" = "auth"."uid"())) WITH CHECK (("assigned_psychologist_id" = "auth"."uid"()));



ALTER TABLE "public"."chat_message" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_message_insert_participant" ON "public"."chat_message" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."chat_room" "cr"
     JOIN "public"."clinical_case" "cc" ON (("cc"."id" = "cr"."case_id")))
  WHERE (("cr"."id" = "chat_message"."chat_room_id") AND (("cr"."psychologist_id" = "auth"."uid"()) OR ("cc"."student_id" = "auth"."uid"()))))));



CREATE POLICY "chat_message_select_participant" ON "public"."chat_message" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."chat_room" "cr"
     JOIN "public"."clinical_case" "cc" ON (("cc"."id" = "cr"."case_id")))
  WHERE (("cr"."id" = "chat_message"."chat_room_id") AND (("cr"."psychologist_id" = "auth"."uid"()) OR ("cc"."student_id" = "auth"."uid"()))))));



ALTER TABLE "public"."chat_room" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_room_insert_psychologist" ON "public"."chat_room" FOR INSERT TO "authenticated" WITH CHECK (("psychologist_id" = "auth"."uid"()));



CREATE POLICY "chat_room_select_participant" ON "public"."chat_room" FOR SELECT TO "authenticated" USING ((("psychologist_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."clinical_case" "cc"
  WHERE (("cc"."id" = "chat_room"."case_id") AND ("cc"."student_id" = "auth"."uid"()))))));



ALTER TABLE "public"."clinical_case" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clinical_case_insert_self_referral" ON "public"."clinical_case" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "clinical_case_select_psychologist" ON "public"."clinical_case" FOR SELECT TO "authenticated" USING ((("assigned_psychologist_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."psychologist" "p"
     JOIN "public"."student" "s" ON (("s"."campus" = "p"."campus")))
  WHERE (("p"."id" = "auth"."uid"()) AND ("s"."id" = "clinical_case"."student_id"))))));



CREATE POLICY "clinical_case_select_student_own" ON "public"."clinical_case" FOR SELECT TO "authenticated" USING (("student_id" = "auth"."uid"()));



CREATE POLICY "clinical_case_update_psychologist" ON "public"."clinical_case" FOR UPDATE TO "authenticated" USING (("assigned_psychologist_id" = "auth"."uid"())) WITH CHECK (("assigned_psychologist_id" = "auth"."uid"()));



ALTER TABLE "public"."comment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comment_insert_own" ON "public"."comment" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "comment_select_all_authenticated" ON "public"."comment" FOR SELECT TO "authenticated" USING (("status" = 'VISIBLE'::"public"."content_status"));



CREATE POLICY "comment_update_own" ON "public"."comment" FOR UPDATE TO "authenticated" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));



ALTER TABLE "public"."complementary_data" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "complementary_data_insert_psychologist" ON "public"."complementary_data" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."clinical_case" "cc"
     JOIN "public"."alert" "a" ON (("a"."case_id" = "cc"."id")))
  WHERE (("cc"."student_id" = "complementary_data"."student_id") AND ("a"."assigned_psychologist_id" = "auth"."uid"())))));



CREATE POLICY "complementary_data_select_psychologist" ON "public"."complementary_data" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."clinical_case" "cc"
     JOIN "public"."alert" "a" ON (("a"."case_id" = "cc"."id")))
  WHERE (("cc"."student_id" = "complementary_data"."student_id") AND ("a"."assigned_psychologist_id" = "auth"."uid"())))));



CREATE POLICY "complementary_data_update_psychologist" ON "public"."complementary_data" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."clinical_case" "cc"
     JOIN "public"."alert" "a" ON (("a"."case_id" = "cc"."id")))
  WHERE (("cc"."student_id" = "complementary_data"."student_id") AND ("a"."assigned_psychologist_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."clinical_case" "cc"
     JOIN "public"."alert" "a" ON (("a"."case_id" = "cc"."id")))
  WHERE (("cc"."student_id" = "complementary_data"."student_id") AND ("a"."assigned_psychologist_id" = "auth"."uid"())))));



ALTER TABLE "public"."export_case" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "export_case_select_psychologist" ON "public"."export_case" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clinical_case" "cc"
  WHERE (("cc"."id" = "export_case"."case_id") AND ("cc"."assigned_psychologist_id" = "auth"."uid"())))));



ALTER TABLE "public"."in_app_notification" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "in_app_notification_select_own" ON "public"."in_app_notification" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "in_app_notification_update_read" ON "public"."in_app_notification" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."informed_consent_signature" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "informed_consent_signature_select_participant" ON "public"."informed_consent_signature" FOR SELECT TO "authenticated" USING ((("student_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."clinical_case" "cc"
  WHERE (("cc"."id" = "informed_consent_signature"."case_id") AND ("cc"."assigned_psychologist_id" = "auth"."uid"()))))));



ALTER TABLE "public"."nlp_analysis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nlp_analysis_select_via_alert" ON "public"."nlp_analysis" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."alert" "a"
     JOIN "public"."clinical_case" "cc" ON (("cc"."id" = "a"."case_id")))
  WHERE (("a"."nlp_analysis_id" = "nlp_analysis"."id") AND (("a"."assigned_psychologist_id" = "auth"."uid"()) OR (("a"."status" = 'PENDING'::"public"."alert_status") AND ("a"."campus" = ( SELECT "psychologist"."campus"
           FROM "public"."psychologist"
          WHERE ("psychologist"."id" = "auth"."uid"())))))))));



ALTER TABLE "public"."post" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_insert_own" ON "public"."post" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "post_select_all_authenticated" ON "public"."post" FOR SELECT TO "authenticated" USING (("status" = 'VISIBLE'::"public"."content_status"));



CREATE POLICY "post_update_own" ON "public"."post" FOR UPDATE TO "authenticated" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));



ALTER TABLE "public"."pseudonym" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pseudonym_insert_own" ON "public"."pseudonym" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "pseudonym_select_own" ON "public"."pseudonym" FOR SELECT TO "authenticated" USING (("student_id" = "auth"."uid"()));



CREATE POLICY "pseudonym_update_own" ON "public"."pseudonym" FOR UPDATE TO "authenticated" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));



ALTER TABLE "public"."psychologist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "psychologist_select_own" ON "public"."psychologist" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "psychologist_update_own" ON "public"."psychologist" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."registration_consent" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "registration_consent_select_own" ON "public"."registration_consent" FOR SELECT TO "authenticated" USING (("student_id" = "auth"."uid"()));



ALTER TABLE "public"."rol" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rol_select_all_authenticated" ON "public"."rol" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."student" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_insert_self" ON "public"."student" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "student_select_own" ON "public"."student" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "student_update_own" ON "public"."student" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."fn_update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_chat_message_broadcast"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_chat_message_broadcast"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_chat_message_broadcast"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."alert" TO "anon";
GRANT ALL ON TABLE "public"."alert" TO "authenticated";
GRANT ALL ON TABLE "public"."alert" TO "service_role";



GRANT ALL ON TABLE "public"."chat_message" TO "anon";
GRANT ALL ON TABLE "public"."chat_message" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_message" TO "service_role";



GRANT ALL ON TABLE "public"."chat_room" TO "anon";
GRANT ALL ON TABLE "public"."chat_room" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_room" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_case" TO "anon";
GRANT ALL ON TABLE "public"."clinical_case" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_case" TO "service_role";



GRANT ALL ON TABLE "public"."comment" TO "anon";
GRANT ALL ON TABLE "public"."comment" TO "authenticated";
GRANT ALL ON TABLE "public"."comment" TO "service_role";



GRANT ALL ON TABLE "public"."complementary_data" TO "anon";
GRANT ALL ON TABLE "public"."complementary_data" TO "authenticated";
GRANT ALL ON TABLE "public"."complementary_data" TO "service_role";



GRANT ALL ON TABLE "public"."export_case" TO "anon";
GRANT ALL ON TABLE "public"."export_case" TO "authenticated";
GRANT ALL ON TABLE "public"."export_case" TO "service_role";



GRANT ALL ON TABLE "public"."in_app_notification" TO "anon";
GRANT ALL ON TABLE "public"."in_app_notification" TO "authenticated";
GRANT ALL ON TABLE "public"."in_app_notification" TO "service_role";



GRANT ALL ON TABLE "public"."informed_consent_signature" TO "anon";
GRANT ALL ON TABLE "public"."informed_consent_signature" TO "authenticated";
GRANT ALL ON TABLE "public"."informed_consent_signature" TO "service_role";



GRANT ALL ON TABLE "public"."nlp_analysis" TO "anon";
GRANT ALL ON TABLE "public"."nlp_analysis" TO "authenticated";
GRANT ALL ON TABLE "public"."nlp_analysis" TO "service_role";



GRANT ALL ON TABLE "public"."post" TO "anon";
GRANT ALL ON TABLE "public"."post" TO "authenticated";
GRANT ALL ON TABLE "public"."post" TO "service_role";



GRANT ALL ON TABLE "public"."pseudonym" TO "anon";
GRANT ALL ON TABLE "public"."pseudonym" TO "authenticated";
GRANT ALL ON TABLE "public"."pseudonym" TO "service_role";



GRANT ALL ON TABLE "public"."psychologist" TO "anon";
GRANT ALL ON TABLE "public"."psychologist" TO "authenticated";
GRANT ALL ON TABLE "public"."psychologist" TO "service_role";



GRANT ALL ON TABLE "public"."registration_consent" TO "anon";
GRANT ALL ON TABLE "public"."registration_consent" TO "authenticated";
GRANT ALL ON TABLE "public"."registration_consent" TO "service_role";



GRANT ALL ON TABLE "public"."rol" TO "anon";
GRANT ALL ON TABLE "public"."rol" TO "authenticated";
GRANT ALL ON TABLE "public"."rol" TO "service_role";



GRANT ALL ON TABLE "public"."student" TO "anon";
GRANT ALL ON TABLE "public"."student" TO "authenticated";
GRANT ALL ON TABLE "public"."student" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































