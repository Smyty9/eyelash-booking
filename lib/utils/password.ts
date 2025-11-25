import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Хеширует пароль с помощью bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Проверяет пароль против хеша
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

