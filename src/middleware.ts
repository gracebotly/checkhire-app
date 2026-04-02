import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // --- REFERRAL COOKIE HANDLING ---
  const refCode = request.nextUrl.searchParams.get('ref');
  if (refCode && /^REF-[A-Z0-9]{6}$/.test(refCode)) {
    const existingRef = request.cookies.get('checkhire_ref')?.value;
    if (!existingRef) {
      const url = request.nextUrl.clone();
      url.searchParams.delete('ref');
      // Add a non-sensitive flag so the landing page can show referral context
      url.searchParams.set('referred', '1');
      const response = NextResponse.redirect(url);
      response.cookies.set('checkhire_ref', refCode, {
        maxAge: 30 * 24 * 60 * 60,
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
  response.headers.set('x-next-pathname', request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
