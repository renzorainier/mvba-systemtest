// import { NextResponse } from 'next/server';

// export function middleware(request) {
//   // 1. Get the path the user is trying to visit
//   const path = request.nextUrl.pathname;

//   // 2. Check if they have the "Badge" (Cookie)
//   const token = request.cookies.get('auth_token')?.value;

//   // 3. DEFINE RULES:

//   // Rule A: If they are on the Login Page ('/') but ALREADY have a token...
//   // Kick them into the portal immediately.
//   if (path === '/' && token) {
//     return NextResponse.redirect(new URL('/portal', request.url));
//   }

//   // Rule B: If they are trying to visit '/portal' but have NO token...
//   // Kick them back to the Login Page.
//   if (path.startsWith('/portal') && !token) {
//     return NextResponse.redirect(new URL('/', request.url));
//   }

//   // 4. If none of the above, let them pass.
//   return NextResponse.next();
// }

// // 5. Configure which paths this middleware affects
// export const config = {
//   matcher: [
//     '/',              // Match Login Page
//     '/portal/:path*' // Match portal and EVERYTHING inside it
//   ],
// };


import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;
  const tokenStr = request.cookies.get('auth_token')?.value;

  // Rule A: Logged in users shouldn't see the login page
  if (path === '/' && tokenStr) {
    return NextResponse.redirect(new URL('/portal/dashboard', request.url));
  }

  // Rule B: Unauthenticated users are kicked out
  if (path.startsWith('/portal') && !tokenStr) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // --- ROLE-BASED ACCESS CONTROL (RBAC) ---
  if (tokenStr && path.startsWith('/portal')) {
    try {
      // Parse the cookie to get the role (saved during login)
      const user = JSON.parse(tokenStr);
      const role = user.role; // Expected: 'Admin', 'Registrar', 'Cashier'

      // 1. Cashier Restrictions (Cannot access Students, Teachers, Classes, or System)
      const isAcademicRoute = path.startsWith('/portal/students') || path.startsWith('/portal/teachers') || path.startsWith('/portal/classes');
      if (isAcademicRoute && !['Admin', 'Registrar'].includes(role)) {
        return NextResponse.redirect(new URL('/portal/dashboard', request.url));
      }

      // 2. Registrar Restrictions (Cannot access Financials)
      if (path.startsWith('/portal/financials') && !['Admin', 'Cashier'].includes(role)) {
        return NextResponse.redirect(new URL('/portal/dashboard', request.url));
      }

      // 3. Admin-Only Restrictions
      if (path.startsWith('/portal/system') && role !== 'Admin') {
        return NextResponse.redirect(new URL('/portal/dashboard', request.url));
      }

      if (path.startsWith('/portal/accounts') && role !== 'Admin') {
        return NextResponse.redirect(new URL('/portal/dashboard', request.url));
      }

    } catch (error) {
      // If the cookie is corrupted, clear it from the browser and force re-login.
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/portal/:path*'],
};
