import { createServiceClient } from '@/lib/supabase/service';

/**
 * Calculate and credit referral commission after a deal completes.
 * Call this ONLY from trusted server-side code (API routes, webhooks, crons).
 * Uses service role client — bypasses RLS.
 *
 * @param dealId - The UUID of the completed deal
 */
export async function calculateReferralCommission(dealId: string): Promise<void> {
  const supabase = createServiceClient();

  // 1. Get the deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, total_amount, client_user_id')
    .eq('id', dealId)
    .single();

  if (dealError || !deal) {
    console.error('[Referral] Deal not found:', dealId, dealError);
    return;
  }

  // 2. Check if client was referred
  const { data: client, error: clientError } = await supabase
    .from('user_profiles')
    .select('id, referred_by, created_at')
    .eq('id', deal.client_user_id)
    .single();

  if (clientError || !client?.referred_by) {
    // No referrer — skip. This is the normal case for most deals.
    return;
  }

  // 3. Check 12-month window from client's account creation
  const referralExpiry = new Date(client.created_at);
  referralExpiry.setFullYear(referralExpiry.getFullYear() + 1);
  if (new Date() > referralExpiry) {
    // Past the 12-month attribution window — skip
    return;
  }

  // 4. Check for duplicate (idempotency — in case of webhook retry)
  const { data: existing } = await supabase
    .from('referral_earnings')
    .select('id')
    .eq('deal_id', dealId)
    .maybeSingle();

  if (existing) {
    // Already credited for this deal — skip
    return;
  }

  // 5. Calculate amounts (all in cents)
  // Stripe fee: 2.9% + $0.30 (confirmed accurate)
  const dealAmount = deal.total_amount;
  const platformFee = Math.round(dealAmount * 0.05);
  const stripeFee = Math.round(dealAmount * 0.029) + 30;
  const netPlatformRevenue = Math.max(0, platformFee - stripeFee);
  const referralCommission = Math.round(netPlatformRevenue * 0.20);

  if (referralCommission <= 0) {
    // No commission to pay (deal too small) — skip
    return;
  }

  // 6. Insert earning record
  const { error: insertError } = await supabase
    .from('referral_earnings')
    .insert({
      referrer_user_id: client.referred_by,
      referred_user_id: client.id,
      deal_id: dealId,
      deal_amount: dealAmount,
      platform_fee: platformFee,
      stripe_fee: stripeFee,
      net_platform_revenue: netPlatformRevenue,
      referral_commission: referralCommission,
      status: 'credited',
    });

  if (insertError) {
    console.error('[Referral] Failed to insert earning:', insertError);
    return;
  }

  console.log(
    `[Referral] Credited $${(referralCommission / 100).toFixed(2)} to referrer ${client.referred_by} for deal ${dealId}`
  );
}
