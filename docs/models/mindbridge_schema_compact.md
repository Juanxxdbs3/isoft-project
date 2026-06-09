# MindBridge — Esquema compactado

## Resumen general
- 16 tablas en `public`.
- Tipos relevantes: `account_status`, `case_status`, `case_type`, `alert_status`, `chat_status`, `content_status`, `content_type`, `export_format`, `message_sender_role`, `message_type`, `pseudonym_status`, `risk_level`, `shift_type`, `udec_campus`, `user_role_type`, `adviser_export_status`.
- RLS habilitado en todas las tablas.
- Extensiones usadas: `pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`.

## student
- Perfil del estudiante autenticado.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `codigo_estudiante_encrypted`: text NOT NULL; `campus`: udec_campus NOT NULL; `status`: account_status DEFAULT 'ACTIVE'::account_status NOT NULL; `active_pseudonym_id`: uuid; `caso_formal_activo`: boolean DEFAULT false NOT NULL; `rol_id`: uuid NOT NULL; `created_at`: timestamp with time zone DEFAULT now() NOT NULL; `updated_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** student_pkey: PRIMARY KEY ("id").
- **Únicas:** student_codigo_estudiante_encrypted_key: UNIQUE ("codigo_estudiante_encrypted").
- **FK:** fk_student_active_pseudonym: FOREIGN KEY ("active_pseudonym_id") REFERENCES "public"."pseudonym"("id") DEFERRABLE INITIALLY DEFERRED | fk_student_auth_user: FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE | student_active_pseudonym_id_fkey: FOREIGN KEY ("active_pseudonym_id") REFERENCES "public"."pseudonym"("id") ON DELETE SET NULL | student_rol_id_fkey: FOREIGN KEY ("rol_id") REFERENCES "public"."rol"("id").
- **RLS:** sí. Políticas: student_insert_self, student_select_own, student_update_own.
- **Triggers:** trg_student_updated_at: BEFORE UPDATE -> fn_update_updated_at().

## psychologist
- Perfil de psicólogo del sistema.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `nombre`: text NOT NULL; `correo_institucional`: text NOT NULL; `campus`: udec_campus NOT NULL; `shift`: shift_type NOT NULL; `status`: account_status DEFAULT 'ACTIVE'::account_status NOT NULL; `participacion_foro_habilitada`: boolean DEFAULT false NOT NULL; `email_alerts_subscribed`: boolean DEFAULT true NOT NULL; `pseudonimo_institucional`: text DEFAULT 'Equipo de Bienestar Universitario'::text NOT NULL; `rol_id`: uuid NOT NULL; `created_at`: timestamp with time zone DEFAULT now() NOT NULL; `updated_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** psychologist_pkey: PRIMARY KEY ("id").
- **Únicas:** psychologist_correo_institucional_key: UNIQUE ("correo_institucional").
- **FK:** fk_psychologist_auth_user: FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE | psychologist_rol_id_fkey: FOREIGN KEY ("rol_id") REFERENCES "public"."rol"("id").
- **RLS:** sí. Políticas: psychologist_select_own, psychologist_update_own.
- **Triggers:** trg_psychologist_updated_at: BEFORE UPDATE -> fn_update_updated_at().

## rol
- Catálogo de roles.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `nombre`: character varying(50) NOT NULL; `descripcion`: text.
- **PK:** rol_pkey: PRIMARY KEY ("id").
- **Únicas:** rol_nombre_key: UNIQUE ("nombre").
- **RLS:** sí. Políticas: rol_select_all_authenticated.
- **Triggers:** ninguno.

## pseudonym
- Alias/seudónimo activo o histórico del estudiante.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `student_id`: uuid NOT NULL; `texto`: character varying(30) NOT NULL; `avatar_url`: text; `status`: pseudonym_status DEFAULT 'ACTIVE'::pseudonym_status NOT NULL; `assigned_at`: timestamp with time zone DEFAULT now() NOT NULL; `deactivated_at`: timestamp with time zone.
- **PK:** pseudonym_pkey: PRIMARY KEY ("id").
- **FK:** pseudonym_student_id_fkey: FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE.
- **RLS:** sí. Políticas: pseudonym_insert_own, pseudonym_select_own, pseudonym_update_own.
- **Triggers:** ninguno.

