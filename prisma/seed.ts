import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Создание админа (если еще не существует)
  const admin = await prisma.user.upsert({
    where: { phone: '+79095117346' }, // Замени на свой номер телефона
    update: {
      role: UserRole.ADMIN, // Обновляем роль на ADMIN, если пользователь уже существует
    },
    create: {
      phone: '+79095117346', // Замени на свой номер телефона
      name: 'Администратор', // Замени на свое имя
      role: UserRole.ADMIN,
    },
  });

  console.log('Админ создан/обновлен:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });