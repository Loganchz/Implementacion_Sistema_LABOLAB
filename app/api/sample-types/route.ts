export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const types = await prisma.sampleType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(types);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const st = await prisma.sampleType.create({ data: body });
    return NextResponse.json(st, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear' }, { status: 500 });
  }
}
