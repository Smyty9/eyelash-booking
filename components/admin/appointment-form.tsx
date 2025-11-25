'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

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

interface Service {
  id: string;
  name: string;
}

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  services: Service[];
  onSuccess: () => void;
}

export function AppointmentForm({
  open,
  onOpenChange,
  appointment,
  services,
  onSuccess,
}: AppointmentFormProps) {
  const [formData, setFormData] = useState({
    serviceId: '',
    date: '',
    time: '',
    name: '',
    phone: '',
    status: 'PENDING' as 'PENDING' | 'CONFIRMED' | 'CANCELED',
  });
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Загрузка доступных слотов
  const fetchAvailableSlots = async (serviceId: string, date: string) => {
    if (!serviceId || !date) {
      setAvailableSlots([]);
      return;
    }

    setIsLoadingSlots(true);
    try {
      const response = await fetch(
        `/api/appointments/available-slots?serviceId=${serviceId}&date=${date}`
      );
      if (!response.ok) throw new Error('Ошибка при загрузке слотов');
      const data = await response.json();
      setAvailableSlots(data.availableSlots || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Инициализация формы
  useEffect(() => {
    if (appointment && open) {
      // Используем UTC время для парсинга даты
      const date = new Date(appointment.date);
      // Получаем локальную дату в формате YYYY-MM-DD
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      // Получаем UTC время (без конвертации часового пояса)
      const timeStr = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
      
      // Форматируем телефон
      const phone = appointment.user.phone;
      const formattedPhone = phone.length === 10 
        ? `+7 (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6, 8)}-${phone.slice(8)}`
        : `+7 ${phone}`;

      setFormData({
        serviceId: appointment.service.id,
        date: dateStr,
        time: timeStr,
        name: appointment.clientName || '',
        phone: formattedPhone,
        status: appointment.status,
      });

      // Загружаем доступные слоты
      fetchAvailableSlots(appointment.service.id, dateStr);
    } else if (!appointment && open) {
      setFormData({
        serviceId: '',
        date: '',
        time: '',
        name: '',
        phone: '+7 ',
        status: 'PENDING',
      });
      setAvailableSlots([]);
    }
  }, [appointment, open]);

  // Загрузка слотов при изменении даты или услуги
  useEffect(() => {
    if (open && formData.serviceId && formData.date) {
      fetchAvailableSlots(formData.serviceId, formData.date);
    }
  }, [formData.serviceId, formData.date, open]);

  // Маска для телефона
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Удаляем все нецифровые символы кроме +
    value = value.replace(/[^\d+]/g, '');
    
    // Если начинается не с +7, добавляем +7
    if (!value.startsWith('+7')) {
      value = '+7 ' + value.replace(/\+/g, '');
    }
    
    // Ограничиваем длину
    if (value.length > 18) {
      value = value.slice(0, 18);
    }
    
    // Форматируем: +7 (XXX) XXX-XX-XX
    if (value.length > 3) {
      const digits = value.replace(/\D/g, '').slice(1); // Убираем +7
      if (digits.length > 0) {
        let formatted = '+7';
        if (digits.length > 0) {
          formatted += ` (${digits.slice(0, 3)}`;
        }
        if (digits.length > 3) {
          formatted += `) ${digits.slice(3, 6)}`;
        }
        if (digits.length > 6) {
          formatted += `-${digits.slice(6, 8)}`;
        }
        if (digits.length > 8) {
          formatted += `-${digits.slice(8, 10)}`;
        }
        value = formatted;
      }
    }
    
    setFormData({ ...formData, phone: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Валидация
      if (!formData.serviceId) {
        throw new Error('Выберите услугу');
      }
      if (!formData.date) {
        throw new Error('Выберите дату');
      }
      if (!formData.time) {
        throw new Error('Выберите время');
      }
      if (!formData.name.trim()) {
        throw new Error('Введите имя');
      }
      if (!formData.phone.replace(/\D/g, '').match(/^7\d{10}$/)) {
        throw new Error('Введите корректный телефон');
      }

      const payload: any = {
        serviceId: formData.serviceId,
        date: formData.date,
        time: formData.time,
        name: formData.name.trim(),
        phone: formData.phone,
        status: formData.status,
      };

      const response = await fetch(`/api/appointments/${appointment!.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении');
      }

      toast.success('Запись успешно обновлена');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать запись</DialogTitle>
          <DialogDescription>
            Внесите изменения в данные записи
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Услуга */}
            <div className="grid gap-2">
              <Label htmlFor="serviceId">
                Услуга <span className="text-red-500">*</span>
              </Label>
              <select
                id="serviceId"
                value={formData.serviceId}
                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value, time: '' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="">Выберите услугу</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Дата */}
            <div className="grid gap-2">
              <Label htmlFor="date">
                Дата <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })}
                required
              />
            </div>

            {/* Время */}
            <div className="grid gap-2">
              <Label htmlFor="time">
                Время <span className="text-red-500">*</span>
              </Label>
              {isLoadingSlots ? (
                <Skeleton className="h-10 w-full" />
              ) : availableSlots.length === 0 && formData.serviceId && formData.date ? (
                <div className="text-sm text-destructive py-2">
                  На эту дату нет доступного времени
                </div>
              ) : (
                <select
                  id="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                  disabled={!formData.serviceId || !formData.date || isLoadingSlots}
                >
                  <option value="">Выберите время</option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Имя */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Имя клиента <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Телефон */}
            <div className="grid gap-2">
              <Label htmlFor="phone">
                Телефон <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="+7 (XXX) XXX-XX-XX"
                required
              />
            </div>

            {/* Статус */}
            <div className="grid gap-2">
              <Label htmlFor="status">Статус</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'PENDING' | 'CONFIRMED' | 'CANCELED',
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="PENDING">Ожидает</option>
                <option value="CONFIRMED">Подтверждена</option>
                <option value="CANCELED">Отменена</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

