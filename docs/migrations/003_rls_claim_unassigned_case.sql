-- 003: Allow psychologists to claim unassigned clinical cases
-- 
-- The existing policy "clinical_case_update_psychologist" only allows updates
-- when assigned_psychologist_id = auth.uid().
-- This new policy allows psychologists to UPDATE (claim) cases that have
-- no assigned psychologist yet (e.g., cases created by the triage pipeline).
--
-- Run from Supabase Studio → SQL Editor

CREATE POLICY "clinical_case_claim_psychologist" ON "public"."clinical_case"
  FOR UPDATE TO "authenticated"
  USING (("assigned_psychologist_id" IS NULL))
  WITH CHECK (("assigned_psychologist_id" = "auth"."uid"()));
