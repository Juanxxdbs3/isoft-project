-- ============================================================
-- MindBridge — RLS Policies v1.1
-- Compatible con Supabase Auth (auth.uid())
-- Fecha: 2026-06-06
--
-- PRERREQUISITOS (ya ejecutados):
--   1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY en todas las tablas
--   2. student.id y psychologist.id referencian auth.users(id)
--   3. password_hash eliminado de student y psychologist
--   4. FK fk_student_auth_user y fk_psychologist_auth_user agregadas
--
-- Las operaciones del backend usan service_role key que BYPASSES RLS.
-- Estas políticas aplican a peticiones autenticadas con JWT de usuario final.
-- ============================================================

-- ============================================================
-- 1. rol — Catálogo público de roles
-- ============================================================
CREATE POLICY "rol_select_all_authenticated"
ON rol FOR SELECT TO authenticated
USING (true);


-- ============================================================
-- 2. student — Cada estudiante solo su propio registro
-- ============================================================
CREATE POLICY "student_select_own"
ON student FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "student_insert_self"
ON student FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "student_update_own"
ON student FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());


-- ============================================================
-- 3. psychologist — Cada psicólogo solo su propio registro
-- ============================================================
CREATE POLICY "psychologist_select_own"
ON psychologist FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "psychologist_update_own"
ON psychologist FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());


-- ============================================================
-- 4. pseudonym — Estudiante gestiona sus seudónimos
-- ============================================================
CREATE POLICY "pseudonym_select_own"
ON pseudonym FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "pseudonym_insert_own"
ON pseudonym FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "pseudonym_update_own"
ON pseudonym FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());


-- ============================================================
-- 5. post — Estudiante propios; psicólogos ven todos (VISIBLE)
-- ============================================================
CREATE POLICY "post_select_own_or_psychologist"
ON post FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM psychologist WHERE id = auth.uid())
);

CREATE POLICY "post_insert_own"
ON post FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "post_update_own"
ON post FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());


-- ============================================================
-- 6. comment — Estudiante propios; psicólogos ven todos
-- ============================================================
CREATE POLICY "comment_select_own_or_psychologist"
ON comment FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM psychologist WHERE id = auth.uid())
);

CREATE POLICY "comment_insert_own"
ON comment FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "comment_update_own"
ON comment FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());


-- ============================================================
-- 7. registration_consent — INMUTABLE. Estudiante solo lectura propia
-- ============================================================
CREATE POLICY "registration_consent_select_own"
ON registration_consent FOR SELECT TO authenticated
USING (student_id = auth.uid());


-- ============================================================
-- 8. complementary_data — Psicólogo del caso gestiona
-- ============================================================
CREATE POLICY "complementary_data_select_psychologist"
ON complementary_data FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clinical_case cc
    JOIN alert a ON a.case_id = cc.id
    WHERE cc.student_id = complementary_data.student_id
      AND a.assigned_psychologist_id = auth.uid()
  )
);

CREATE POLICY "complementary_data_insert_psychologist"
ON complementary_data FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clinical_case cc
    JOIN alert a ON a.case_id = cc.id
    WHERE cc.student_id = complementary_data.student_id
      AND a.assigned_psychologist_id = auth.uid()
  )
);

CREATE POLICY "complementary_data_update_psychologist"
ON complementary_data FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clinical_case cc
    JOIN alert a ON a.case_id = cc.id
    WHERE cc.student_id = complementary_data.student_id
      AND a.assigned_psychologist_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clinical_case cc
    JOIN alert a ON a.case_id = cc.id
    WHERE cc.student_id = complementary_data.student_id
      AND a.assigned_psychologist_id = auth.uid()
  )
);


