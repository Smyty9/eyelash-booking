'use client';

import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
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

// Обертываем Calendar в HOC для drag and drop с правильной типизацией
const DragAndDropCalendar = withDragAndDrop<CalendarEvent, object>(Calendar);

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

  const handleEventDrop = ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
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

  const handleSelectEvent = (event: CalendarEvent, e: React.SyntheticEvent) => {
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  return (
    <div className="h-[600px] w-full">
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor={(event: CalendarEvent) => event.start}
        endAccessor={(event: CalendarEvent) => event.end}
        style={{ height: '100%' }}
        date={currentDate}
        view={currentView}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onRangeChange={handleRangeChange}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        eventPropGetter={getEventStyle}
        draggableAccessor={(event: CalendarEvent) => event.type === 'appointment'}
        resizableAccessor={() => false}
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

