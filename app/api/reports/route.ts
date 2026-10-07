export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getNextNumber } from '@/lib/counters';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const where: any = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          workOrder: { select: { orderNumber: true, client: { select: { name: true } } } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({ reports, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { workOrderId, notes } = body ?? {};

    if (!workOrderId) return NextResponse.json({ error: 'OT requerida' }, { status: 400 });

    // A report can only be generated once results exist for the work order
    const resultsCount = await prisma.analysisResult.count({
      where: { sample: { workOrderId } },
    });
    if (resultsCount === 0) {
      return NextResponse.json({ error: 'No se puede crear el reporte: la orden de trabajo aún no tiene resultados registrados' }, { status: 400 });
    }

    // Avoid duplicate report for the same work order
    const existing = await prisma.report.findFirst({ where: { workOrderId } });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un reporte para esta orden de trabajo', reportId: existing.id }, { status: 409 });
    }

    // Prefill signatures from lab config
    const labConfigs = await prisma.systemConfig.findMany({ where: { category: 'LABORATORIO' } });
    const directorName = labConfigs.find((c: any) => c?.key === 'lab_director')?.value ?? null;

    const reportNumber = await getNextNumber('REP');

    const report = await prisma.report.create({
      data: {
        reportNumber,
        workOrderId,
        status: 'BORRADOR',
        notes: notes || null,
        directorName,
        analystName: (session.user as any)?.name ?? null,
        createdById: (session.user as any)?.id,
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'CREATE',
      entity: 'REPORT',
      entityId: report.id,
      details: `Reporte ${reportNumber} creado`,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear reporte' }, { status: 500 });
  }
}
