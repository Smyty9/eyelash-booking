'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsFormSkeleton } from '@/components/admin/settings-form-skeleton';

interface Settings {
  id: string;
  workStartHour: number;
  workEndHour: number;
  timeSlotIntervalMinutes: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    workStartHour: 10,
    workEndHour: 18,
    timeSlotIntervalMinutes: 30,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Ошибка при загрузке настроек');
      const data = await response.json();
      setSettings(data);
      setFormData({
        workStartHour: data.workStartHour,
        workEndHour: data.workEndHour,
        timeSlotIntervalMinutes: data.timeSlotIntervalMinutes,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении настроек');
      }

      const data = await response.json();
      setSettings(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SettingsFormSkeleton />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>
          <p className="mt-2 text-sm text-gray-700">
            Управление рабочим временем и интервалами между записями
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border space-y-6">
          {/* Начало рабочего дня */}
          <div className="grid gap-2">
            <Label htmlFor="workStartHour">
              Начало рабочего дня (час) <span className="text-red-500">*</span>
            </Label>
            <select
              id="workStartHour"
              value={formData.workStartHour}
              onChange={(e) =>
                setFormData({ ...formData, workStartHour: parseInt(e.target.value) })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                <option key={hour} value={hour}>
                  {hour}:00
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500">
              Выберите час начала рабочего дня (от 8:00 до 20:00)
            </p>
          </div>

          {/* Конец рабочего дня */}
          <div className="grid gap-2">
            <Label htmlFor="workEndHour">
              Конец рабочего дня (час) <span className="text-red-500">*</span>
            </Label>
            <select
              id="workEndHour"
              value={formData.workEndHour}
              onChange={(e) =>
                setFormData({ ...formData, workEndHour: parseInt(e.target.value) })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              {Array.from({ length: 11 }, (_, i) => i + 14).map((hour) => (
                <option key={hour} value={hour}>
                  {hour}:00
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500">
              Выберите час окончания рабочего дня (от 14:00 до 24:00)
            </p>
          </div>

          {/* Интервал между слотами */}
          <div className="grid gap-2">
            <Label htmlFor="timeSlotIntervalMinutes">
              Интервал между временными слотами (минуты) <span className="text-red-500">*</span>
            </Label>
            <select
              id="timeSlotIntervalMinutes"
              value={formData.timeSlotIntervalMinutes}
              onChange={(e) =>
                setFormData({ ...formData, timeSlotIntervalMinutes: parseInt(e.target.value) })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              <option value="15">15 минут</option>
              <option value="30">30 минут</option>
              <option value="60">60 минут</option>
            </select>
            <p className="text-sm text-gray-500">
              Интервал между доступными временными слотами для записи
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded border border-green-200">
              Настройки успешно сохранены!
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

