<!-- 9265b061-efaf-48d9-bf6d-5526edc21297 a488a0d0-9301-4735-a8fa-8a9a9421049c -->
# Создание страницы управления услугами /admin/services

## Что будет создано:

1. **Структура админ-панели:**

- `app/(admin)/layout.tsx` - базовый layout для админ-панели
- `app/(admin)/services/page.tsx` - страница управления услугами

2. **API routes для CRUD операций:**

- `app/api/services/route.ts` - GET (список) и POST (создание)
- `app/api/services/[id]/route.ts` - PUT (обновление) и DELETE (удаление)

3. **Shadcn UI компоненты:**

- Table (таблица услуг)
- Button (кнопки действий)
- Dialog (модальное окно для формы)
- Input (поля ввода)
- Label (метки полей)

4. **Компоненты:**

- `components/admin/services-table.tsx` - таблица с данными услуг
- `components/admin/service-form.tsx` - форма добавления/редактирования

## Детали реализации:

- Использование Prisma Client для работы с БД
- Форма с валидацией (название, цена, длительность в минутах)
- Таблица отображает: название, цену, длительность, действия (редактировать/удалить)
- Модальное окно для добавления/редактирования
- Server Actions или API routes для мутаций

## Файлы для изменения/создания:

- `app/(admin)/layout.tsx` (новый)
- `app/(admin)/services/page.tsx` (новый)
- `app/api/services/route.ts` (новый)
- `app/api/services/[id]/route.ts` (новый)
- `components/admin/services-table.tsx` (новый)
- `components/admin/service-form.tsx` (новый)
- Установка Shadcn UI компонентов: table, button, dialog, input, label