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
import { Trash2 } from 'lucide-react';
import { formatPhone } from '@/lib/utils/phone';

interface Admin {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  createdAt: string;
}

interface AdminsTableProps {
  admins: Admin[];
  currentUserPhone: string;
  onDelete: (phone: string) => void;
}

export function AdminsTable({ admins, currentUserPhone, onDelete }: AdminsTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (admins.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Администраторы не найдены. Добавьте первого администратора.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Дата создания</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => {
            const isCurrentUser = admin.phone === currentUserPhone;
            return (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">{admin.name || '-'}</TableCell>
                <TableCell>{formatPhone(admin.phone)}</TableCell>
                <TableCell>{admin.email || '-'}</TableCell>
                <TableCell>{formatDate(admin.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {!isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(admin.phone)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  {isCurrentUser && (
                    <span className="text-sm text-gray-400">Текущий пользователь</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

