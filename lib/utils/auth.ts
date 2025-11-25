import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';

/**
 * Проверяет аутентификацию пользователя
 * Возвращает сессию или null
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session;
}

/**
 * Проверяет, что пользователь авторизован и имеет роль ADMIN
 * Возвращает сессию или выбрасывает ошибку через NextResponse
 */
export async function requireAdmin() {
  const session = await requireAuth();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 }
    );
  }

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: 'Доступ запрещен. Требуется роль администратора' },
      { status: 403 }
    );
  }

  return session;
}

