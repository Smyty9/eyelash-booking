import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const appointmentSchema = z.object({
  serviceId: z.string().uuid('Неверный ID услуги'),
  date: z.coerce.date({
    required_error: 'Дата обязательна',
    invalid_type_error: 'Неверный формат даты',
  }),
  time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Неверный формат времени (HH:MM)'),
  name: z.string().min(1, 'Имя обязательно'),
  phone: z.string().min(1, 'Телефон обязателен'),
});

// Нормализация телефона: убираем все нецифровые символы, оставляем только цифры
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Если начинается с 7 или 8, убираем первую цифру
  if (digits.startsWith('7') || digits.startsWith('8')) {
    return digits.substring(1);
  }
  return digits;
}

// Проверка доступности времени
async function isTimeSlotAvailable(
  serviceId: string,
  appointmentDate: Date,
  appointmentTime: string
): Promise<{ available: boolean; reason?: string }> {
  // Получаем услугу для определения длительности
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { durationMinutes: true, isActive: true },
  });

  if (!service) {
    return { available: false, reason: 'Услуга не найдена' };
  }

  if (!service.isActive) {
    return { available: false, reason: 'Услуга неактивна' };
  }

  // Парсим время и создаем полную дату-время начала записи
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const startDateTime = new Date(appointmentDate);
  startDateTime.setHours(hours, minutes, 0, 0);

  // Вычисляем время окончания записи
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + service.durationMinutes);

  // Создаем границы дня для поиска записей (без мутации исходной даты)
  const dayStart = new Date(appointmentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(appointmentDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Находим все записи на эту дату, которые не отменены
  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      serviceId,
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

  // Проверяем пересечения по времени
  for (const appointment of conflictingAppointments) {
    const existingStart = new Date(appointment.date);
    const existingEnd = new Date(existingStart);
    existingEnd.setMinutes(existingEnd.getMinutes() + appointment.service.durationMinutes);

    // Проверяем пересечение: новое время не должно начинаться внутри существующей записи
    // и существующая запись не должна начинаться внутри новой
    if (
      (startDateTime >= existingStart && startDateTime < existingEnd) ||
      (existingStart >= startDateTime && existingStart < endDateTime)
    ) {
      return {
        available: false,
        reason: 'Время уже занято',
      };
    }
  }

  return { available: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = appointmentSchema.parse(body);

    // Нормализуем телефон
    const normalizedPhone = normalizePhone(validatedData.phone);
    if (normalizedPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Неверный формат телефона. Ожидается 10 цифр' },
        { status: 400 }
      );
    }

    // Парсим время и создаем полную дату-время в локальном часовом поясе
    const [hours, minutes] = validatedData.time.split(':').map(Number);
    // Создаем дату из валидированной даты (уже Date объект после z.coerce.date)
    const appointmentDateTime = new Date(validatedData.date);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    // Проверяем, что дата не в прошлом
    if (appointmentDateTime < new Date()) {
      return NextResponse.json(
        { error: 'Нельзя записаться на прошедшую дату' },
        { status: 400 }
      );
    }

    // Проверяем доступность времени
    const availabilityCheck = await isTimeSlotAvailable(
      validatedData.serviceId,
      validatedData.date,
      validatedData.time
    );

    if (!availabilityCheck.available) {
      return NextResponse.json(
        { error: availabilityCheck.reason || 'Время недоступно' },
        { status: 409 }
      );
    }

    // Находим или создаем пользователя по телефону
    const phone = normalizedPhone;
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        name: validatedData.name,
      },
      create: {
        phone,
        name: validatedData.name,
        role: 'CLIENT',
      },
    });

    // Создаем запись
    const appointment = await prisma.appointment.create({
      data: {
        date: appointmentDateTime,
        userId: user.id,
        serviceId: validatedData.serviceId,
        status: 'PENDING',
      },
      include: {
        service: {
          select: {
            name: true,
            price: true,
            durationMinutes: true,
          },
        },
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании записи' },
      { status: 500 }
    );
  }
}

