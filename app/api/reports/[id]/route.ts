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

    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        workOrder: {
          include: {
            client: true,
            quote: { select: { quoteNumber: true } },
            samples: {
              include: {
                sampleType: true,
                results: {
                  include: { analysisType: true, analyst: { select: { name: true } }, verifiedBy: { select: { name: true } } },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        createdBy: { select: { name: true } },
      },
    });
    if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Report GET error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { status, notes, conclusions, observations, analystName, directorName } = body ?? {};

    const existing = await prisma.report.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });

    const updated = await prisma.report.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(conclusions !== undefined ? { conclusions: conclusions || null } : {}),
        ...(observations !== undefined ? { observations: observations || null } : {}),
        ...(analystName !== undefined ? { analystName: analystName || null } : {}),
        ...(directorName !== undefined ? { directorName: directorName || null } : {}),
        ...(status === 'EMITIDO' && !existing.emittedAt ? { emittedAt: new Date() } : {}),
        ...(status === 'ENVIADO' ? { sentAt: new Date() } : {}),
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: status ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'REPORT',
      entityId: updated.id,
      details: status ? `Reporte ${updated.reportNumber} cambió a ${status}` : `Reporte ${updated.reportNumber} actualizado`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Report PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar reporte' }, { status: 500 });
  }
}
