'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Service {
  id: string;
  name: string;
}

interface Filters {
  status: string;
  serviceId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

interface AppointmentFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  services: Service[];
}

export function AppointmentFilters({
  filters,
  onFiltersChange,
  services,
}: AppointmentFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFiltersChange({ ...filters, search: searchValue });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    const resetFilters = {
      status: 'all',
      serviceId: '',
      dateFrom: '',
      dateTo: '',
      search: '',
    };
    setSearchValue('');
    onFiltersChange(resetFilters);
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.serviceId !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.search !== '';

  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Фильтры</h2>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="h-4 w-4 mr-1" />
            Сбросить
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Поиск */}
        <div className="lg:col-span-2">
          <Label htmlFor="search">Поиск по имени/телефону</Label>
          <Input
            id="search"
            placeholder="Введите имя или телефон..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        {/* Статус */}
        <div>
          <Label htmlFor="status">Статус</Label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">Все</option>
            <option value="PENDING">Ожидает</option>
            <option value="CONFIRMED">Подтверждена</option>
            <option value="CANCELED">Отменена</option>
          </select>
        </div>

        {/* Услуга */}
        <div>
          <Label htmlFor="service">Услуга</Label>
          <select
            id="service"
            value={filters.serviceId}
            onChange={(e) => handleFilterChange('serviceId', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Все услуги</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        {/* Дата от */}
        <div>
          <Label htmlFor="dateFrom">Дата от</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>

        {/* Дата до */}
        <div>
          <Label htmlFor="dateTo">Дата до</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

