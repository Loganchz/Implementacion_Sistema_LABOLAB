export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/portal';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const { session, role, client } = await getSessionClient();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    if (role !== 'CLIENTE') {
      return NextResponse.json({ role, client: null, stats: null });
    }

    if (!client) {
      return NextResponse.json({
        role,
        client: null,
        stats: { requests: 0, activeOrders: 0, availableReports: 0 },
      });
    }

    const [requests, activeOrders, availableReports] = await Promise.all([
      prisma.analysisRequest.count({ where: { clientId: client.id } }),
      prisma.workOrder.count({
        where: { clientId: client.id, status: { in: ['ABIERTA', 'EN_PROCESO', 'COMPLETADA'] } },
      }),
      prisma.report.count({
        where: {
          status: { in: ['EMITIDO', 'ENVIADO'] },
          workOrder: { clientId: client.id },
        },
      }),
    ]);

    return NextResponse.json({
      role,
      client: {
        id: client.id,
        name: client.name,
        ruc: client.ruc,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        contactName: client.contactName,
      },
      stats: { requests, activeOrders, availableReports },
    });
  } catch (error: any) {
    console.error('Me GET error:', error);
    return NextResponse.json({ error: 'Error al cargar perfil' }, { status: 500 });
  }
}
