export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getNextNumber } from '@/lib/counters';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        request: true,
        items: { include: { analysisType: true } },
        createdBy: { select: { name: true } },
        workOrder: true,
      },
    });
    if (!quote) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(quote);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { status } = body ?? {};

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { items: { include: { analysisType: true } } },
    });
    if (!quote) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: {
        status: status ?? quote.status,
        ...(status === 'ENVIADA' ? { sentAt: new Date() } : {}),
        ...(status === 'ACEPTADA' ? { acceptedAt: new Date() } : {}),
      },
    });

    // If accepted, create Work Order automatically
    if (status === 'ACEPTADA') {
      const orderNumber = await getNextNumber('OT');

      // Estimate delivery based on max estimated days
      const maxDays = Math.max(...(quote.items ?? []).map((i: any) => i?.analysisType?.estimatedDays ?? 5), 5);
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + maxDays);

      const workOrder = await prisma.workOrder.create({
        data: {
          orderNumber,
          quoteId: quote.id,
          clientId: quote.clientId,
          status: 'ABIERTA',
          estimatedDelivery,
          items: {
            create: (quote.items ?? []).map((item: any) => ({
              analysisTypeId: item.analysisTypeId,
              area: item.analysisType?.area ?? 'FISICOQUIMICA',
              quantity: item.quantity ?? 1,
            })),
          },
        },
      });

      const links = await prisma.quoteRequest.findMany({
        where: { quoteId: quote.id },
        select: { requestId: true },
      });
      const requestIds = [...new Set([quote.requestId, ...links.map((link) => link.requestId)])];
      await prisma.analysisRequest.updateMany({
        where: { id: { in: requestIds } },
        data: { status: 'CONFIRMADA' },
      });

      await createAuditLog({
        userId: (session.user as any)?.id,
        action: 'CREATE',
        entity: 'WORK_ORDER',
        entityId: workOrder.id,
        details: `OT ${orderNumber} generada automáticamente desde cotización ${quote.quoteNumber}`,
      });
    }

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'STATUS_CHANGE',
      entity: 'QUOTE',
      entityId: updated.id,
      details: `Cotización ${updated.quoteNumber} cambió a ${status}`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Quote PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
