'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function CalendarSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Легенда skeleton */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Календарь skeleton */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>

        {/* Календарная сетка */}
        <div className="border rounded-lg overflow-hidden">
          {/* Заголовки дней недели */}
          <div className="grid grid-cols-7 border-b">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="p-2 border-r last:border-r-0">
                <Skeleton className="h-4 w-8 mx-auto" />
              </div>
            ))}
          </div>

          {/* Строки календаря */}
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 border-b last:border-b-0">
              {Array.from({ length: 7 }).map((_, colIndex) => {
                // Показываем события в некоторых ячейках для реалистичности
                const showEvent = (rowIndex * 7 + colIndex) % 5 === 0;
                const showSecondEvent = (rowIndex * 7 + colIndex) % 7 === 0;
                return (
                  <div key={colIndex} className="p-2 border-r last:border-r-0 min-h-[100px]">
                    <Skeleton className="h-4 w-6 mb-2" />
                    {/* События в ячейке */}
                    {showEvent && (
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-full rounded" />
                        {showSecondEvent && (
                          <Skeleton className="h-4 w-3/4 rounded" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

