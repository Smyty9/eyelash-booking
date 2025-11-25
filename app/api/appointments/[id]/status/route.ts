import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/utils/auth';

const statusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELED'], {
    errorMap: () => ({ message: 'Неверный статус' }),
  }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = statusSchema.parse(body);

    // Проверяем существование записи
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      );
    }

    // Обновляем статус
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: validatedData.status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMinutes: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('Record to update does not exist')) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      );
    }
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса записи' },
      { status: 500 }
    );
  }
}

