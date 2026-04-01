/**
 * One-time script: Generate referral codes for existing users.
 * Run with: npx tsx scripts/backfill-referral-codes.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF-${code}`;
}

async function backfill() {
  console.log('Fetching users without referral codes...');

  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id')
    .is('referral_code', null);

  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('All users already have referral codes. Nothing to do.');
    return;
  }

  console.log(`Found ${users.length} users without referral codes.`);

  let success = 0;
  let failed = 0;

  for (const user of users) {
    let attempts = 0;
    let code = generateReferralCode();

    // Retry once if there's a unique constraint violation (extremely rare)
    while (attempts < 2) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ referral_code: code })
        .eq('id', user.id);

      if (!updateError) {
        success++;
        break;
      }

      if (updateError.code === '23505') {
        // Unique constraint violation — regenerate code
        code = generateReferralCode();
        attempts++;
      } else {
        console.error(`Failed to update user ${user.id}:`, updateError);
        failed++;
        break;
      }
    }
  }

  console.log(`Done. ${success} updated, ${failed} failed.`);
}

backfill();
