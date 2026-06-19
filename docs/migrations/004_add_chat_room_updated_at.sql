-- Migration 004: Add updated_at column to chat_room
-- The trigger trg_chatroom_updated_at already exists (it fires BEFORE UPDATE)
-- but the column was missing, causing any UPDATE to fail with
-- "record new has no field updated_at"

ALTER TABLE "public"."chat_room"
  ADD COLUMN "updated_at" timestamptz DEFAULT now() NOT NULL;

-- Backfill existing rows (they get the default now(), which is fine)
UPDATE "public"."chat_room" SET "updated_at" = now() WHERE "updated_at" IS NULL;
