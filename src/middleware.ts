import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // --- REFERRAL COOKIE HANDLING (add at top of middleware function) ---
  const refCode = request.nextUrl.searchParams.get('ref');
  if (refCode && /^REF-[A-Z0-9]{6}$/.test(refCode)) {
    // Check if user already has a referral cookie — first code wins
    const existingRef = request.cookies.get('checkhire_ref')?.value;
    if (!existingRef) {
      // Set referral cookie with 30-day expiry
      // We need to pass this through to the response, so store it for now
      // and apply it to whatever response the rest of the middleware produces
      const url = request.nextUrl.clone();
      url.searchParams.delete('ref'); // Clean the URL
      const response = NextResponse.redirect(url);
      response.cookies.set('checkhire_ref', refCode, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return response;
    }
  }
  // --- END REFERRAL COOKIE HANDLING ---

  const response = await updateSession(request);

  // Pass pathname to server components via header
  response.headers.set('x-next-pathname', request.nextUrl.pathname);

  return response;
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
