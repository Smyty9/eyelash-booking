'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';

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
  createdAt: string;
  updatedAt: string;
}

interface AppointmentsTableProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELED') => void;
}

export function AppointmentsTable({
  appointments,
  onEdit,
  onDelete,
  onStatusChange,
}: AppointmentsTableProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      // Используем UTC методы для получения времени без конвертации часового пояса
      time: `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`,
    };
  };

  const formatPhone = (phone: string) => {
    // Форматируем телефон в формат +7 (XXX) XXX-XX-XX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  const getStatusBadge = (status: 'PENDING' | 'CONFIRMED' | 'CANCELED') => {
    const statusConfig = {
      PENDING: {
        label: 'Ожидает',
        className: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
      },
      CONFIRMED: {
        label: 'Подтверждена',
        className: 'bg-green-100 text-green-800',
        icon: CheckCircle2,
      },
      CANCELED: {
        label: 'Отменена',
        className: 'bg-red-100 text-red-800',
        icon: XCircle,
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Записи не найдены.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата и время</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Услуга</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => {
            const { date, time } = formatDateTime(appointment.date);
            return (
              <TableRow key={appointment.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{date}</div>
                    <div className="text-sm text-gray-500">{time}</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {appointment.clientName || '-'}
                </TableCell>
                <TableCell>{formatPhone(appointment.user.phone)}</TableCell>
                <TableCell>{appointment.service.name}</TableCell>
                <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {appointment.status === 'PENDING' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(appointment.id, 'CONFIRMED')}
                        title="Подтвердить"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {appointment.status !== 'CANCELED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(appointment.id, 'CANCELED')}
                        title="Отменить"
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(appointment)}
                      title="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(appointment.id)}
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

