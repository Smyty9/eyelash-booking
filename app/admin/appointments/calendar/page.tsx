'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppointmentsCalendar } from '@/components/admin/appointments-calendar';
import { CalendarSkeleton } from '@/components/admin/calendar-skeleton';
import { AppointmentForm } from '@/components/admin/appointment-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarEvent,
  appointmentToCalendarEvent,
  timeBlockToCalendarEvent,
} from '@/lib/utils/calendar';
import { View } from 'react-big-calendar';

interface Appointment {
  id: string;
  date: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
  clientName: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  };
}

interface TimeBlock {
  id: string;
  type: 'DAY_OFF' | 'VACATION' | 'BREAK';
  startDateTime: string;
  endDateTime: string;
  description?: string | null;
}

interface Service {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });

  const fetchAppointments = async (start: Date, end: Date) => {
    try {
      const dateFrom = start.toISOString().split('T')[0];
      const dateTo = end.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      if (!response.ok) throw new Error('Ошибка при загрузке записей');
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchTimeBlocks = async (start: Date, end: Date) => {
    try {
      const dateFrom = start.toISOString().split('T')[0];
      const dateTo = end.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/time-blocks?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      if (!response.ok) throw new Error('Ошибка при загрузке блокировок');
      const data = await response.json();
      setTimeBlocks(data);
    } catch (error) {
      console.error('Error fetching time blocks:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Ошибка при загрузке услуг');
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAppointments(dateRange.start, dateRange.end),
        fetchTimeBlocks(dateRange.start, dateRange.end),
      ]);
      setLoading(false);
    };
    loadData();
  }, [dateRange]);

  const calendarEvents = useMemo(() => {
    const appointmentEvents = appointments.map(appointmentToCalendarEvent);
    const timeBlockEvents = timeBlocks.map(timeBlockToCalendarEvent);
    return [...appointmentEvents, ...timeBlockEvents];
  }, [appointments, timeBlocks]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    
    if (event.type === 'appointment') {
      // Находим полные данные записи
      const appointment = appointments.find((a) => a.id === event.id);
      if (appointment) {
        setEditingAppointment(appointment);
        setFormOpen(true);
      }
    }
    // Для блокировок показываем детали в диалоге
  };

  const handleEventDrop = async (event: CalendarEvent, start: Date, end: Date) => {
    if (event.type !== 'appointment') return;

    const appointment = appointments.find((a) => a.id === event.id);
    if (!appointment) return;

    // react-big-calendar передает даты в локальном времени браузера
    // Но эти даты уже были преобразованы из UTC для отображения
    // Теперь нужно преобразовать обратно в UTC для сохранения в БД
    
    const localStart = new Date(start);
    
    // Получаем локальные компоненты (это то время, которое видит пользователь)
    const localYear = localStart.getFullYear();
    const localMonth = localStart.getMonth();
    const localDay = localStart.getDate();
    const localHours = localStart.getHours();
    const localMinutes = localStart.getMinutes();
    
    // Создаем UTC дату из локальных значений (как при создании записи)
    // Локальные часы/минуты сохраняются как UTC часы/минуты
    const utcDate = new Date(Date.UTC(localYear, localMonth, localDay, localHours, localMinutes, 0, 0));
    
    // Вычисляем новое время в формате HH:MM (UTC часы и минуты)
    const hours = utcDate.getUTCHours().toString().padStart(2, '0');
    const minutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
    const newTime = `${hours}:${minutes}`;

    // Вычисляем новую дату (только дата, без времени) в UTC
    const newDate = new Date(Date.UTC(localYear, localMonth, localDay, 0, 0, 0, 0));

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: appointment.service.id,
          date: newDate.toISOString(),
          time: newTime,
          name: appointment.clientName || '',
          phone: appointment.user.phone,
          status: appointment.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при обновлении записи');
      }

      // Обновляем данные
      await fetchAppointments(dateRange.start, dateRange.end);
      toast.success('Запись успешно обновлена');
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении записи');
    }
  };

  const handleFormSuccess = () => {
    fetchAppointments(dateRange.start, dateRange.end);
    setFormOpen(false);
  };

  const handleRangeChange = (range: { start: Date; end: Date } | Date[] | undefined) => {
    if (!range) return;
    
    if (Array.isArray(range)) {
      // Для недельного/дневного вида
      const start = range[0];
      const end = range[range.length - 1];
      setDateRange({ start, end });
    } else {
      setDateRange(range);
    }
  };

  if (loading && appointments.length === 0 && timeBlocks.length === 0) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Календарь записей</h1>
          <p className="mt-2 text-sm text-gray-700">
            Визуализация записей и блокировок времени
          </p>
        </div>
      </div>

      {/* Легенда */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Легенда</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm text-gray-700">Подтверждено</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span className="text-sm text-gray-700">Ожидает</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500"></div>
            <span className="text-sm text-gray-700">Отменено</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500 opacity-70"></div>
            <span className="text-sm text-gray-700">Выходной</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500 opacity-70"></div>
            <span className="text-sm text-gray-700">Отпуск</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500 opacity-70"></div>
            <span className="text-sm text-gray-700">Перерыв</span>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <AppointmentsCalendar
          events={calendarEvents}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          onRangeChange={handleRangeChange}
          defaultView="month"
        />
      </div>

      {selectedEvent && selectedEvent.type === 'timeBlock' && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Детали блокировки</DialogTitle>
              <DialogDescription>
                {selectedEvent.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div>
                <strong>Тип:</strong> {selectedEvent.title}
              </div>
              <div>
                <strong>Начало:</strong>{' '}
                {selectedEvent.start ? new Date(selectedEvent.start).toLocaleString('ru-RU') : '-'}
              </div>
              <div>
                <strong>Окончание:</strong>{' '}
                {selectedEvent.end ? new Date(selectedEvent.end).toLocaleString('ru-RU') : '-'}
              </div>
              {selectedEvent.description && (
                <div>
                  <strong>Описание:</strong> {selectedEvent.description}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AppointmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editingAppointment}
        services={services}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

