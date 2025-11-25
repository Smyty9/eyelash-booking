'use client';

import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMediaQuery } from '@/hooks/use-media-query';
import { toast } from 'sonner';

interface BookingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceName: string;
}

export function BookingDrawer({ open, onOpenChange, serviceId, serviceName }: BookingDrawerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+7 ');
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Генерируем список дат на ближайшие 14 дней
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  // Форматирование даты для отображения
  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck.getTime() === today.getTime()) {
      return 'Сегодня';
    }
    if (dateToCheck.getTime() === tomorrow.getTime()) {
      return 'Завтра';
    }

    const day = date.getDate();
    const month = date.toLocaleDateString('ru-RU', { month: 'short' });
    return `${day} ${month}`;
  };

  // Маска для телефона
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.startsWith('7')) {
      value = value.substring(1);
    }
    
    let formatted = '+7 ';
    if (value.length > 0) {
      formatted += `(${value.substring(0, 3)}`;
    }
    if (value.length > 3) {
      formatted += `) ${value.substring(3, 6)}`;
    }
    if (value.length > 6) {
      formatted += `-${value.substring(6, 8)}`;
    }
    if (value.length > 8) {
      formatted += `-${value.substring(8, 10)}`;
    }
    
    setClientPhone(formatted);
  };

  // Обработка подтверждения записи
  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !clientName || clientPhone.length < 18) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD формат
          time: selectedTime,
          name: clientName,
          phone: clientPhone,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Обработка различных типов ошибок
        let errorMessage = 'Ошибка при создании записи';
        
        if (response.status === 400) {
          // Ошибка валидации
          if (data.details && Array.isArray(data.details)) {
            errorMessage = data.details.map((d: { message: string }) => d.message).join(', ');
          } else {
            errorMessage = data.error || 'Проверьте правильность введенных данных';
          }
        } else if (response.status === 409) {
          // Конфликт (время занято)
          errorMessage = data.error || 'Выбранное время уже занято. Пожалуйста, выберите другое время.';
        } else if (response.status === 404) {
          errorMessage = data.error || 'Услуга не найдена';
        } else {
          errorMessage = data.error || 'Произошла ошибка при создании записи';
        }
        
        throw new Error(errorMessage);
      }
      
      // Успешная запись
      const formattedDate = new Date(data.date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      });
      
      toast.success(
        `Запись успешно создана!\n\nУслуга: ${data.service.name}\nДата: ${formattedDate}\nВремя: ${selectedTime}`,
        { duration: 5000 }
      );
      
      // Обновляем список доступных слотов после успешной записи
      if (selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0];
        try {
          const slotsResponse = await fetch(
            `/api/appointments/available-slots?serviceId=${serviceId}&date=${dateString}`
          );
          if (slotsResponse.ok) {
            const slotsData = await slotsResponse.json();
            setAvailableSlots(slotsData.availableSlots || []);
            // Если выбранное время больше не доступно, сбрасываем выбор
            if (!slotsData.availableSlots?.includes(selectedTime)) {
              setSelectedTime(null);
            }
          }
        } catch (err) {
          console.error('Error refreshing slots:', err);
        }
      }
      
      // Закрываем drawer через 2 секунды после успешной записи
      setTimeout(() => {
        onOpenChange(false);
        // Сбрасываем все состояния после закрытия анимации
        setTimeout(() => {
          setSelectedDate(null);
          setSelectedTime(null);
          setClientName('');
          setClientPhone('+7 ');
          setAvailableSlots([]);
          setSlotsError(null);
        }, 300);
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при создании записи';
      toast.error(errorMessage);
      console.error('Error creating appointment:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка доступных слотов при выборе даты
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      setSelectedTime(null);
      setSlotsError(null);
      return;
    }

    const loadAvailableSlots = async () => {
      setIsLoadingSlots(true);
      setSelectedTime(null); // Сбрасываем выбранное время при смене даты
      setSlotsError(null);
      
      try {
        const dateString = selectedDate.toISOString().split('T')[0];
        const response = await fetch(
          `/api/appointments/available-slots?serviceId=${serviceId}&date=${dateString}`
        );
        
        if (!response.ok) {
          const data = await response.json();
          const errorMessage = data.error || 'Ошибка при загрузке доступного времени';
          setSlotsError(errorMessage);
          setAvailableSlots([]);
          return;
        }
        
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
        
        if (!data.availableSlots || data.availableSlots.length === 0) {
          setSlotsError('На эту дату нет доступного времени');
        }
      } catch (err) {
        console.error('Error loading available slots:', err);
        setSlotsError('Не удалось загрузить доступное время. Попробуйте позже.');
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadAvailableSlots();
  }, [selectedDate, serviceId]);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSelectedDate(null);
        setSelectedTime(null);
        setClientName('');
        setClientPhone('+7 ');
        setAvailableSlots([]);
        setSlotsError(null);
      }, 300);
    }
  }, [open]);

  const content = (
    <div className="px-4 pb-6">
      <div className="space-y-6">
        {/* Шаг 1: Выбор даты */}
        <div>
          <h3 className="text-sm font-medium mb-3">Выберите дату</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {dates.map((date) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              return (
                <button
                  key={date.toDateString()}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background border-input hover:bg-accent'
                    }
                  `}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </div>
                  <div>{formatDate(date)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Шаг 2: Выбор времени */}
        {selectedDate && (
          <div>
            <h3 className="text-sm font-medium mb-3">Выберите время</h3>
            {isLoadingSlots ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Загрузка доступного времени...
              </div>
            ) : slotsError ? (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-md text-center">
                {slotsError}
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                На эту дату нет доступного времени
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((time) => {
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`
                        py-2 px-3 rounded-lg border text-sm font-medium transition-colors
                        ${isSelected 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background border-input hover:bg-accent'
                        }
                      `}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Шаг 3: Контакты */}
        {selectedTime && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Ваши контакты</h3>
            
            <div className="space-y-2">
              <Label htmlFor="client-name">Имя</Label>
              <Input
                id="client-name"
                placeholder="Введите ваше имя"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-phone">Телефон</Label>
              <Input
                id="client-phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={clientPhone}
                onChange={handlePhoneChange}
                maxLength={18}
              />
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!clientName || clientPhone.length < 18 || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Отправка...
                </>
              ) : (
                'Подтвердить запись'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Запись на {serviceName}</DrawerTitle>
            <DrawerDescription>
              Выберите удобное время для записи
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Запись на {serviceName}</DialogTitle>
          <DialogDescription>
            Выберите удобное время для записи
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

