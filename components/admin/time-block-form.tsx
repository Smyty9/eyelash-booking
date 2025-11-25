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
import { toast } from 'sonner';

interface TimeBlock {
  id: string;
  type: 'DAY_OFF' | 'VACATION' | 'BREAK';
  startDateTime: Date;
  endDateTime: Date;
  description?: string | null;
}

interface TimeBlockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeBlock?: TimeBlock | null;
  onSuccess: () => void;
}

// Преобразует Date в формат для date input (YYYY-MM-DD)
const formatDateForInput = (date: Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Преобразует Date в формат для time input (HH:MM) в локальном времени
const formatTimeForInput = (date: Date): string => {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Объединяет дату и время в UTC DateTime
// Интерпретирует введенные дату и время как локальные
// JavaScript автоматически преобразует в UTC при сериализации
const combineDateTimeToUTC = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Создаем Date объект в локальном времени
  // При сериализации в ISO строку он автоматически преобразуется в UTC
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

export function TimeBlockForm({ open, onOpenChange, timeBlock, onSuccess }: TimeBlockFormProps) {
  const [formData, setFormData] = useState({
    type: 'DAY_OFF' as 'DAY_OFF' | 'VACATION' | 'BREAK',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timeBlock && open) {
      const startDate = new Date(timeBlock.startDateTime);
      const endDate = new Date(timeBlock.endDateTime);
      
      setFormData({
        type: timeBlock.type,
        startDate: formatDateForInput(startDate),
        startTime: formatTimeForInput(startDate),
        endDate: formatDateForInput(endDate),
        endTime: formatTimeForInput(endDate),
        description: timeBlock.description || '',
      });
    } else if (open) {
      // Значения по умолчанию для новой блокировки
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setFormData({
        type: 'DAY_OFF',
        startDate: formatDateForInput(now),
        startTime: '10:00',
        endDate: formatDateForInput(tomorrow),
        endTime: '18:00',
        description: '',
      });
    }
  }, [timeBlock, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Валидация на клиенте
      if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
        throw new Error('Все поля даты и времени обязательны');
      }

      const startDateTime = combineDateTimeToUTC(formData.startDate, formData.startTime);
      const endDateTime = combineDateTimeToUTC(formData.endDate, formData.endTime);

      if (endDateTime <= startDateTime) {
        throw new Error('Дата окончания должна быть позже даты начала');
      }

      const payload = {
        type: formData.type,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        description: formData.description || undefined,
      };

      const url = timeBlock
        ? `/api/time-blocks/${timeBlock.id}`
        : '/api/time-blocks';
      const method = timeBlock ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении');
      }

      toast.success(timeBlock ? 'Блокировка успешно обновлена' : 'Блокировка успешно создана');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {timeBlock ? 'Редактировать блокировку' : 'Добавить блокировку'}
          </DialogTitle>
          <DialogDescription>
            {timeBlock
              ? 'Внесите изменения в данные блокировки'
              : 'Заполните форму для добавления новой блокировки времени'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">
                Тип блокировки <span className="text-red-500">*</span>
              </Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'DAY_OFF' | 'VACATION' | 'BREAK' })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="DAY_OFF">Выходной</option>
                <option value="VACATION">Отпуск</option>
                <option value="BREAK">Технический перерыв</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">
                  Дата начала <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startTime">
                  Время начала <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="endDate">
                  Дата окончания <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">
                  Время окончания <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
              />
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
              {loading ? 'Сохранение...' : timeBlock ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

