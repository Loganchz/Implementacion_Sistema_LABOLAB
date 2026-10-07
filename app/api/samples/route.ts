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
    const area = searchParams.get('area');
    const workOrderId = searchParams.get('workOrderId');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const pending = searchParams.get('pending');

    const where: any = {};
    if (pending === 'true') {
      where.status = { in: ['RECIBIDA', 'EN_ANALISIS'] };
    } else if (status) {
      where.status = status;
    }
    if (area) where.area = area;
    if (workOrderId) where.workOrderId = workOrderId;

    // Analysts only see samples in their area
    const userRole = (session.user as any)?.role;
    if (userRole === 'ANALISTA_FQ') where.area = 'FISICOQUIMICA';
    if (userRole === 'ANALISTA_MICA') where.area = 'MICROBIOLOGIA';

    const [samples, total] = await Promise.all([
      prisma.sample.findMany({
        where,
        include: {
          workOrder: {
            select: {
              id: true, orderNumber: true,
              client: { select: { name: true } },
              items: { include: { analysisType: true } },
            },
          },
          sampleType: { select: { name: true } },
          analyst: { select: { name: true } },
          results: { include: { analysisType: { select: { name: true, code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sample.count({ where }),
    ]);

    return NextResponse.json({ samples, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { workOrderId, sampleTypeId, description, quantity, unit, receptionCondition, storageCondition, area, notes } = body ?? {};

    if (!workOrderId) return NextResponse.json({ error: 'OT requerida' }, { status: 400 });

    const sampleCode = await getNextNumber('MUE');

    const sample = await prisma.sample.create({
      data: {
        sampleCode,
        workOrderId,
        sampleTypeId: sampleTypeId || null,
        description: description || null,
        quantity: quantity || null,
        unit: unit || null,
        receptionCondition: receptionCondition || null,
        storageCondition: storageCondition || 'AMBIENTE',
        area: area || 'FISICOQUIMICA',
        status: 'RECIBIDA',
        notes: notes || null,
      },
      include: {
        workOrder: { select: { orderNumber: true } },
        sampleType: true,
      },
    });

    // Update work order status if it's still ABIERTA
    await prisma.workOrder.updateMany({
      where: { id: workOrderId, status: 'ABIERTA' },
      data: { status: 'EN_PROCESO' },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'CREATE',
      entity: 'SAMPLE',
      entityId: sample.id,
      details: `Muestra ${sampleCode} registrada en OT ${sample.workOrder?.orderNumber ?? ''}`,
    });

    return NextResponse.json(sample, { status: 201 });
  } catch (error: any) {
    console.error('Samples POST error:', error);
    return NextResponse.json({ error: 'Error al crear muestra' }, { status: 500 });
  }
}
