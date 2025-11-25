import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Не авторизован' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    id: session.user.id,
    phone: session.user.phone,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  });
}

