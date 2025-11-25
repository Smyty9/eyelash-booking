import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/utils/auth';

const updateAppointmentSchema = z.object({
  serviceId: z.string().uuid('Неверный ID услуги').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты (YYYY-MM-DD)').optional(),
  time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Неверный формат времени (HH:MM)').optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELED']).optional(),
  name: z.string().min(1, 'Имя обязательно').optional(),
  phone: z.string().min(1, 'Телефон обязателен').optional(),
});

// Нормализация телефона
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('7') || digits.startsWith('8')) {
    return digits.substring(1);
  }
  return digits;
}

// Проверка доступности времени (исключая текущую запись)
// Проверяет все записи на дату, независимо от услуги
async function isTimeSlotAvailable(
  appointmentId: string,
  serviceId: string,
  appointmentDate: Date,
  appointmentTime: string
): Promise<{ available: boolean; reason?: string }> {
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

  // Парсим дату и время в локальное время
  const [year, month, day] = [
    appointmentDate.getFullYear(),
    appointmentDate.getMonth(),
    appointmentDate.getDate(),
  ];
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const startDateTime = new Date(year, month, day, hours, minutes, 0, 0);

  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + service.durationMinutes);

  const dayStart = new Date(year, month, day, 0, 0, 0, 0);
  const dayEnd = new Date(year, month, day, 23, 59, 59, 999);

  // Находим ВСЕ записи на эту дату, исключая текущую запись
  // Не фильтруем по serviceId, чтобы проверить пересечения со всеми услугами
  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      id: { not: appointmentId },
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

  // Проверяем пересечения со всеми записями на эту дату
  for (const appointment of conflictingAppointments) {
    const existingStart = new Date(appointment.date);
    const existingEnd = new Date(existingStart);
    existingEnd.setMinutes(existingEnd.getMinutes() + appointment.service.durationMinutes);

    // Проверяем пересечение: новое время не должно пересекаться с существующим
    if (
      (startDateTime >= existingStart && startDateTime < existingEnd) ||
      (existingStart >= startDateTime && existingStart < endDateTime) ||
      (startDateTime <= existingStart && endDateTime >= existingEnd)
    ) {
      return {
        available: false,
        reason: 'Время уже занято другой записью',
      };
    }
  }

  return { available: true };
}

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
    const validatedData = updateAppointmentSchema.parse(body);

    // Получаем текущую запись
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        user: true,
      },
    });

    if (!currentAppointment) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      );
    }

    // Определяем serviceId для проверки доступности
    const targetServiceId = validatedData.serviceId || currentAppointment.serviceId;
    
    // Если изменяется дата или время, проверяем доступность
    if (validatedData.time || validatedData.date) {
      let dateToCheck: Date;
      if (validatedData.date) {
        // Парсим дату из строки YYYY-MM-DD в UTC
        const [year, month, day] = validatedData.date.split('-').map(Number);
        dateToCheck = new Date(Date.UTC(year, month - 1, day));
      } else {
        // Извлекаем UTC дату из текущей записи
        const currentDateObj = new Date(currentAppointment.date);
        dateToCheck = new Date(Date.UTC(
          currentDateObj.getUTCFullYear(),
          currentDateObj.getUTCMonth(),
          currentDateObj.getUTCDate()
        ));
      }
      
      const time = validatedData.time || 
        `${currentAppointment.date.getHours().toString().padStart(2, '0')}:${currentAppointment.date.getMinutes().toString().padStart(2, '0')}`;
      
      const availabilityCheck = await isTimeSlotAvailable(
        id,
        targetServiceId,
        dateToCheck,
        time
      );

      if (!availabilityCheck.available) {
        return NextResponse.json(
          { error: availabilityCheck.reason || 'Время недоступно' },
          { status: 409 }
        );
      }
    }

    // Обновляем дату и время если они изменены
    let appointmentDateTime = currentAppointment.date;
    if (validatedData.date || validatedData.time) {
      let year: number, month: number, day: number;
      if (validatedData.date) {
        // Парсим дату из строки YYYY-MM-DD
        const dateParts = validatedData.date.split('-').map(Number);
        year = dateParts[0];
        month = dateParts[1] - 1;
        day = dateParts[2];
      } else {
        // Используем текущую дату из записи (UTC)
        const currentDateObj = new Date(currentAppointment.date);
        year = currentDateObj.getUTCFullYear();
        month = currentDateObj.getUTCMonth();
        day = currentDateObj.getUTCDate();
      }
      
      let hours: number, minutes: number;
      if (validatedData.time) {
        // Парсим время из строки HH:MM
        const timeParts = validatedData.time.split(':').map(Number);
        hours = timeParts[0];
        minutes = timeParts[1];
      } else {
        // Используем текущее время из записи (UTC)
        const currentDateObj = new Date(currentAppointment.date);
        hours = currentDateObj.getUTCHours();
        minutes = currentDateObj.getUTCMinutes();
      }
      
      // Создаем новую дату-время в UTC
      appointmentDateTime = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
    }

    // Обновляем пользователя только если изменен телефон
    let userId = currentAppointment.userId;
    if (validatedData.phone) {
      const normalizedPhone = normalizePhone(validatedData.phone);
      if (normalizedPhone.length !== 10) {
        return NextResponse.json(
          { error: 'Неверный формат телефона. Ожидается 10 цифр' },
          { status: 400 }
        );
      }

      const user = await prisma.user.upsert({
        where: { phone: normalizedPhone },
        update: {
          // Не обновляем имя - оно хранится в clientName записи
        },
        create: {
          phone: normalizedPhone,
          name: validatedData.name || currentAppointment.clientName || '',
          role: 'CLIENT',
        },
      });
      userId = user.id;
    }

    // Обновляем запись
    const updateData: any = {};
    if (validatedData.serviceId) updateData.serviceId = validatedData.serviceId;
    if (validatedData.date || validatedData.time) {
      updateData.date = appointmentDateTime;
    }
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.name) updateData.clientName = validatedData.name;
    if (userId !== currentAppointment.userId) updateData.userId = userId;

    // Проверяем, что есть что обновлять
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Нет данных для обновления' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(appointment);
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
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении записи' },
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

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      );
    }

    await prisma.appointment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      );
    }
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении записи' },
      { status: 500 }
    );
  }
}

