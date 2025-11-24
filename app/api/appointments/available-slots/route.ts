import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  serviceId: z.string().uuid('Неверный ID услуги'),
  date: z.coerce.date({
    required_error: 'Дата обязательна',
    invalid_type_error: 'Неверный формат даты',
  }),
});

// Рабочие часы: с 10:00 до 18:00
const WORK_START_HOUR = 10;
const WORK_END_HOUR = 18;
const TIME_SLOT_INTERVAL_MINUTES = 30; // Интервал между слотами (30 минут)

// Генерация всех возможных временных слотов на день
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  let currentHour = WORK_START_HOUR;
  let currentMinute = 0;

  while (currentHour < WORK_END_HOUR || (currentHour === WORK_END_HOUR && currentMinute === 0)) {
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    slots.push(timeString);

    currentMinute += TIME_SLOT_INTERVAL_MINUTES;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }

  return slots;
}

// Проверка доступности конкретного временного слота
function isSlotAvailable(
  slotTime: string,
  serviceDurationMinutes: number,
  existingAppointments: Array<{ date: Date; service: { durationMinutes: number } }>,
  targetDate: Date
): boolean {
  const [hours, minutes] = slotTime.split(':').map(Number);
  const slotStart = new Date(targetDate);
  slotStart.setHours(hours, minutes, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + serviceDurationMinutes);

  // Проверяем, что слот не выходит за рабочие часы
  if (slotEnd.getHours() > WORK_END_HOUR || (slotEnd.getHours() === WORK_END_HOUR && slotEnd.getMinutes() > 0)) {
    return false;
  }

  // Проверяем пересечения с существующими записями
  for (const appointment of existingAppointments) {
    const existingStart = new Date(appointment.date);
    const existingEnd = new Date(existingStart);
    existingEnd.setMinutes(existingEnd.getMinutes() + appointment.service.durationMinutes);

    // Проверяем пересечение: слот не должен начинаться внутри существующей записи
    // и существующая запись не должна начинаться внутри слота
    if (
      (slotStart >= existingStart && slotStart < existingEnd) ||
      (existingStart >= slotStart && existingStart < slotEnd)
    ) {
      return false;
    }
  }

  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const dateParam = searchParams.get('date');

    if (!serviceId || !dateParam) {
      return NextResponse.json(
        { error: 'Необходимы параметры serviceId и date' },
        { status: 400 }
      );
    }

    // Валидация параметров
    const validatedQuery = querySchema.parse({
      serviceId,
      date: dateParam,
    });

    // Получаем услугу
    const service = await prisma.service.findUnique({
      where: { id: validatedQuery.serviceId },
      select: { durationMinutes: true, isActive: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      );
    }

    if (!service.isActive) {
      return NextResponse.json(
        { error: 'Услуга неактивна' },
        { status: 400 }
      );
    }

    // Проверяем, что дата не в прошлом
    const targetDate = new Date(validatedQuery.date);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      return NextResponse.json(
        { error: 'Нельзя получить слоты для прошедшей даты' },
        { status: 400 }
      );
    }

    // Создаем границы дня для поиска записей
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Получаем все записи на эту дату, которые не отменены
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        serviceId: validatedQuery.serviceId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          not: 'CANCELED',
        },
      },
      select: {
        date: true,
        service: {
          select: {
            durationMinutes: true,
          },
        },
      },
    });

    // Генерируем все возможные слоты
    const allSlots = generateTimeSlots();

    // Фильтруем доступные слоты
    const availableSlots = allSlots.filter((slot) =>
      isSlotAvailable(slot, service.durationMinutes, existingAppointments, targetDate)
    );

    return NextResponse.json({
      date: targetDate.toISOString().split('T')[0],
      serviceId: validatedQuery.serviceId,
      availableSlots,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении доступных слотов' },
      { status: 500 }
    );
  }
}

