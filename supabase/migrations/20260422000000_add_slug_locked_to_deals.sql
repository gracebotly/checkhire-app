ALTER TABLE deals ADD COLUMN slug_locked boolean NOT NULL DEFAULT false;

-- Lock slugs on deals that are already funded, have a freelancer, or are completed/cancelled
UPDATE deals SET slug_locked = true
WHERE escrow_status != 'unfunded'
   OR freelancer_user_id IS NOT NULL
   OR status IN ('in_progress', 'submitted', 'completed', 'disputed', 'cancelled', 'refunded');
