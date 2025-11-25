/**
 * Нормализует телефон: убирает все нецифровые символы, оставляет только 10 цифр
 * @param phone - телефон в любом формате
 * @returns нормализованный телефон (10 цифр) или null если формат неверный
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  
  // Если начинается с 7 или 8, убираем первую цифру
  let cleaned = digits;
  if (digits.startsWith('7') || digits.startsWith('8')) {
    cleaned = digits.substring(1);
  }
  
  // Должно быть ровно 10 цифр
  if (cleaned.length !== 10) {
    return null;
  }
  
  return cleaned;
}

/**
 * Форматирует телефон для отображения в формате +7 (XXX) XXX-XX-XX
 * @param phone - телефон в формате +7XXXXXXXXXX или XXXXXXXXXX
 * @returns отформатированный телефон
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Если начинается с 7 или 8, убираем первую цифру
  let digits = cleaned;
  if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
    digits = cleaned.substring(1);
  }
  
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }
  
  return phone;
}

/**
 * Преобразует нормализованный телефон в формат для БД (+7XXXXXXXXXX)
 * @param phone - нормализованный телефон (10 цифр)
 * @returns телефон в формате +7XXXXXXXXXX
 */
export function toDatabasePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Если начинается с 7 или 8, убираем первую цифру
  let digits = cleaned;
  if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
    digits = cleaned.substring(1);
  }
  
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  
  // Если уже в формате +7, возвращаем как есть
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  
  return phone;
}

