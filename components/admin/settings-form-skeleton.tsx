'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function SettingsFormSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      <div className="mt-8 max-w-2xl">
        <div className="bg-white p-6 rounded-lg border space-y-6">
          {/* Начало рабочего дня */}
          <div className="grid gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Конец рабочего дня */}
          <div className="grid gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Интервал между слотами */}
          <div className="grid gap-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* Кнопка сохранения */}
          <div className="flex justify-end">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