## registration_consent
- Aceptación del consentimiento de registro.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `student_id`: uuid NOT NULL; `pseudonym_at_acceptance`: character varying(30) NOT NULL; `document_version`: character varying(20) NOT NULL; `mechanism`: character varying(50) DEFAULT 'INTERNAL_CHECKBOX'::character varying NOT NULL; `accepted_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** registration_consent_pkey: PRIMARY KEY ("id").
- **FK:** registration_consent_student_id_fkey: FOREIGN KEY ("student_id") REFERENCES "public"."student"("id").
- **RLS:** sí. Políticas: registration_consent_select_own.
- **Triggers:** ninguno.

## informed_consent_signature
- Firma/aceptación del consentimiento informado.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `case_id`: uuid NOT NULL; `student_id`: uuid NOT NULL; `document_version`: text NOT NULL; `form_code`: text DEFAULT 'FO-BU-O13'::text NOT NULL; `signed_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** informed_consent_signature_pkey: PRIMARY KEY ("id").
- **Únicas:** informed_consent_signature_case_id_key: UNIQUE ("case_id").
- **FK:** informed_consent_signature_case_id_fkey: FOREIGN KEY ("case_id") REFERENCES "public"."clinical_case"("id") | informed_consent_signature_student_id_fkey: FOREIGN KEY ("student_id") REFERENCES "public"."student"("id").
- **RLS:** sí. Políticas: informed_consent_signature_select_participant.
- **Triggers:** ninguno.

## clinical_case
- Caso clínico principal del estudiante.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `student_id`: uuid NOT NULL; `case_type`: case_type DEFAULT 'AUTOMATIC_ALERT'::case_type NOT NULL; `status`: case_status DEFAULT 'OPENED'::case_status NOT NULL; `assigned_psychologist_id`: uuid; `is_unsubscribed_from_recapture`: boolean DEFAULT false NOT NULL; `adviser_export_status`: adviser_export_status DEFAULT 'NOT_EXPORTED'::adviser_export_status NOT NULL; `opened_at`: timestamp with time zone DEFAULT now() NOT NULL; `updated_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** clinical_case_pkey: PRIMARY KEY ("id").
- **FK:** clinical_case_assigned_psychologist_id_fkey: FOREIGN KEY ("assigned_psychologist_id") REFERENCES "public"."psychologist"("id") | clinical_case_student_id_fkey: FOREIGN KEY ("student_id") REFERENCES "public"."student"("id").
- **RLS:** sí. Políticas: clinical_case_insert_self_referral, clinical_case_select_psychologist, clinical_case_select_student_own, clinical_case_update_psychologist.
- **Triggers:** trg_case_updated_at: BEFORE UPDATE -> fn_update_updated_at().

## alert
- Alerta generada por NLP para un caso/estudiante.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `case_id`: uuid NOT NULL; `nlp_analysis_id`: uuid NOT NULL; `student_id`: uuid NOT NULL; `campus`: udec_campus NOT NULL; `risk_level`: risk_level NOT NULL; `status`: alert_status DEFAULT 'PENDING'::alert_status NOT NULL; `assigned_psychologist_id`: uuid; `is_complementary`: boolean DEFAULT false NOT NULL; `ai_generated_summary`: text; `historical_snapshot`: jsonb; `generated_at`: timestamp with time zone DEFAULT now() NOT NULL; `accepted_at`: timestamp with time zone; `closed_at`: timestamp with time zone.
- **PK:** alert_pkey: PRIMARY KEY ("id").
- **Únicas:** alert_nlp_analysis_id_key: UNIQUE ("nlp_analysis_id").
- **FK:** alert_assigned_psychologist_id_fkey: FOREIGN KEY ("assigned_psychologist_id") REFERENCES "public"."psychologist"("id") | alert_case_id_fkey: FOREIGN KEY ("case_id") REFERENCES "public"."clinical_case"("id") | alert_nlp_analysis_id_fkey: FOREIGN KEY ("nlp_analysis_id") REFERENCES "public"."nlp_analysis"("id") | alert_student_id_fkey: FOREIGN KEY ("student_id") REFERENCES "public"."student"("id").
- **Checks:** CONSTRAINT "chk_alert_psychologist_by_status" CHECK ((("status" = ANY (ARRAY['PENDING'::"public"."alert_status", 'COMPLEMENTARY'::"public"."alert_status"])) OR ("assigned_psychologist_id" IS NOT NULL))).
- **RLS:** sí. Políticas: alert_select_psychologist_campus, alert_update_psychologist_assigned.
- **Triggers:** ninguno.

## nlp_analysis
- Resultado del análisis NLP de post o comentario.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `post_id`: uuid; `comment_id`: uuid; `content_type`: content_type NOT NULL; `analyzed_text_snapshot`: text NOT NULL; `depressive_probability`: numeric(5,2); `anxiety_probability`: numeric(5,2); `suicidal_probability`: numeric(5,2); `base_malaise_index`: numeric(5,2); `suicidal_override`: boolean DEFAULT false NOT NULL; `community_rules_infraction`: boolean DEFAULT false NOT NULL; `top_clinical_label`: character varying(50); `risk_level`: risk_level NOT NULL; `analyzed_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** nlp_analysis_pkey: PRIMARY KEY ("id").
- **FK:** nlp_analysis_comment_id_fkey: FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") | nlp_analysis_post_id_fkey: FOREIGN KEY ("post_id") REFERENCES "public"."post"("id").
- **Checks:** CONSTRAINT "chk_nlp_single_content" CHECK (((("post_id" IS NOT NULL) AND ("comment_id" IS NULL)) OR (("post_id" IS NULL) AND ("comment_id" IS NOT NULL)))) | CONSTRAINT "nlp_analysis_anxiety_probability_check" CHECK ((("anxiety_probability" >= (0)::numeric) AND ("anxiety_probability" <= (100)::numeric))) | CONSTRAINT "nlp_analysis_base_malaise_index_check" CHECK ((("base_malaise_index" >= (0)::numeric) AND ("base_malaise_index" <= (100)::numeric))) | CONSTRAINT "nlp_analysis_depressive_probability_check" CHECK ((("depressive_probability" >= (0)::numeric) AND ("depressive_probability" <= (100)::numeric))) | CONSTRAINT "nlp_analysis_suicidal_probability_check" CHECK ((("suicidal_probability" >= (0)::numeric) AND ("suicidal_probability" <= (100)::numeric))).
- **RLS:** sí. Políticas: nlp_analysis_select_via_alert.
- **Triggers:** ninguno.

