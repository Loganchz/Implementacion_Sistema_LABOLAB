export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const configs = await prisma.systemConfig.findMany({ orderBy: { category: 'asc' } });
    return NextResponse.json(configs);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const body = await request.json();
    const { key, value, label, category } = body ?? {};

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value, label: label || null, category: category || 'GENERAL' },
      create: { key, value, label: label || null, category: category || 'GENERAL' },
    });

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
