-- ============================================================
-- MindBridge — Esquema PostgreSQL (compatible Supabase)
-- Versión: 1.1
-- Fecha: junio 2026
--
-- CAMBIOS v1.1 respecto a v1.0:
--   - risk_level: BAJO/MEDIO/ALTO → LOW/MEDIUM/HIGH
--   - alert_status: español → PENDING/ACCEPTED/SERVED/FALSE_POSITIVE/COMPLEMENTARY
--   - psychologist_turn renombrado a shift_type: TURNO_1/TURNO_2 → SHIFT_1/SHIFT_2
--   - psychologist.turno renombrado a psychologist.shift
--   - udec_campus: lista completa de sedes UdeC en UPPER_SNAKE_CASE
--   - user_role_type: nuevo enum para in_app_notification (evita confusión semántica
--     con message_sender_role, que describe remitente de chat, no destinatario)
--   - nlp_analysis: columna analyzed_text_snapshot TEXT NOT NULL agregada
--   - alert: CHECK constraint que enforza psicólogo obligatorio en estado ACCEPTED
--   - in_app_notification.user_role: usa user_role_type en lugar de message_sender_role
--   - Índice idx_psychologist_campus_turn renombrado a idx_psychologist_campus_shift
--
-- CONVENCIÓN DE IDIOMA:
--   Todos los valores de enum en inglés UPPER_SNAKE_CASE.
--   Los valores visibles al usuario se traducen al español en la capa de presentación
--   mediante el diccionario lib/i18n/ del frontend.
--
-- NOTA: "case" es palabra reservada en PostgreSQL.
--   La entidad Case del diseño se mapea como "clinical_case".
-- DENORMALIZACIONES INTENCIONALES:
-- alert.student_id y alert.campus: snapshots para evitar JOINs en consultas de panel.
-- alert.historical_snapshot (JSONB): captura el contexto del historial en el momento
--   de la alerta; garantiza que el psicólogo vea el estado original aunque el estudiante
--   elimine publicaciones después.
--
-- ORDEN DE EJECUCIÓN:
--   1. Extensiones
--   2. Tipos enumerados
--   3. Tablas (en orden que respeta dependencias FK)
--   4. FKs diferidas (resuelven circularidad student ↔ pseudonym)
--   5. Índices
--   6. Función y triggers de updated_at
--   7. Comentarios sobre políticas RLS
--
-- RELACIÓN CIRCULAR STUDENT ↔ PSEUDONYM (CRÍTICA PARA POSTGREST):
--   student.active_pseudonym_id → pseudonym.id (FK: student_active_pseudonym_id_fkey, ON DELETE SET NULL)
--   pseudonym.student_id → student.id (FK: pseudonym_student_id_fkey, ON DELETE CASCADE)
--
--   El endpoint /auth/me usa PostgREST embedded join:
--     pseudonym!student_active_pseudonym_id_fkey(texto, avatar_url)
--
--   PostgREST requiere que el nombre de la FK sea EXACTAMENTE "student_active_pseudonym_id_fkey".
--   Si la FK tiene un nombre auto-generado diferente, PostgREST retorna PGRST200
--   ("Could not find a relationship between 'student' and 'pseudonym'").
--
--   La FK debe recrearse con este nombre exacto si la migración genera un nombre diferente.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 2. TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE account_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DELETED'
);

CREATE TYPE pseudonym_status AS ENUM (
    'ACTIVE',
    'HISTORICAL'
);

-- Estado de publicaciones y comentarios en el foro
CREATE TYPE content_status AS ENUM (
    'VISIBLE',
    'MODERATED',    -- oculto por moderación retroactiva (automática o manual)
    'DELETED'       -- eliminado por el propio autor
);

CREATE TYPE content_type AS ENUM (
    'POST',
    'COMMENT'
);