## post
- Publicación del estudiante.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `student_id`: uuid NOT NULL; `text_content`: text NOT NULL; `status`: content_status DEFAULT 'VISIBLE'::content_status NOT NULL; `created_at`: timestamp with time zone DEFAULT now() NOT NULL; `updated_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** post_pkey: PRIMARY KEY ("id").
- **FK:** post_student_id_fkey: FOREIGN KEY ("student_id") REFERENCES "public"."student"("id").
- **Checks:** CONSTRAINT "post_text_content_check" CHECK (("char_length"("text_content") > 0)).
- **RLS:** sí. Políticas: post_insert_own, post_select_all_authenticated, post_update_own.
- **Triggers:** trg_post_updated_at: BEFORE UPDATE -> fn_update_updated_at().

## comment
- Comentario de un post, con posibilidad de cita.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `post_id`: uuid NOT NULL; `student_id`: uuid NOT NULL; `cited_comment_id`: uuid; `text_content`: text NOT NULL; `status`: content_status DEFAULT 'VISIBLE'::content_status NOT NULL; `created_at`: timestamp with time zone DEFAULT now() NOT NULL; `updated_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** comment_pkey: PRIMARY KEY ("id").
- **FK:** comment_cited_comment_id_fkey: FOREIGN KEY ("cited_comment_id") REFERENCES "public"."comment"("id") | comment_post_id_fkey: FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") | comment_student_id_fkey: FOREIGN KEY ("student_id") REFERENCES "public"."student"("id").
- **Checks:** CONSTRAINT "comment_text_content_check" CHECK (("char_length"("text_content") > 0)).
- **RLS:** sí. Políticas: comment_insert_own, comment_select_all_authenticated, comment_update_own.
- **Triggers:** trg_comment_updated_at: BEFORE UPDATE -> fn_update_updated_at().

## chat_room
- Sala de chat por caso y psicólogo.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `case_id`: uuid NOT NULL; `psychologist_id`: uuid NOT NULL; `status`: chat_status DEFAULT 'ACTIVE'::chat_status NOT NULL; `opened_at`: timestamp with time zone DEFAULT now() NOT NULL; `last_activity_at`: timestamp with time zone DEFAULT now() NOT NULL; `closed_at`: timestamp with time zone.
- **PK:** chat_room_pkey: PRIMARY KEY ("id").
- **FK:** chat_room_case_id_fkey: FOREIGN KEY ("case_id") REFERENCES "public"."clinical_case"("id") ON DELETE CASCADE | chat_room_psychologist_id_fkey: FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist"("id").
- **RLS:** sí. Políticas: chat_room_insert_psychologist, chat_room_select_participant.
- **Triggers:** trg_chatroom_updated_at: BEFORE UPDATE -> fn_update_updated_at().

