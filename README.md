# Система записи на наращивание ресниц

Веб-приложение для мастера по наращиванию ресниц с публичной частью для клиентов и админ-панелью.

## Технологии

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + Shadcn/UI
- PostgreSQL + Prisma ORM
- NextAuth.js v5
- Docker Compose

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск PostgreSQL через Docker

```bash
docker-compose up -d
```

### 3. Настройка переменных окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

### 4. Настройка базы данных

```bash
# Генерация Prisma Client
npm run db:generate

# Применение миграций
npm run db:migrate
```

### 5. Запуск dev-сервера

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

## Полезные команды

- `npm run dev` - запуск dev-сервера
- `npm run build` - сборка для продакшена
- `npm run start` - запуск продакшен-сервера
- `npm run db:generate` - генерация Prisma Client
- `npm run db:migrate` - применение миграций
- `npm run db:studio` - открытие Prisma Studio (GUI для БД)
- `npm run db:push` - синхронизация схемы с БД без миграций

## Структура проекта

```
/
├── app/                    # App Router
│   ├── (public)/          # Публичная часть
│   ├── (admin)/           # Админ-панель
│   └── api/               # API routes
├── components/            # React компоненты
├── lib/                   # Утилиты
├── prisma/                # Prisma схема
└── public/                # Статические файлы
```

## Docker

Для остановки PostgreSQL:

```bash
docker-compose down
```

Для остановки с удалением данных:

```bash
docker-compose down -v
```

