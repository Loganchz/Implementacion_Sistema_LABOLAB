export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/portal';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const { session, role, client } = await getSessionClient();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (role !== 'CLIENTE' || !client) return NextResponse.json({ reports: [] });

    const reports = await prisma.report.findMany({
      where: {
        status: { in: ['EMITIDO', 'ENVIADO'] },
        workOrder: { clientId: client.id },
      },
      select: {
        id: true,
        reportNumber: true,
        status: true,
        emittedAt: true,
        createdAt: true,
        workOrder: {
          select: {
            orderNumber: true,
            _count: { select: { samples: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Me reports error:', error);
    return NextResponse.json({ error: 'Error al cargar reportes' }, { status: 500 });
  }
}
