'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ServicesTable } from '@/components/admin/services-table';
import { ServicesTableSkeleton } from '@/components/admin/services-table-skeleton';
import { ServiceForm } from '@/components/admin/service-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Ошибка при загрузке услуг');
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleAdd = () => {
    setEditingService(null);
    setFormOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    toast.promise(
      async () => {
        const response = await fetch(`/api/services/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Ошибка при удалении услуги');
        }

        await fetchServices();
      },
      {
        loading: 'Удаление услуги...',
        success: 'Услуга успешно удалена',
        error: (err) => err instanceof Error ? err.message : 'Ошибка при удалении услуги',
      }
    );
  };

  const handleFormSuccess = () => {
    fetchServices();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Услуги</h1>
          <p className="mt-2 text-sm text-gray-700">
            Управление услугами и их настройками
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить услугу
          </Button>
        </div>
      </div>
      <div className="mt-8">
        {loading ? (
          <ServicesTableSkeleton />
        ) : (
          <ServicesTable
            services={services}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
      <ServiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editingService}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

