import { cookies } from "next/headers";

/**
 * Guest freelancer session cookie utility.
 *
 * When a guest accepts a deal via email verification, we set an httpOnly cookie
 * so they can return to the deal page later without needing the ?guest_token URL
 * param. The cookie is scoped to a specific dealId so one browser can have
 * multiple guest sessions across different deals.
 *
 * Cookie name: ch_guest_{dealId}
 * Value: the HMAC guest token from generateGuestToken()
 * Expiry: 30 days
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
const COOKIE_PREFIX = "ch_guest_";

function cookieName(dealId: string): string {
  return `${COOKIE_PREFIX}${dealId}`;
}

/**
 * Set the guest session cookie after successful acceptance.
 * Must be called from a Route Handler or Server Action.
 */
export async function setGuestSessionCookie(
  dealId: string,
  guestToken: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(cookieName(dealId), guestToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Read the guest session cookie for a specific deal.
 * Returns null if no cookie is set.
 */
export async function getGuestSessionFromCookie(
  dealId: string
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(cookieName(dealId));
  return cookie?.value || null;
}

/**
 * Clear the guest session cookie for a specific deal.
 * Called when the deal completes or is cancelled.
 */
export async function clearGuestSession(dealId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName(dealId));
}
