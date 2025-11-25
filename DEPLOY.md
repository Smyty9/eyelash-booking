# Инструкция по деплою на Beget VPS

## Подготовка

### 1. Установка Docker на сервере

```bash
# Подключись по SSH
ssh user@твой-сервер.beget.com

# Установи Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установи Docker Compose
sudo apt install docker-compose-plugin -y

# Перезайди в систему или выполни:
newgrp docker
```

### 2. Клонирование проекта

```bash
# Установи Git если нет
sudo apt install git -y

# Клонируй репозиторий
cd ~
git clone https://github.com/Smyty9/eyelash-booking.git
cd eyelash-booking
```

### 3. Настройка переменных окружения

```bash
# Скопируй пример файла
cp env.prod.example .env.prod

# Отредактируй .env.prod
nano .env.prod
```

**Заполни переменные:**
- `DB_PASSWORD` - надежный пароль для PostgreSQL
- `NEXTAUTH_SECRET` - сгенерируй командой: `openssl rand -base64 32`
- `NEXTAUTH_URL` - твой домен (например, `https://eyelash-booking.ru`)

### 4. Запуск приложения

```bash
# Запусти через Docker Compose
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Проверь логи
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Настройка Nginx

```bash
sudo nano /etc/nginx/sites-available/eyelash-booking
```

**Добавь конфигурацию:**
```nginx
server {
    listen 80;
    server_name твой-домен.ru www.твой-домен.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активируй сайт
sudo ln -s /etc/nginx/sites-available/eyelash-booking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL сертификат (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d твой-домен.ru -d www.твой-домен.ru
```

## Полезные команды

### Просмотр логов
```bash
# Логи приложения
docker compose -f docker-compose.prod.yml logs -f app

# Логи базы данных
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Остановка/Запуск
```bash
# Остановка
docker compose -f docker-compose.prod.yml down

# Запуск
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Перезапуск
docker compose -f docker-compose.prod.yml restart
```

### Обновление приложения
```bash
cd ~/eyelash-booking
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Бэкап базы данных
```bash
# Создание бэкапа
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U eyelash_user eyelash_booking > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker compose -f docker-compose.prod.yml exec -T postgres psql -U eyelash_user eyelash_booking < backup.sql
```

### Проверка статуса
```bash
# Статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Использование ресурсов
docker stats
```

## Решение проблем

### Приложение не запускается
```bash
# Проверь логи
docker compose -f docker-compose.prod.yml logs app

# Проверь переменные окружения
docker compose -f docker-compose.prod.yml config
```

### База данных не подключается
```bash
# Проверь статус PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U eyelash_user

# Подключись к БД
docker compose -f docker-compose.prod.yml exec postgres psql -U eyelash_user -d eyelash_booking
```

### Миграции не применяются
```bash
# Примени миграции вручную
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

## Безопасность

1. **Firewall**: Убедись, что порт 5432 (PostgreSQL) доступен только локально
2. **Пароли**: Используй сложные пароли для БД и NEXTAUTH_SECRET
3. **SSL**: Всегда используй HTTPS в продакшене
4. **Обновления**: Регулярно обновляй Docker образы и зависимости

