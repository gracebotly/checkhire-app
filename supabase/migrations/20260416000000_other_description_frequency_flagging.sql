-- Other category description + payment frequency + admin flagging
-- NOTE: This migration was already applied manually. This file exists for repo sync only.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS other_category_description text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_frequency text NOT NULL DEFAULT 'one_time'
  CHECK (payment_frequency IN ('one_time', 'weekly', 'biweekly', 'monthly'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS flagged_reason text;
