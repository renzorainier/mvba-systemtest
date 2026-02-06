import { NextResponse } from 'next/server';

export function middleware(request) {
  // 1. Get the path the user is trying to visit
  const path = request.nextUrl.pathname;

  // 2. Check if they have the "Badge" (Cookie)
  const token = request.cookies.get('auth_token')?.value;

  // 3. DEFINE RULES:

  // Rule A: If they are on the Login Page ('/') but ALREADY have a token...
  // Kick them into the portal immediately.
  if (path === '/' && token) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  // Rule B: If they are trying to visit '/portal' but have NO token...
  // Kick them back to the Login Page.
  if (path.startsWith('/portal') && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. If none of the above, let them pass.
  return NextResponse.next();
}

// 5. Configure which paths this middleware affects
export const config = {
  matcher: [
    '/',              // Match Login Page
    '/portal/:path*' // Match portal and EVERYTHING inside it
  ],
};
