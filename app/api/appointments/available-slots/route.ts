import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getOverlappingTimeBlocks } from '@/lib/utils/time-blocks';

const querySchema = z.object({
  serviceId: z.string().uuid('Неверный ID услуги'),
  date: z.coerce.date({
    required_error: 'Дата обязательна',
    invalid_type_error: 'Неверный формат даты',
  }),
});

// Получение настроек из БД или дефолтные значения
async function getSettings() {
  const settings = await prisma.settings.findFirst();
  if (settings) {
    return {
      workStartHour: settings.workStartHour,
      workEndHour: settings.workEndHour,
      timeSlotIntervalMinutes: settings.timeSlotIntervalMinutes,
    };
  }
  // Дефолтные значения если настроек нет
  return {
    workStartHour: 10,
    workEndHour: 18,
    timeSlotIntervalMinutes: 30,
  };
}

// Генерация всех возможных временных слотов на день
function generateTimeSlots(
  workStartHour: number,
  workEndHour: number,
  timeSlotIntervalMinutes: number
): string[] {
  const slots: string[] = [];
  let currentHour = workStartHour;
  let currentMinute = 0;

  while (currentHour < workEndHour || (currentHour === workEndHour && currentMinute === 0)) {
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    slots.push(timeString);

    currentMinute += timeSlotIntervalMinutes;
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
  timeBlocks: Array<{ startDateTime: Date; endDateTime: Date }>,
  targetDate: Date,
  workEndHour: number
): boolean {
  // Извлекаем год, месяц, день из Date объекта в UTC
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth();
  const day = targetDate.getUTCDate();
  
  const [hours, minutes] = slotTime.split(':').map(Number);
  const slotStart = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));

  const slotEnd = new Date(slotStart);
  slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + serviceDurationMinutes);

  // Проверяем, что слот не выходит за рабочие часы
  if (slotEnd.getUTCHours() > workEndHour || (slotEnd.getUTCHours() === workEndHour && slotEnd.getUTCMinutes() > 0)) {
    return false;
  }

  // Проверяем пересечения с существующими записями
  for (const appointment of existingAppointments) {
    const existingStart = new Date(appointment.date);
    const existingEnd = new Date(existingStart);
    existingEnd.setUTCMinutes(existingEnd.getUTCMinutes() + appointment.service.durationMinutes);

    // Проверяем пересечение: слот не должен начинаться внутри существующей записи
    // и существующая запись не должна начинаться внутри слота
    if (
      (slotStart >= existingStart && slotStart < existingEnd) ||
      (existingStart >= slotStart && existingStart < slotEnd)
    ) {
      return false;
    }
  }

  // Проверяем пересечения с блокировками
  for (const block of timeBlocks) {
    const blockStart = new Date(block.startDateTime);
    const blockEnd = new Date(block.endDateTime);

    // Проверяем пересечение: слот не должен пересекаться с блокировкой
    if (
      (slotStart < blockEnd && slotEnd > blockStart)
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

    // Парсим дату из строки YYYY-MM-DD в UTC
    const dateStr = validatedQuery.date instanceof Date 
      ? validatedQuery.date.toISOString().split('T')[0]
      : validatedQuery.date;
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Создаем дату в UTC
    const targetDate = new Date(Date.UTC(year, month - 1, day));
    
    // Проверяем, что дата не в прошлом
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDateStart = new Date(year, month - 1, day, 0, 0, 0, 0);

    if (targetDateStart < today) {
      return NextResponse.json(
        { error: 'Нельзя получить слоты для прошедшей даты' },
        { status: 400 }
      );
    }

    // Создаем границы дня для поиска записей в UTC
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Получаем настройки рабочего времени
    const settings = await getSettings();

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

    // Получаем все блокировки, которые пересекаются с этим днем
    const timeBlocks = await getOverlappingTimeBlocks(dayStart, dayEnd);

    // Генерируем все возможные слоты
    const allSlots = generateTimeSlots(
      settings.workStartHour,
      settings.workEndHour,
      settings.timeSlotIntervalMinutes
    );

    // Фильтруем доступные слоты
    const availableSlots = allSlots.filter((slot) =>
      isSlotAvailable(slot, service.durationMinutes, existingAppointments, timeBlocks, targetDate, settings.workEndHour)
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