-- Nivel de riesgo psicológico detectado por el motor NLP
-- Valores en inglés; la UI traduce: LOW→Bajo, MEDIUM→Medio, HIGH→Alto
CREATE TYPE risk_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

-- Estado de una alerta en el panel del psicólogo
-- Valores en inglés; la UI traduce según diccionario i18n
CREATE TYPE alert_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'SERVED',
    'FALSE_POSITIVE',
    'COMPLEMENTARY'
);

CREATE TYPE case_status AS ENUM (
    'OPENED',
    'ASSIGNED',
    'ARCHIVED',
    'RESOLVED'
);

CREATE TYPE case_type AS ENUM (
    'AUTOMATIC_ALERT',
    'SELF_REFERRAL'
);

CREATE TYPE adviser_export_status AS ENUM (
    'NOT_EXPORTED',
    'EXPORTED_SUCCESS',
    'FAILED'
);

CREATE TYPE chat_status AS ENUM (
    'ACTIVE',
    'CLOSED_BY_INACTIVITY',
    'ARCHIVED'
);

CREATE TYPE message_type AS ENUM (
    'STANDARD_TEXT',
    'APPOINTMENT_PROPOSAL',
    'CHARACTERIZATION_LINK'
);

CREATE TYPE export_format AS ENUM (
    'PDF',
    'XML_PLACEHOLDER'
);

-- Turno operativo del psicólogo
-- SHIFT_1: 07:00–15:00 | SHIFT_2: 15:00–22:00 (hora America/Bogota, UTC-5)
-- La lógica de turno activo se calcula en NotificationService del backend.
-- Alertas LOW/MEDIUM se envían solo a psicólogos en turno activo.
-- Alertas HIGH se envían a todos los psicólogos de la sede sin importar turno.
CREATE TYPE shift_type AS ENUM (
    'SHIFT_1',
    'SHIFT_2'
);

-- Rol del remitente en un mensaje de chat
CREATE TYPE message_sender_role AS ENUM (
    'STUDENT',
    'PSYCHOLOGIST'
);

-- Rol del destinatario de una notificación in-app
-- Enum separado de message_sender_role por razón semántica:
-- message_sender_role describe quién envía un mensaje;
-- user_role_type describe quién recibe una notificación.
-- Los valores coinciden hoy, pero su propósito es distinto.
CREATE TYPE user_role_type AS ENUM (
    'STUDENT',
    'PSYCHOLOGIST'
);