## chat_message
- Mensajes dentro del chat del caso.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `chat_room_id`: uuid NOT NULL; `sender_id`: uuid NOT NULL; `sender_role`: message_sender_role NOT NULL; `text_content`: text NOT NULL; `message_type`: message_type DEFAULT 'STANDARD_TEXT'::message_type NOT NULL; `read`: boolean DEFAULT false NOT NULL; `sent_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** chat_message_pkey: PRIMARY KEY ("id").
- **FK:** chat_message_chat_room_id_fkey: FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_room"("id") ON DELETE CASCADE.
- **Checks:** CONSTRAINT "chat_message_text_content_check" CHECK (("char_length"("text_content") > 0)).
- **RLS:** sí. Políticas: chat_message_insert_participant, chat_message_select_participant.
- **Triggers:** trg_chat_message_broadcast: AFTER INSERT -> on_chat_message_broadcast().

## complementary_data
- Ficha complementaria del estudiante.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `student_id`: uuid NOT NULL; `nombre_completo`: text; `programa`: text; `semestre`: smallint; `correo_contacto`: text; `updated_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** complementary_data_pkey: PRIMARY KEY ("id").
- **Únicas:** complementary_data_student_id_key: UNIQUE ("student_id").
- **FK:** complementary_data_student_id_fkey: FOREIGN KEY ("student_id") REFERENCES "public"."student"("id").
- **Checks:** CONSTRAINT "complementary_data_semestre_check" CHECK ((("semestre" >= 1) AND ("semestre" <= 12))).
- **RLS:** sí. Políticas: complementary_data_insert_psychologist, complementary_data_select_psychologist, complementary_data_update_psychologist.
- **Triggers:** trg_complementary_data_updated_at: BEFORE UPDATE -> set_updated_at() | trg_complementary_updated_at: BEFORE UPDATE -> fn_update_updated_at().

## export_case
- Registro de exportación de casos al asesor.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `case_id`: uuid NOT NULL; `psychologist_id`: uuid NOT NULL; `format`: export_format DEFAULT 'PDF'::export_format NOT NULL; `send_status`: adviser_export_status DEFAULT 'NOT_EXPORTED'::adviser_export_status NOT NULL; `recipient_email`: text; `included_optional_fields`: jsonb; `exported_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** export_case_pkey: PRIMARY KEY ("id").
- **Únicas:** export_case_case_id_key: UNIQUE ("case_id").
- **FK:** export_case_case_id_fkey: FOREIGN KEY ("case_id") REFERENCES "public"."clinical_case"("id") | export_case_psychologist_id_fkey: FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist"("id").
- **RLS:** sí. Políticas: export_case_select_psychologist.
- **Triggers:** ninguno.

## in_app_notification
- Notificaciones internas por usuario.
- **Campos:** `id`: uuid DEFAULT uuid_generate_v4() NOT NULL; `user_id`: uuid NOT NULL; `user_role`: user_role_type NOT NULL; `message`: text NOT NULL; `risk_level`: risk_level; `read`: boolean DEFAULT false NOT NULL; `created_at`: timestamp with time zone DEFAULT now() NOT NULL.
- **PK:** in_app_notification_pkey: PRIMARY KEY ("id").
- **RLS:** sí. Políticas: in_app_notification_select_own, in_app_notification_update_read.
- **Triggers:** ninguno.

## Relaciones principales
- student ↔ rol (student.rol_id → rol.id)
- psychologist ↔ rol (psychologist.rol_id → rol.id)
- student ↔ pseudonym (student.active_pseudonym_id → pseudonym.id; además pseudonym.student_id → student.id)
- clinical_case ↔ student / psychologist
- alert ↔ clinical_case / nlp_analysis / student / psychologist
- nlp_analysis ↔ post o comment (exactamente uno de los dos)
- post ↔ student; comment ↔ post / student / comment(cita)
- chat_room ↔ clinical_case / psychologist; chat_message ↔ chat_room
- complementary_data ↔ student
- export_case ↔ clinical_case / psychologist
- in_app_notification ↔ usuario genérico por role
- informed_consent_signature ↔ clinical_case / student
- registration_consent ↔ student

## Notas importantes
- `student.active_pseudonym_id` aparece con dos FKs en el dump: una `DEFERRABLE INITIALLY DEFERRED` y otra `ON DELETE SET NULL`.
- `alert.nlp_analysis_id`, `export_case.case_id`, `complementary_data.student_id` e `informed_consent_signature.case_id` tienen unicidad; evitan duplicados por entidad.
- `pseudonym` tiene índice único por `LOWER(texto)` y otro índice parcial para un único activo por estudiante.
- `chat_message`, `post` y `comment` validan que el texto no sea vacío.
- `nlp_analysis` obliga a que exista exactamente uno entre `post_id` y `comment_id`.