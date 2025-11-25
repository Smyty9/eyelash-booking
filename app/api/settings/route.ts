import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/utils/auth';

const settingsSchema = z.object({
  workStartHour: z.number().int().min(0).max(23, 'Час начала должен быть от 0 до 23'),
  workEndHour: z.number().int().min(0).max(23, 'Час окончания должен быть от 0 до 23'),
  timeSlotIntervalMinutes: z.number().int().positive('Интервал должен быть положительным числом'),
}).refine((data) => data.workStartHour < data.workEndHour, {
  message: 'Час начала должен быть меньше часа окончания',
  path: ['workStartHour'],
});

export async function GET() {
  try {
    // Получаем первую запись настроек или создаем дефолтную
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      // Создаем дефолтные настройки
      settings = await prisma.settings.create({
        data: {
          workStartHour: 10,
          workEndHour: 18,
          timeSlotIntervalMinutes: 30,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении настроек' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    // Получаем первую запись настроек
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      // Создаем новую запись настроек
      settings = await prisma.settings.create({
        data: validatedData,
      });
    } else {
      // Обновляем существующие настройки
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: validatedData,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении настроек' },
      { status: 500 }
    );
  }
}

