import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/utils/auth';

const timeBlockSchema = z.object({
  type: z.enum(['DAY_OFF', 'VACATION', 'BREAK']),
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
  description: z.string().optional(),
}).refine((data) => data.endDateTime > data.startDateTime, {
  message: 'Дата окончания должна быть позже даты начала',
  path: ['endDateTime'],
});

export async function PUT(
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
    const validatedData = timeBlockSchema.parse(body);

    // Проверяем существование записи
    const existing = await prisma.timeBlock.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Блокировка не найдена' },
        { status: 404 }
      );
    }

    const timeBlock = await prisma.timeBlock.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(timeBlock);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('Record to update does not exist')) {
      return NextResponse.json(
        { error: 'Блокировка не найдена' },
        { status: 404 }
      );
    }
    console.error('Error updating time block:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении блокировки' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await params;

    // Проверяем существование записи
    const existing = await prisma.timeBlock.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Блокировка не найдена' },
        { status: 404 }
      );
    }

    await prisma.timeBlock.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Блокировка не найдена' },
        { status: 404 }
      );
    }
    console.error('Error deleting time block:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении блокировки' },
      { status: 500 }
    );
  }
}

