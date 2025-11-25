import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || '/admin';

  async function handleLogin(formData: FormData) {
    'use server';

    const phone = formData.get('phone') as string;
    const password = formData.get('password') as string;

    if (!phone || !password) {
      redirect('/auth/login?error=missing_credentials');
    }

    // Используем signIn без try-catch, так как он может делать редирект сам
    await signIn('credentials', {
      phone,
      password,
      redirectTo: callbackUrl,
    });
    
    // Если мы дошли сюда, значит редирект не произошел
    // Проверяем сессию
    const session = await auth();
    if (!session?.user) {
      redirect('/auth/login?error=invalid_credentials');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Вход в админ-панель
          </h2>
        </div>
        <form action={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                name="phone"
                type="text"
                placeholder="+7 (999) 123-45-67"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1"
              />
            </div>
          </div>

          {params.error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">
                {params.error === 'invalid_credentials'
                  ? 'Неверный телефон или пароль'
                  : 'Заполните все поля'}
              </p>
            </div>
          )}

          <div>
            <Button type="submit" className="w-full">
              Войти
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

