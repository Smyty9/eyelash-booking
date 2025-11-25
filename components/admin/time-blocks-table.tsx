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
import { Pencil, Trash2 } from 'lucide-react';

interface TimeBlock {
  id: string;
  type: 'DAY_OFF' | 'VACATION' | 'BREAK';
  startDateTime: Date;
  endDateTime: Date;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TimeBlocksTableProps {
  timeBlocks: TimeBlock[];
  onEdit: (timeBlock: TimeBlock) => void;
  onDelete: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  DAY_OFF: 'Выходной',
  VACATION: 'Отпуск',
  BREAK: 'Технический перерыв',
};

const typeColors: Record<string, string> = {
  DAY_OFF: 'bg-red-100 text-red-800',
  VACATION: 'bg-blue-100 text-blue-800',
  BREAK: 'bg-yellow-100 text-yellow-800',
};

export function TimeBlocksTable({ timeBlocks, onEdit, onDelete }: TimeBlocksTableProps) {
  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const formatDuration = (start: Date, end: Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours} ч ${diffMinutes > 0 ? `${diffMinutes} мин` : ''}`;
    }
    return `${diffMinutes} мин`;
  };

  if (timeBlocks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Блокировки не найдены. Добавьте первую блокировку.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Тип</TableHead>
            <TableHead>Начало</TableHead>
            <TableHead>Окончание</TableHead>
            <TableHead>Длительность</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timeBlocks.map((timeBlock) => (
            <TableRow key={timeBlock.id}>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    typeColors[timeBlock.type] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {typeLabels[timeBlock.type] || timeBlock.type}
                </span>
              </TableCell>
              <TableCell>{formatDateTime(timeBlock.startDateTime)}</TableCell>
              <TableCell>{formatDateTime(timeBlock.endDateTime)}</TableCell>
              <TableCell>
                {formatDuration(timeBlock.startDateTime, timeBlock.endDateTime)}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {timeBlock.description || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(timeBlock)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(timeBlock.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

