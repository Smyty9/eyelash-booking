import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/utils/auth';
import { hashPassword } from '@/lib/utils/password';
import { normalizePhone, toDatabasePhone } from '@/lib/utils/phone';
import { UserRole } from '@prisma/client';

const createAdminSchema = z.object({
  phone: z.string().min(1, 'Телефон обязателен'),
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

export async function GET() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const admins = await prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка администраторов' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    
    // Валидация данных
    const validatedData = createAdminSchema.parse(body);
    
    // Нормализация телефона
    const normalizedPhone = normalizePhone(validatedData.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Неверный формат телефона. Используйте формат +7 (XXX) XXX-XX-XX' },
        { status: 400 }
      );
    }
    
    const dbPhone = toDatabasePhone(normalizedPhone);
    
    // Проверка уникальности телефона
    const existingUser = await prisma.user.findUnique({
      where: { phone: dbPhone },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким телефоном уже существует' },
        { status: 409 }
      );
    }
    
    // Хеширование пароля
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Создание администратора
    const admin = await prisma.user.create({
      data: {
        phone: dbPhone,
        name: validatedData.name,
        email: validatedData.email || null,
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    
    return NextResponse.json(admin, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании администратора' },
      { status: 500 }
    );
  }
}

