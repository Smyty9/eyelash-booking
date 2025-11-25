import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../lib/utils/password';

const prisma = new PrismaClient();

async function main() {
  // Пароль админа из env или дефолтный
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminPhone = process.env.ADMIN_PHONE || '+79095117346';
  const adminName = process.env.ADMIN_NAME || 'Администратор';

  // Хешируем пароль
  const hashedPassword = await hashPassword(adminPassword);

  // Создание админа (если еще не существует)
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      role: UserRole.ADMIN,
      password: hashedPassword, // Обновляем пароль при каждом запуске seed
    },
    create: {
      phone: adminPhone,
      name: adminName,
      role: UserRole.ADMIN,
      password: hashedPassword,
    },
  });

  console.log('Админ создан/обновлен:', {
    id: admin.id,
    phone: admin.phone,
    name: admin.name,
    role: admin.role,
  });
  console.log('Пароль:', adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });