'use client';

import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, View, ViewProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent, getEventStyle } from '@/lib/utils/calendar';

const locales = {
  'ru-RU': ru,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ru }),
  getDay,
  locales,
});

interface AppointmentsCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onEventDrop?: (event: CalendarEvent, start: Date, end: Date) => void;
  onRangeChange?: (range: { start: Date; end: Date } | Date[]) => void;
  defaultView?: View;
  defaultDate?: Date;
}

export function AppointmentsCalendar({
  events,
  onSelectEvent,
  onEventDrop,
  onRangeChange,
  defaultView = 'month',
  defaultDate = new Date(),
}: AppointmentsCalendarProps) {
  const [currentView, setCurrentView] = useState<View>(defaultView);
  const [currentDate, setCurrentDate] = useState<Date>(defaultDate);

  const { defaultDate: memoizedDefaultDate, defaultView: memoizedDefaultView } = useMemo(
    () => ({
      defaultDate,
      defaultView,
    }),
    [defaultDate, defaultView]
  );

  const handleEventDrop = ({ event, start, end }: any) => {
    if (onEventDrop && event.type === 'appointment') {
      onEventDrop(event, start, end);
    }
  };

  const handleRangeChange = (range: { start: Date; end: Date } | Date[] | undefined, view?: View) => {
    if (!range || !onRangeChange) return;
    
    if (Array.isArray(range)) {
      // Для недельного/дневного вида - массив дат
      if (range.length > 0) {
        const start = range[0];
        const end = range[range.length - 1];
        onRangeChange({ start, end });
      }
    } else if ('start' in range && 'end' in range) {
      // Для месячного вида - объект с start и end
      onRangeChange(range);
    }
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  return (
    <div className="h-[600px] w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        date={currentDate}
        view={currentView}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onRangeChange={handleRangeChange}
        onSelectEvent={onSelectEvent}
        onEventDrop={handleEventDrop}
        eventPropGetter={getEventStyle}
        draggableAccessor={(event) => event.type === 'appointment'}
        resizableAccessor={(event) => false}
        messages={{
          next: 'Следующий',
          previous: 'Предыдущий',
          today: 'Сегодня',
          month: 'Месяц',
          week: 'Неделя',
          day: 'День',
          agenda: 'Повестка',
          date: 'Дата',
          time: 'Время',
          event: 'Событие',
          noEventsInRange: 'Нет событий в этом диапазоне',
        }}
        culture="ru-RU"
      />
    </div>
  );
}

