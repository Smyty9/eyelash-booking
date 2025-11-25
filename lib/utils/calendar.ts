import { Event } from 'react-big-calendar';

export interface CalendarAppointment extends Event {
  id: string;
  type: 'appointment';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
  clientName: string | null;
  serviceName: string;
  serviceDurationMinutes: number;
  phone: string;
  resource?: any;
}

export interface CalendarTimeBlock extends Event {
  id: string;
  type: 'timeBlock';
  blockType: 'DAY_OFF' | 'VACATION' | 'BREAK';
  description?: string | null;
  resource?: any;
}

export type CalendarEvent = CalendarAppointment | CalendarTimeBlock;

interface AppointmentData {
  id: string;
  date: string | Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
  clientName: string | null;
  user: {
    phone: string;
  };
  service: {
    name: string;
    durationMinutes: number;
  };
}

interface TimeBlockData {
  id: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  type: 'DAY_OFF' | 'VACATION' | 'BREAK';
  description?: string | null;
}

/**
 * Преобразует запись (appointment) в формат для календаря
 * Данные из БД приходят в UTC, но мы отображаем их как локальное время
 * (UTC компоненты используются как локальные значения)
 */
export function appointmentToCalendarEvent(appointment: AppointmentData): CalendarAppointment {
  // Данные из API приходят как ISO строка в UTC (например "2024-01-01T13:00:00.000Z")
  const utcDate = new Date(appointment.date);
  
  // Получаем UTC компоненты
  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = utcDate.getUTCMonth();
  const utcDay = utcDate.getUTCDate();
  const utcHours = utcDate.getUTCHours();
  const utcMinutes = utcDate.getUTCMinutes();
  
  // Создаем локальную дату с UTC значениями (чтобы отображалось как было сохранено)
  // Это игнорирует часовой пояс и показывает UTC время как локальное
  const localStartDate = new Date(utcYear, utcMonth, utcDay, utcHours, utcMinutes, 0, 0);
  
  // Вычисляем время окончания
  const localEndDate = new Date(localStartDate);
  localEndDate.setMinutes(localEndDate.getMinutes() + appointment.service.durationMinutes);

  return {
    id: appointment.id,
    type: 'appointment',
    title: appointment.clientName || 'Без имени',
    start: localStartDate,
    end: localEndDate,
    status: appointment.status,
    clientName: appointment.clientName,
    serviceName: appointment.service.name,
    serviceDurationMinutes: appointment.service.durationMinutes,
    phone: appointment.user.phone,
  };
}

/**
 * Преобразует блокировку времени в формат для календаря
 * Данные из БД приходят в UTC, но мы отображаем их как локальное время
 */
export function timeBlockToCalendarEvent(timeBlock: TimeBlockData): CalendarTimeBlock {
  const startUtc = new Date(timeBlock.startDateTime);
  const endUtc = new Date(timeBlock.endDateTime);
  
  // Получаем UTC компоненты начала
  const startYear = startUtc.getUTCFullYear();
  const startMonth = startUtc.getUTCMonth();
  const startDay = startUtc.getUTCDate();
  const startHours = startUtc.getUTCHours();
  const startMinutes = startUtc.getUTCMinutes();
  
  // Получаем UTC компоненты окончания
  const endYear = endUtc.getUTCFullYear();
  const endMonth = endUtc.getUTCMonth();
  const endDay = endUtc.getUTCDate();
  const endHours = endUtc.getUTCHours();
  const endMinutes = endUtc.getUTCMinutes();
  
  // Создаем локальные даты с UTC значениями
  const localStartDate = new Date(startYear, startMonth, startDay, startHours, startMinutes, 0, 0);
  const localEndDate = new Date(endYear, endMonth, endDay, endHours, endMinutes, 0, 0);

  const typeLabels: Record<string, string> = {
    DAY_OFF: 'Выходной',
    VACATION: 'Отпуск',
    BREAK: 'Технический перерыв',
  };

  return {
    id: timeBlock.id,
    type: 'timeBlock',
    title: typeLabels[timeBlock.type] || timeBlock.type,
    start: localStartDate,
    end: localEndDate,
    blockType: timeBlock.type,
    description: timeBlock.description,
  };
}

/**
 * Получает цвет события для календаря
 */
export function getEventStyle(event: CalendarEvent) {
  if (event.type === 'appointment') {
    const appointment = event as CalendarAppointment;
    switch (appointment.status) {
      case 'CONFIRMED':
        return {
          style: {
            backgroundColor: '#10b981', // green-500
            borderColor: '#059669', // green-600
            color: 'white',
          },
        };
      case 'PENDING':
        return {
          style: {
            backgroundColor: '#f59e0b', // amber-500
            borderColor: '#d97706', // amber-600
            color: 'white',
          },
        };
      case 'CANCELED':
        return {
          style: {
            backgroundColor: '#6b7280', // gray-500
            borderColor: '#4b5563', // gray-600
            color: 'white',
            textDecoration: 'line-through',
          },
        };
      default:
        return {};
    }
  } else if (event.type === 'timeBlock') {
    const timeBlock = event as CalendarTimeBlock;
    switch (timeBlock.blockType) {
      case 'DAY_OFF':
        return {
          style: {
            backgroundColor: '#ef4444', // red-500
            borderColor: '#dc2626', // red-600
            color: 'white',
            opacity: 0.7,
          },
        };
      case 'VACATION':
        return {
          style: {
            backgroundColor: '#3b82f6', // blue-500
            borderColor: '#2563eb', // blue-600
            color: 'white',
            opacity: 0.7,
          },
        };
      case 'BREAK':
        return {
          style: {
            backgroundColor: '#eab308', // yellow-500
            borderColor: '#ca8a04', // yellow-600
            color: 'white',
            opacity: 0.7,
          },
        };
      default:
        return {};
    }
  }
  return {};
}
