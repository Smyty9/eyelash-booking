import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/utils/auth';

const serviceSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  price: z.number().positive('Цена должна быть положительной'),
  durationMinutes: z.number().int().positive('Длительность должна быть положительным числом'),
  isActive: z.boolean().optional(),
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
    const validatedData = serviceSchema.parse(body);

    const service = await prisma.service.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('Record to update does not exist')) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      );
    }
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении услуги' },
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

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      );
    }
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении услуги' },
      { status: 500 }
    );
  }
}

