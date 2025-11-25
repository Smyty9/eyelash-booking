import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

export default auth((req: NextRequest & { auth?: any }) => {
  const { pathname } = req.nextUrl;

  // Пропускаем публичные роуты
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/appointments/available-slots') ||
    pathname.startsWith('/auth/login')
  ) {
    return NextResponse.next();
  }

  // Защищаем админ-роуты
  if (pathname.startsWith('/admin')) {
    const session = req.auth;

    // Если не авторизован, редирект на страницу входа
    if (!session?.user) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Если авторизован, но не админ, редирект на главную
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

