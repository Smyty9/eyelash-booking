import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/utils/password';
import { UserRole } from '@prisma/client';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        phone: { label: 'Телефон', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          return null;
        }

        // Нормализуем телефон (убираем форматирование)
        const phone = String(credentials.phone).replace(/\D/g, '');
        
        if (phone.length !== 11 || !phone.startsWith('7')) {
          return null;
        }
        const normalizedPhone = `+${phone}`;

        // Ищем пользователя по телефону
        const user = await prisma.user.findUnique({
          where: { phone: normalizedPhone },
        });

        if (!user || !user.password) {
          return null;
        }

        // Проверяем пароль
        const isValidPassword = await verifyPassword(
          String(credentials.password),
          user.password
        );

        if (!isValidPassword) {
          return null;
        }

        // Возвращаем объект пользователя
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.phone = token.phone;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
});