-- Sedes de la Universidad de Cartagena
-- Lista completa según estructura institucional vigente.
CREATE TYPE udec_campus AS ENUM (
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


-- ============================================================
-- 3. TABLAS
-- ============================================================

-- ------------------------------------------------------------
-- rol
-- Catálogo de roles del sistema. Inmutable en operación normal.
-- ------------------------------------------------------------
CREATE TABLE rol (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

INSERT INTO rol (nombre, descripcion) VALUES
    ('ESTUDIANTE', 'Acceso al foro y al chat de respuesta. Identificación por pseudónimo.'),
    ('PSICOLOGO',  'Acceso al panel de alertas, gestión de casos y chat clínico.'),
    ('ADMIN',      'Administración institucional: gestión de cuentas de psicólogos y configuración operativa.'),
    ('SUPERADMIN', 'Administración técnica: logs, variables del sistema y calibración de parámetros NLP.');


-- ------------------------------------------------------------
-- student
-- Credenciales y perfil del estudiante.
-- active_pseudonym_id: FK diferida para resolver circularidad con pseudonym.
-- El aislamiento identidad/pseudónimo se delega a ISecurityAndAccess.deanonymize;
-- no existe tabla IdentityResolutionRing: esta relación cumple esa función.
-- ------------------------------------------------------------
CREATE TABLE student (
    id                          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_estudiante_encrypted TEXT           NOT NULL UNIQUE,
    password_hash               TEXT           NOT NULL,
    campus                      udec_campus    NOT NULL,
    status                      account_status NOT NULL DEFAULT 'ACTIVE',
    active_pseudonym_id         UUID,                         -- FK diferida; se agrega más abajo
    caso_formal_activo          BOOLEAN        NOT NULL DEFAULT FALSE,
    rol_id                      UUID           NOT NULL REFERENCES rol(id),
    created_at                  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- pseudonym
-- Historial de pseudónimos de un estudiante.
-- Solo un pseudónimo ACTIVE por estudiante (índice parcial).
-- El texto del pseudónimo es único en todo el sistema.
-- ------------------------------------------------------------
CREATE TABLE pseudonym (
    id              UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID             NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    texto           VARCHAR(30)      NOT NULL,
    avatar_url      TEXT,
    status          pseudonym_status NOT NULL DEFAULT 'ACTIVE',
    assigned_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    deactivated_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX udx_pseudonym_one_active_per_student
    ON pseudonym (student_id)
    WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX udx_pseudonym_texto
    ON pseudonym (texto);


-- ------------------------------------------------------------
-- FK diferida: student.active_pseudonym_id → pseudonym
-- DEFERRABLE INITIALLY DEFERRED permite crear student y pseudonym
-- en la misma transacción sin violar la restricción.
-- ------------------------------------------------------------
ALTER TABLE student
    ADD CONSTRAINT fk_student_active_pseudonym
    FOREIGN KEY (active_pseudonym_id)
    REFERENCES pseudonym(id)
    DEFERRABLE INITIALLY DEFERRED;


-- ------------------------------------------------------------
-- registration_consent
-- Constancia inmutable de aceptación de términos al registrarse (RF02).
-- Sin UNIQUE en student_id: si el aviso se actualiza, el estudiante
-- acepta la nueva versión generando una fila adicional (comportamiento intencional).
-- INMUTABLE: no se permite UPDATE ni DELETE (políticas RLS al final).
-- ------------------------------------------------------------
CREATE TABLE registration_consent (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id              UUID        NOT NULL REFERENCES student(id),
    pseudonym_at_acceptance VARCHAR(30) NOT NULL,
    document_version        VARCHAR(20) NOT NULL,
    mechanism               VARCHAR(50) NOT NULL DEFAULT 'INTERNAL_CHECKBOX',
    accepted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- complementary_data
-- Datos opcionales del estudiante recopilados solo al exportar el caso.
-- ------------------------------------------------------------
CREATE TABLE complementary_data (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID        NOT NULL UNIQUE REFERENCES student(id),
    nombre_completo TEXT,
    programa        TEXT,
    semestre        SMALLINT    CHECK (semestre BETWEEN 1 AND 12),
    correo_contacto TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- psychologist
-- Perfil operativo del profesional de psicología.
-- shift: turno asignado; la lógica de turno activo se calcula en NotificationService
--   a partir de la hora del servidor en America/Bogota (UTC-5).
-- ------------------------------------------------------------
CREATE TABLE psychologist (
    id                            UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre                        TEXT           NOT NULL,
    correo_institucional          TEXT           NOT NULL UNIQUE,
    password_hash                 TEXT           NOT NULL,
    campus                        udec_campus    NOT NULL,
    shift                         shift_type     NOT NULL,
    status                        account_status NOT NULL DEFAULT 'ACTIVE',
    participacion_foro_habilitada BOOLEAN        NOT NULL DEFAULT FALSE,
    email_alerts_subscribed       BOOLEAN        NOT NULL DEFAULT TRUE,
    pseudonimo_institucional      TEXT           NOT NULL DEFAULT 'Equipo de Bienestar Universitario',
    rol_id                        UUID           NOT NULL REFERENCES rol(id),
    created_at                    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at                    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- post
-- Publicación de texto plano en el foro (RF07).
-- Estado inicial VISIBLE; la moderación es retroactiva (D-09).
-- ------------------------------------------------------------
CREATE TABLE post (
    id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id   UUID           NOT NULL REFERENCES student(id),
    text_content TEXT           NOT NULL CHECK (char_length(text_content) > 0),
    status       content_status NOT NULL DEFAULT 'VISIBLE',
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- comment
-- Comentario en una publicación. Profundidad máxima: 1 nivel (RF08).
-- La restricción de profundidad se enforza en TriageService (capa de aplicación).
-- ------------------------------------------------------------
CREATE TABLE comment (
    id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id          UUID           NOT NULL REFERENCES post(id),
    student_id       UUID           NOT NULL REFERENCES student(id),
    cited_comment_id UUID           REFERENCES comment(id),
    text_content     TEXT           NOT NULL CHECK (char_length(text_content) > 0),
    status           content_status NOT NULL DEFAULT 'VISIBLE',
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- nlp_analysis
-- Resultado inmutable del pipeline NLP (RF13).
-- analyzed_text_snapshot: preserva el texto exacto analizado.
--   Necesario porque el contenido puede editarse (RF12); sin el snapshot,
--   el registro apuntaría a un texto que ya no existe en la BD.
-- Exactamente uno de post_id o comment_id debe ser NOT NULL (CHECK).
-- INMUTABLE: no se permite UPDATE ni DELETE.
-- ------------------------------------------------------------
CREATE TABLE nlp_analysis (
    id                         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id                    UUID          REFERENCES post(id),
    comment_id                 UUID          REFERENCES comment(id),
    content_type               content_type  NOT NULL,
    analyzed_text_snapshot     TEXT          NOT NULL,
    depressive_probability     NUMERIC(5,2)  CHECK (depressive_probability    BETWEEN 0 AND 100),
    anxiety_probability        NUMERIC(5,2)  CHECK (anxiety_probability       BETWEEN 0 AND 100),
    suicidal_probability       NUMERIC(5,2)  CHECK (suicidal_probability      BETWEEN 0 AND 100),
    base_malaise_index         NUMERIC(5,2)  CHECK (base_malaise_index        BETWEEN 0 AND 100),
    suicidal_override          BOOLEAN       NOT NULL DEFAULT FALSE,
    community_rules_infraction BOOLEAN       NOT NULL DEFAULT FALSE,
    top_clinical_label         VARCHAR(50),
    risk_level                 risk_level    NOT NULL,
    analyzed_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_nlp_single_content CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL    AND comment_id IS NOT NULL)
    )
);


-- ------------------------------------------------------------
-- clinical_case
-- Expediente clínico (entidad Case del diseño).
-- Nombre "clinical_case" evita colisión con la palabra reservada "case".
-- ------------------------------------------------------------
CREATE TABLE clinical_case (
    id                             UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id                     UUID                  NOT NULL REFERENCES student(id),
    case_type                      case_type             NOT NULL DEFAULT 'AUTOMATIC_ALERT',
    status                         case_status           NOT NULL DEFAULT 'OPENED',
    assigned_psychologist_id       UUID                  REFERENCES psychologist(id),
    is_unsubscribed_from_recapture BOOLEAN               NOT NULL DEFAULT FALSE,
    adviser_export_status          adviser_export_status NOT NULL DEFAULT 'NOT_EXPORTED',
    opened_at                      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- alert
-- Snapshot del riesgo detectado en un momento dado (RF16).
-- assigned_psychologist_id: NULL mientras status = PENDING | COMPLEMENTARY.
--   El CHECK enforza que todo estado distinto de PENDING/COMPLEMENTARY
--   tenga psicólogo asignado (RF19).
-- Desnormalizaciones intencionales:
--   student_id y campus: snapshot para consultas y enrutamiento sin joins.
--   historical_snapshot: estado del historial en el momento de la alerta;
--     garantiza que el psicólogo vea el contexto original aunque el estudiante
--     haya eliminado publicaciones posteriormente.
-- INMUTABLE una vez cerrada.
-- ------------------------------------------------------------
CREATE TABLE alert (
    id                       UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id                  UUID          NOT NULL REFERENCES clinical_case(id),
    nlp_analysis_id          UUID          NOT NULL UNIQUE REFERENCES nlp_analysis(id),
    student_id               UUID          NOT NULL REFERENCES student(id),
    campus                   udec_campus   NOT NULL,
    risk_level               risk_level    NOT NULL,
    status                   alert_status  NOT NULL DEFAULT 'PENDING',
    assigned_psychologist_id UUID          REFERENCES psychologist(id),
    is_complementary         BOOLEAN       NOT NULL DEFAULT FALSE,
    ai_generated_summary     TEXT,
    historical_snapshot      JSONB,
    generated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    accepted_at              TIMESTAMPTZ,
    closed_at                TIMESTAMPTZ,

    -- Toda alerta aceptada, atendida, marcada como falso positivo o complementaria
    -- debe tener psicólogo asignado. Solo PENDING puede tener NULL.
    CONSTRAINT chk_alert_psychologist_by_status CHECK (
        status IN ('PENDING', 'COMPLEMENTARY')
        OR assigned_psychologist_id IS NOT NULL
    )
);


-- ------------------------------------------------------------
-- informed_consent_signature
-- Firma del FO-BU-O13 al iniciar atención formal (RF05).
-- UNIQUE en case_id: un consentimiento por caso.
-- INMUTABLE: no se permite UPDATE ni DELETE.
-- ------------------------------------------------------------
CREATE TABLE informed_consent_signature (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id          UUID        NOT NULL UNIQUE REFERENCES clinical_case(id),
    student_id       UUID        NOT NULL REFERENCES student(id),
    document_version TEXT        NOT NULL,
    form_code        TEXT        NOT NULL DEFAULT 'FO-BU-O13',
    signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- chat_room
-- Canal de comunicación psicólogo-estudiante vinculado a un caso (RF23).
-- El estudiante no inicia conversaciones; solo el psicólogo (RF23, D-34).
-- ------------------------------------------------------------
CREATE TABLE chat_room (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id          UUID        NOT NULL REFERENCES clinical_case(id) ON DELETE CASCADE,
    psychologist_id  UUID        NOT NULL REFERENCES psychologist(id),
    status           chat_status NOT NULL DEFAULT 'ACTIVE',
    opened_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at        TIMESTAMPTZ
);


-- ------------------------------------------------------------
-- chat_message
-- Mensaje individual dentro de un canal de chat (RF23, RF24).
-- sender_id es una referencia polimórfica: puede apuntar a student.id
--   o psychologist.id según sender_role. PostgreSQL no soporta FK
--   polimórficas nativas; la integridad se delega a ChatManager,
--   que valida el par sender_id + sender_role antes de persistir.
--   Esta es una decisión de diseño pragmático documentada conscientemente.
-- ------------------------------------------------------------
CREATE TABLE chat_message (
    id           UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_room_id UUID                NOT NULL REFERENCES chat_room(id) ON DELETE CASCADE,
    sender_id    UUID                NOT NULL,
    sender_role  message_sender_role NOT NULL,
    text_content TEXT                NOT NULL CHECK (char_length(text_content) > 0),
    message_type message_type        NOT NULL DEFAULT 'STANDARD_TEXT',
    read         BOOLEAN             NOT NULL DEFAULT FALSE,
    sent_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- export_case
-- Registro inmutable del evento de exportación hacia Adviser (RF04).
-- UNIQUE en case_id: un registro de exportación por caso.
-- INMUTABLE: no se permite UPDATE ni DELETE.
-- ------------------------------------------------------------
CREATE TABLE export_case (
    id                       UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id                  UUID                  NOT NULL UNIQUE REFERENCES clinical_case(id),
    psychologist_id          UUID                  NOT NULL REFERENCES psychologist(id),
    format                   export_format         NOT NULL DEFAULT 'PDF',
    send_status              adviser_export_status NOT NULL DEFAULT 'NOT_EXPORTED',
    recipient_email          TEXT,
    included_optional_fields JSONB,
    exported_at              TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- in_app_notification
-- Notificaciones persistidas para visualización en la interfaz.
-- user_role usa user_role_type (no message_sender_role) porque describe
--   quién recibe la notificación, no quién envía un mensaje.
-- risk_level es NULL cuando la notificación no es de tipo alerta.
-- ------------------------------------------------------------
CREATE TABLE in_app_notification (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID            NOT NULL,
    user_role   user_role_type  NOT NULL,
    message     TEXT            NOT NULL,
    risk_level  risk_level,
    read        BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. ÍNDICES DE RENDIMIENTO
-- ============================================================

CREATE INDEX idx_alert_campus_status
    ON alert (campus, status);

CREATE INDEX idx_alert_case_id
    ON alert (case_id);

CREATE INDEX idx_post_student_id
    ON post (student_id);

CREATE INDEX idx_post_status
    ON post (status);

CREATE INDEX idx_comment_post_id
    ON comment (post_id);

CREATE INDEX idx_nlp_post_id
    ON nlp_analysis (post_id);

CREATE INDEX idx_nlp_comment_id
    ON nlp_analysis (comment_id);

CREATE INDEX idx_nlp_risk_level
    ON nlp_analysis (risk_level);

CREATE INDEX idx_chatroom_case_id
    ON chat_room (case_id);

CREATE INDEX idx_chatroom_status
    ON chat_room (status);

CREATE INDEX idx_message_chatroom_id
    ON chat_message (chat_room_id);

CREATE INDEX idx_message_sender
    ON chat_message (sender_id, sender_role);

CREATE INDEX idx_case_student_id
    ON clinical_case (student_id);

CREATE INDEX idx_case_status
    ON clinical_case (status);

CREATE INDEX idx_notification_user_unread
    ON in_app_notification (user_id, read)
    WHERE read = FALSE;

-- Enrutamiento de notificaciones por sede y turno (RF15)
CREATE INDEX idx_psychologist_campus_shift
    ON psychologist (campus, shift);


-- ============================================================
-- 5. FUNCIÓN Y TRIGGERS: actualización automática de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_updated_at
    BEFORE UPDATE ON student
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_psychologist_updated_at
    BEFORE UPDATE ON psychologist
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_post_updated_at
    BEFORE UPDATE ON post
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_comment_updated_at
    BEFORE UPDATE ON comment
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_case_updated_at
    BEFORE UPDATE ON clinical_case
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_chatroom_updated_at
    BEFORE UPDATE ON chat_room
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_complementary_updated_at
    BEFORE UPDATE ON complementary_data
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();


-- ============================================================
-- 6. NOTAS SOBRE POLÍTICAS RLS
-- Configurar en Supabase Studio o como migraciones SQL separadas.
--
-- TABLAS INMUTABLES (denegar UPDATE y DELETE a todos los roles):
--   registration_consent, nlp_analysis, informed_consent_signature, export_case
--
-- AISLAMIENTO POR SEDE:
--   Psicólogo solo accede a alertas donde campus = su campus.
--   Psicólogo no accede a alertas aceptadas por otro psicólogo de su sede.
--
-- AISLAMIENTO DEL ESTUDIANTE:
--   Estudiante solo accede a sus propios registros en student, post, comment, pseudonym.
--   Estudiante no tiene acceso a nlp_analysis, alert, clinical_case,
--   informed_consent_signature ni export_case.
--   Estudiante accede a chat_message solo de salas vinculadas a su case.
--
-- EJEMPLO:
--   ALTER TABLE alert ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "psychologists_see_own_campus_alerts"
--   ON alert FOR SELECT TO authenticated
--   USING (campus = (SELECT campus FROM psychologist WHERE id = auth.uid()));
-- ============================================================
