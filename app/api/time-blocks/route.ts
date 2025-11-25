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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const type = searchParams.get('type');

    const where: any = {};

    // Фильтр по дате
    if (dateFrom || dateTo) {
      where.OR = [];
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        // Блокировка пересекается с диапазоном, если её конец >= начала диапазона
        where.OR.push({
          endDateTime: { gte: fromDate },
        });
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        // Блокировка пересекается с диапазоном, если её начало <= конца диапазона
        where.OR.push({
          startDateTime: { lte: toDate },
        });
      }

      // Если указаны обе даты, нужно убедиться, что блокировка пересекается с диапазоном
      if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        
        where.AND = [
          { endDateTime: { gte: fromDate } },
          { startDateTime: { lte: toDate } },
        ];
        delete where.OR;
      }
    }

    // Фильтр по типу
    if (type && ['DAY_OFF', 'VACATION', 'BREAK'].includes(type)) {
      where.type = type;
    }

    const timeBlocks = await prisma.timeBlock.findMany({
      where,
      orderBy: { startDateTime: 'asc' },
    });

    return NextResponse.json(timeBlocks);
  } catch (error) {
    console.error('Error fetching time blocks:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении блокировок' },
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
    const validatedData = timeBlockSchema.parse(body);

    const timeBlock = await prisma.timeBlock.create({
      data: validatedData,
    });

    return NextResponse.json(timeBlock, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating time block:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании блокировки' },
      { status: 500 }
    );
  }
}

