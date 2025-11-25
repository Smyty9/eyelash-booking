import { prisma } from '@/lib/prisma';

/**
 * Проверяет, заблокировано ли время для указанного интервала
 * @param startDateTime - Начало интервала (UTC)
 * @param endDateTime - Конец интервала (UTC)
 * @param serviceId - ID услуги (опционально, для проверки блокировок конкретной услуги)
 * @returns true если время заблокировано, false если доступно
 */
export async function isTimeBlocked(
  startDateTime: Date,
  endDateTime: Date,
  serviceId?: string
): Promise<boolean> {
  // Находим все блокировки, которые пересекаются с заданным интервалом
  // Пересечение: (start < block.end) && (end > block.start)
  const blockingTimeBlocks = await prisma.timeBlock.findMany({
    where: {
      AND: [
        { startDateTime: { lt: endDateTime } },
        { endDateTime: { gt: startDateTime } },
      ],
    },
  });

  // Если есть хотя бы одна блокировка, время заблокировано
  return blockingTimeBlocks.length > 0;
}

/**
 * Получает все блокировки, которые пересекаются с заданным интервалом
 * @param startDateTime - Начало интервала (UTC)
 * @param endDateTime - Конец интервала (UTC)
 * @returns Массив блокировок
 */
export async function getOverlappingTimeBlocks(
  startDateTime: Date,
  endDateTime: Date
) {
  return await prisma.timeBlock.findMany({
    where: {
      AND: [
        { startDateTime: { lt: endDateTime } },
        { endDateTime: { gt: startDateTime } },
      ],
    },
    orderBy: { startDateTime: 'asc' },
  });
}

