-- ============================================================
-- Fix FK constraints for MindBridge schema v1.1
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Asegura que la FK student.active_pseudonym_id → pseudonym.id
-- exista con el nombre exacto que PostgREST necesita para
-- la hidratación del endpoint /auth/me.
ALTER TABLE public.student
DROP CONSTRAINT IF EXISTS student_active_pseudonym_id_fkey;

ALTER TABLE public.student
ADD CONSTRAINT student_active_pseudonym_id_fkey
FOREIGN KEY (active_pseudonym_id)
REFERENCES public.pseudonym(id)
ON DELETE SET NULL;

-- Asegura también la relación inversa pseudonym.student_id → student.id
ALTER TABLE public.pseudonym
DROP CONSTRAINT IF EXISTS pseudonym_student_id_fkey;

ALTER TABLE public.pseudonym
ADD CONSTRAINT pseudonym_student_id_fkey
FOREIGN KEY (student_id)
REFERENCES public.student(id)
ON DELETE CASCADE;
