'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TimeBlocksTable } from '@/components/admin/time-blocks-table';
import { TimeBlocksTableSkeleton } from '@/components/admin/time-blocks-table-skeleton';
import { TimeBlockForm } from '@/components/admin/time-block-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface TimeBlock {
  id: string;
  type: 'DAY_OFF' | 'VACATION' | 'BREAK';
  startDateTime: Date;
  endDateTime: Date;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function TimeBlocksPage() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTimeBlock, setEditingTimeBlock] = useState<TimeBlock | null>(null);

  const fetchTimeBlocks = async () => {
    try {
      const response = await fetch('/api/time-blocks');
      if (!response.ok) throw new Error('Ошибка при загрузке блокировок');
      const data = await response.json();
      // Преобразуем строки дат в Date объекты
      const timeBlocksWithDates = data.map((block: any) => ({
        ...block,
        startDateTime: new Date(block.startDateTime),
        endDateTime: new Date(block.endDateTime),
        createdAt: new Date(block.createdAt),
        updatedAt: new Date(block.updatedAt),
      }));
      setTimeBlocks(timeBlocksWithDates);
    } catch (error) {
      console.error('Error fetching time blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeBlocks();
  }, []);

  const handleAdd = () => {
    setEditingTimeBlock(null);
    setFormOpen(true);
  };

  const handleEdit = (timeBlock: TimeBlock) => {
    setEditingTimeBlock(timeBlock);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    toast.promise(
      async () => {
        const response = await fetch(`/api/time-blocks/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Ошибка при удалении блокировки');
        }

        await fetchTimeBlocks();
      },
      {
        loading: 'Удаление блокировки...',
        success: 'Блокировка успешно удалена',
        error: (err) => err instanceof Error ? err.message : 'Ошибка при удалении блокировки',
      }
    );
  };

  const handleFormSuccess = () => {
    fetchTimeBlocks();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Блокировки времени</h1>
          <p className="mt-2 text-sm text-gray-700">
            Управление блокировками времени (выходные, отпуск, технические перерывы)
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить блокировку
          </Button>
        </div>
      </div>
      <div className="mt-8">
        {loading ? (
          <TimeBlocksTableSkeleton />
        ) : (
          <TimeBlocksTable
            timeBlocks={timeBlocks}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
      <TimeBlockForm
        open={formOpen}
        onOpenChange={setFormOpen}
        timeBlock={editingTimeBlock}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

