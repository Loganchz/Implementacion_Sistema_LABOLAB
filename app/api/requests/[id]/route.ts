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

    const req = await prisma.analysisRequest.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        sampleType: true,
        createdBy: { select: { name: true } },
        items: { include: { analysisType: true } },
        quote: true,
      },
    });
    if (!req) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(req);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { status, description, observations, urgent, sampleTypeId } = body ?? {};

    const updated = await prisma.analysisRequest.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(observations !== undefined ? { observations } : {}),
        ...(urgent !== undefined ? { urgent } : {}),
        ...(sampleTypeId !== undefined ? { sampleTypeId } : {}),
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: status ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'REQUEST',
      entityId: updated.id,
      details: status ? `Solicitud ${updated.requestNumber} cambió a ${status}` : `Solicitud ${updated.requestNumber} actualizada`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
