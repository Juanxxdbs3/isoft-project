import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/foro', '/perfil', '/configuracion', '/chat', '/dashboard'];
const publicRoutes = ['/', '/login', '/registro'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublic = publicRoutes.some(route => pathname === route || (route !== '/' && pathname.startsWith(route)));

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && token && pathname.startsWith('/login')) {
    const role = request.cookies.get('role')?.value;
    if (role === 'psychologist') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/foro', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
