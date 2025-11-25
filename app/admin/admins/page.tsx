'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AdminsTable } from '@/components/admin/admins-table';
import { AdminsTableSkeleton } from '@/components/admin/admins-table-skeleton';
import { AdminForm } from '@/components/admin/admin-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Admin {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  createdAt: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admins');
      if (!response.ok) throw new Error('Ошибка при загрузке администраторов');
      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Ошибка при загрузке списка администраторов');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserPhone(data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchAdmins();
  }, []);

  const handleAdd = () => {
    setFormOpen(true);
  };

  const handleDelete = async (phone: string) => {
    toast.promise(
      async () => {
        const encodedPhone = encodeURIComponent(phone);
        const response = await fetch(`/api/admins/${encodedPhone}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Ошибка при удалении администратора');
        }

        await fetchAdmins();
      },
      {
        loading: 'Удаление администратора...',
        success: 'Администратор успешно удален',
        error: (err) => err instanceof Error ? err.message : 'Ошибка при удалении администратора',
      }
    );
  };

  const handleFormSuccess = () => {
    fetchAdmins();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Администраторы</h1>
          <p className="mt-2 text-sm text-gray-700">
            Управление администраторами системы
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить администратора
          </Button>
        </div>
      </div>
      <div className="mt-8">
        {loading ? (
          <AdminsTableSkeleton />
        ) : (
          <AdminsTable
            admins={admins}
            currentUserPhone={currentUserPhone}
            onDelete={handleDelete}
          />
        )}
      </div>
      <AdminForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

