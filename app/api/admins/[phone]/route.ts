import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/utils/auth';
import { normalizePhone, toDatabasePhone } from '@/lib/utils/phone';
import { UserRole } from '@prisma/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const session = authResult;

  try {
    const { phone: phoneParam } = await params;
    
    // Декодируем телефон из URL
    const decodedPhone = decodeURIComponent(phoneParam);
    
    // Нормализуем телефон
    const normalizedPhone = normalizePhone(decodedPhone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Неверный формат телефона' },
        { status: 400 }
      );
    }
    
    const dbPhone = toDatabasePhone(normalizedPhone);
    
    // Проверка, что удаляемый админ не является текущим пользователем
    if (session.user.phone === dbPhone) {
      return NextResponse.json(
        { error: 'Нельзя удалить самого себя' },
        { status: 400 }
      );
    }
    
    // Проверяем, что пользователь существует и является администратором
    const user = await prisma.user.findUnique({
      where: { phone: dbPhone },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Администратор не найден' },
        { status: 404 }
      );
    }
    
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Пользователь не является администратором' },
        { status: 400 }
      );
    }
    
    // Преобразуем администратора в клиента
    await prisma.user.update({
      where: { phone: dbPhone },
      data: {
        role: UserRole.CLIENT,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении администратора' },
      { status: 500 }
    );
  }
}

