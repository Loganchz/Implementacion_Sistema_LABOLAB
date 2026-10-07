export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const active = searchParams.get('active');

    const where: any = {};
    if (area) where.area = area;
    if (active === 'true') where.active = true;

    const types = await prisma.analysisType.findMany({
      where,
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
    const at = await prisma.analysisType.create({ data: body });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'CREATE',
      entity: 'ANALYSIS_TYPE',
      entityId: at.id,
      details: `Tipo de análisis creado: ${at.name}`,
    });

    return NextResponse.json(at, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear' }, { status: 500 });
  }
}
