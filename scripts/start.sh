#!/bin/sh
set -e

echo "Waiting for database to be ready..."

# Проверяем наличие DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

# Простая проверка готовности БД через TCP подключение
# Извлекаем хост и порт из DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

if [ -z "$DB_HOST" ]; then
  DB_HOST="postgres"
fi
if [ -z "$DB_PORT" ]; then
  DB_PORT="5432"
fi

# Ждем пока порт будет доступен
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is ready!"

echo "Applying database migrations..."
# Используем npx для запуска Prisma (он найдет правильную версию)
# Проверяем наличие Prisma в разных возможных местах
if [ -f "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma migrate deploy
elif [ -f "./node_modules/prisma/build/index.js" ]; then
  node ./node_modules/prisma/build/index.js migrate deploy
else
  # Используем npx, который загрузит правильную версию из package.json
  npx --yes prisma@5.22.0 migrate deploy
fi

echo "Starting application..."
exec node server.js

