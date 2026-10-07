export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const order = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        quote: { include: { request: true, items: { include: { analysisType: true } } } },
        samples: { include: { sampleType: true, analyst: { select: { name: true } }, results: { include: { analysisType: true } } } },
        items: { include: { analysisType: true } },
        reports: true,
      },
    });
    if (!order) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();

    // Enforce sequential workflow: OT -> Muestras -> Resultados -> Reporte emitido -> Entrega
    if (body.status === 'COMPLETADA' || body.status === 'ENTREGADA') {
      const order = await prisma.workOrder.findUnique({
        where: { id: params.id },
        include: {
          samples: { include: { results: true } },
          reports: true,
        },
      });
      if (!order) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

      const samples = order.samples ?? [];
      if (samples.length === 0) {
        return NextResponse.json({ error: 'No se puede completar: la orden no tiene muestras registradas.' }, { status: 400 });
      }

      const activeSamples = samples.filter((s: any) => s.status !== 'DESCARTADA');
      const samplesWithoutResults = activeSamples.filter((s: any) => (s.results ?? []).length === 0);
      if (activeSamples.length === 0 || samplesWithoutResults.length > 0) {
        return NextResponse.json({ error: 'No se puede completar: todas las muestras deben tener resultados registrados.' }, { status: 400 });
      }

      const emittedReport = (order.reports ?? []).find((r: any) => r.status === 'EMITIDO' || r.status === 'ENVIADO');
      if (!emittedReport) {
        return NextResponse.json({ error: 'No se puede completar: debe generar y emitir el informe de resultados antes de cerrar la orden.' }, { status: 400 });
      }

      if (body.status === 'ENTREGADA' && order.status !== 'COMPLETADA') {
        return NextResponse.json({ error: 'No se puede entregar: la orden debe estar completada primero.' }, { status: 400 });
      }
    }

    const updated = await prisma.workOrder.update({
      where: { id: params.id },
      data: {
        status: body.status,
        ...(body.status === 'COMPLETADA' ? { completedAt: new Date() } : {}),
        ...(body.status === 'ENTREGADA' ? { deliveredAt: new Date() } : {}),
        notes: body.notes ?? undefined,
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'STATUS_CHANGE',
      entity: 'WORK_ORDER',
      entityId: updated.id,
      details: `OT ${updated.orderNumber} cambió a ${body.status}`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
