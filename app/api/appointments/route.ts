import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isTimeBlocked } from '@/lib/utils/time-blocks';
import { requireAdmin } from '@/lib/utils/auth';

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

  // Извлекаем год, месяц, день из Date объекта в UTC
  const year = appointmentDate.getUTCFullYear();
  const month = appointmentDate.getUTCMonth();
  const day = appointmentDate.getUTCDate();

  // Парсим время и создаем полную дату-время начала записи в UTC
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const startDateTime = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));

  // Вычисляем время окончания записи
  const endDateTime = new Date(startDateTime);
  endDateTime.setUTCMinutes(endDateTime.getUTCMinutes() + service.durationMinutes);

  // Создаем границы дня для поиска записей в UTC
  const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

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
    existingEnd.setUTCMinutes(existingEnd.getUTCMinutes() + appointment.service.durationMinutes);

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

  // Проверяем блокировки времени
  const blocked = await isTimeBlocked(startDateTime, endDateTime);
  if (blocked) {
    return {
      available: false,
      reason: 'Время заблокировано',
    };
  }

  return { available: true };
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const serviceId = searchParams.get('serviceId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    // Строим условия фильтрации
    const where: any = {};

    // Фильтр по статусу
    if (status && status !== 'all') {
      where.status = status;
    }

    // Фильтр по услуге
    if (serviceId) {
      where.serviceId = serviceId;
    }

    // Фильтр по дате
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        where.date.gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    // Поиск по имени (clientName) или телефону
    // В Prisma все условия в where объединяются через AND по умолчанию
    // OR условия внутри where работают корректно вместе с другими условиями
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { user: { phone: { contains: search } } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
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
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении записей' },
      { status: 500 }
    );
  }
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

    // Парсим дату из строки YYYY-MM-DD в UTC
    // validatedData.date может быть Date объектом после z.coerce.date, но нам нужна строка
    const dateStr = typeof validatedData.date === 'string' 
      ? validatedData.date 
      : validatedData.date.toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Парсим время и создаем полную дату-время
    const [hours, minutes] = validatedData.time.split(':').map(Number);
    
    // Создаем дату-время в UTC, интерпретируя выбранное время как локальное
    // Это гарантирует, что время сохранится именно таким, каким его выбрал пользователь
    // без конвертации часового пояса
    const appointmentDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

    // Проверяем, что дата не в прошлом
    if (appointmentDateTime < new Date()) {
      return NextResponse.json(
        { error: 'Нельзя записаться на прошедшую дату' },
        { status: 400 }
      );
    }

    // Проверяем доступность времени (передаем Date объект для дня)
    const dateForCheck = new Date(year, month - 1, day);
    const availabilityCheck = await isTimeSlotAvailable(
      validatedData.serviceId,
      dateForCheck,
      validatedData.time
    );

    if (!availabilityCheck.available) {
      return NextResponse.json(
        { error: availabilityCheck.reason || 'Время недоступно' },
        { status: 409 }
      );
    }

    // Находим или создаем пользователя по телефону
    // НЕ обновляем имя, если пользователь уже существует
    const phone = normalizedPhone;
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        // Не обновляем имя - оно будет храниться в clientName каждой записи
      },
      create: {
        phone,
        name: validatedData.name,
        role: 'CLIENT',
      },
    });

    // Создаем запись с clientName
    const appointment = await prisma.appointment.create({
      data: {
        date: appointmentDateTime,
        userId: user.id,
        serviceId: validatedData.serviceId,
        clientName: validatedData.name,
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
        { error: 'Ошибка валидации', details: error.issues },
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

