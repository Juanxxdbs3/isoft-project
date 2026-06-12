-- Migration 002: Make alert.case_id nullable
-- 
-- Permite que las alertas se creen sin un clinical_case asociado,
-- facilitando pruebas manuales y casos borde.
-- El backend siempre crea el caso antes de la alerta en producción.

ALTER TABLE IF EXISTS public.alert
  ALTER COLUMN case_id DROP NOT NULL;
