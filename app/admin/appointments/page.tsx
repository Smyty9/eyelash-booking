'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AppointmentsTable } from '@/components/admin/appointments-table';
import { AppointmentsTableSkeleton } from '@/components/admin/appointments-table-skeleton';
import { AppointmentFilters } from '@/components/admin/appointment-filters';
import { AppointmentForm } from '@/components/admin/appointment-form';
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
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  name: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  // Фильтры
  const [filters, setFilters] = useState({
    status: 'all',
    serviceId: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.serviceId) params.append('serviceId', filters.serviceId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/appointments?${params.toString()}`);
      if (!response.ok) throw new Error('Ошибка при загрузке записей');
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
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
    fetchAppointments();
  }, [filters]);

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    toast.promise(
      async () => {
        const response = await fetch(`/api/appointments/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Ошибка при удалении записи');
        }

        await fetchAppointments();
      },
      {
        loading: 'Удаление записи...',
        success: 'Запись успешно удалена',
        error: (err) => err instanceof Error ? err.message : 'Ошибка при удалении записи',
      }
    );
  };

  const handleStatusChange = async (id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELED') => {
    const statusLabels: Record<'PENDING' | 'CONFIRMED' | 'CANCELED', string> = {
      PENDING: 'ожидает',
      CONFIRMED: 'подтверждена',
      CANCELED: 'отменена',
    };

    toast.promise(
      async () => {
        const response = await fetch(`/api/appointments/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Ошибка при изменении статуса');
        }

        await fetchAppointments();
      },
      {
        loading: 'Изменение статуса...',
        success: `Запись ${statusLabels[status]}`,
        error: (err) => err instanceof Error ? err.message : 'Ошибка при изменении статуса',
      }
    );
  };

  const handleFormSuccess = () => {
    fetchAppointments();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Записи</h1>
          <p className="mt-2 text-sm text-gray-700">
            Управление записями клиентов
          </p>
        </div>
      </div>
      
      <div className="mt-8">
        <AppointmentFilters
          filters={filters}
          onFiltersChange={setFilters}
          services={services}
        />
      </div>

      <div className="mt-8">
        {loading && appointments.length === 0 ? (
          <AppointmentsTableSkeleton />
        ) : (
          <AppointmentsTable
            appointments={appointments}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

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