-- ============================================================
-- 9. nlp_analysis — INMUTABLE. Psicólogos via alerta/caso; estudiantes no acceden
-- ============================================================
CREATE POLICY "nlp_analysis_select_via_alert"
ON nlp_analysis FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM alert a
    JOIN clinical_case cc ON cc.id = a.case_id
    WHERE a.nlp_analysis_id = nlp_analysis.id
      AND (
        a.assigned_psychologist_id = auth.uid()
        OR (
          a.status = 'PENDING'
          AND a.campus = (SELECT campus FROM psychologist WHERE id = auth.uid()) -- <- CORREGIDO AQUÍ (de cc a a)
        )
      )
  )
);


-- ============================================================
-- 10. clinical_case — Estudiante propio; psicólogo asignado o campus
-- ============================================================
CREATE POLICY "clinical_case_select_student_own"
ON clinical_case FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "clinical_case_select_psychologist"
ON clinical_case FOR SELECT TO authenticated
USING (
  assigned_psychologist_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM psychologist p
    JOIN student s ON s.campus = p.campus
    WHERE p.id = auth.uid()
      AND s.id = clinical_case.student_id
  )
);

CREATE POLICY "clinical_case_insert_self_referral"
ON clinical_case FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "clinical_case_update_psychologist"
ON clinical_case FOR UPDATE TO authenticated
USING (assigned_psychologist_id = auth.uid())
WITH CHECK (assigned_psychologist_id = auth.uid());


-- ============================================================
-- 11. alert — Aislamiento por campus del psicólogo
-- ============================================================
CREATE POLICY "alert_select_psychologist_campus"
ON alert FOR SELECT TO authenticated
USING (
  campus = (SELECT campus FROM psychologist WHERE id = auth.uid())
  AND (
    status = 'PENDING'
    OR status = 'COMPLEMENTARY'
    OR assigned_psychologist_id = auth.uid()
  )
);

CREATE POLICY "alert_update_psychologist_assigned"
ON alert FOR UPDATE TO authenticated
USING (assigned_psychologist_id = auth.uid())
WITH CHECK (assigned_psychologist_id = auth.uid());


-- ============================================================
-- 12. informed_consent_signature — INMUTABLE. Participantes leen
-- ============================================================
CREATE POLICY "informed_consent_signature_select_participant"
ON informed_consent_signature FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clinical_case cc
    WHERE cc.id = informed_consent_signature.case_id
      AND cc.assigned_psychologist_id = auth.uid()
  )
);


-- ============================================================
-- 13. chat_room — Solo participantes
-- ============================================================
CREATE POLICY "chat_room_select_participant"
ON chat_room FOR SELECT TO authenticated
USING (
  psychologist_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clinical_case cc
    WHERE cc.id = chat_room.case_id
      AND cc.student_id = auth.uid()
  )
);

CREATE POLICY "chat_room_insert_psychologist"
ON chat_room FOR INSERT TO authenticated
WITH CHECK (psychologist_id = auth.uid());


-- ============================================================
-- 14. chat_message — Solo participantes de la sala
-- ============================================================
CREATE POLICY "chat_message_select_participant"
ON chat_message FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_room cr
    JOIN clinical_case cc ON cc.id = cr.case_id
    WHERE cr.id = chat_message.chat_room_id
      AND (
        cr.psychologist_id = auth.uid()
        OR cc.student_id = auth.uid()
      )
  )
);

CREATE POLICY "chat_message_insert_participant"
ON chat_message FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_room cr
    JOIN clinical_case cc ON cc.id = cr.case_id
    WHERE cr.id = chat_message.chat_room_id
      AND (
        cr.psychologist_id = auth.uid()
        OR cc.student_id = auth.uid()
      )
  )
);


-- ============================================================
-- 15. in_app_notification — Cada usuario ve sus propias notificaciones
-- ============================================================
CREATE POLICY "in_app_notification_select_own"
ON in_app_notification FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "in_app_notification_update_read"
ON in_app_notification FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 16. export_case — INMUTABLE. Psicólogo del caso lee
-- ============================================================
CREATE POLICY "export_case_select_psychologist"
ON export_case FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clinical_case cc
    WHERE cc.id = export_case.case_id
      AND cc.assigned_psychologist_id = auth.uid()
  )
);
