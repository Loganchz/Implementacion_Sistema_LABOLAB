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

    const sample = await prisma.sample.findUnique({
      where: { id: params.id },
      include: {
        workOrder: { include: { client: true, quote: true } },
        sampleType: true,
        analyst: { select: { name: true, email: true } },
        results: { include: { analysisType: true, analyst: { select: { name: true } }, verifiedBy: { select: { name: true } } } },
      },
    });
    if (!sample) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(sample);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const updated = await prisma.sample.update({
      where: { id: params.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.status === 'ANALIZADA' ? { analyzedAt: new Date() } : {}),
        ...(body.analystId !== undefined ? { analystId: body.analystId } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: body.status ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'SAMPLE',
      entityId: updated.id,
      details: `Muestra ${updated.sampleCode} ${body.status ? `cambió a ${body.status}` : 'actualizada'}`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
