export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getNextNumber } from '@/lib/counters';
import { getSessionClient } from '@/lib/portal';

export async function GET(request: Request) {
  try {
    const { session, role, client } = await getSessionClient();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const where: any = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    // Un CLIENTE solo puede ver sus propias solicitudes
    if (role === 'CLIENTE') {
      if (!client) return NextResponse.json({ requests: [], total: 0, page, limit });
      where.clientId = client.id;
    }

    const [requests, total] = await Promise.all([
      prisma.analysisRequest.findMany({
        where,
        include: {
          client: { select: { name: true } },
          sampleType: { select: { name: true } },
          createdBy: { select: { name: true } },
          items: { include: { analysisType: { select: { name: true, code: true, area: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.analysisRequest.count({ where }),
    ]);

    return NextResponse.json({ requests, total, page, limit });
  } catch (error: any) {
    console.error('Requests GET error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, role, userId, client } = await getSessionClient();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    let { clientId } = body ?? {};
    const {
      sampleTypeId, description, observations, urgent, analysisTypeIds,
      productName, brand, lot, elaborationDate, expirationDate, samplingDate,
      receptionDate, packaging, contentAmount, location, sampleCount,
      storageCondition, samplingBy, responsibleName, invoiceEmail, reportEmail,
    } = body ?? {};

    // Portal self-service: el CLIENTE crea solicitudes para su propia cuenta
    // y quedan ENVIADAS para que aparezcan de inmediato al equipo del laboratorio.
    let status: any = 'BORRADOR';
    if (role === 'CLIENTE') {
      if (!client) return NextResponse.json({ error: 'Su usuario no está vinculado a un cliente. Contacte al laboratorio.' }, { status: 400 });
      clientId = client.id;
      status = 'ENVIADA';
      if (!analysisTypeIds || (analysisTypeIds ?? []).length === 0) {
        return NextResponse.json({ error: 'Seleccione al menos un análisis requerido' }, { status: 400 });
      }
    }

    if (!clientId) return NextResponse.json({ error: 'Cliente requerido' }, { status: 400 });

    const requestNumber = await getNextNumber('SOL');

    const newRequest = await prisma.analysisRequest.create({
      data: {
        requestNumber,
        clientId,
        sampleTypeId: sampleTypeId || null,
        description: description || null,
        observations: observations || null,
        urgent: urgent || false,
        status,
        productName: productName || null,
        brand: brand || null,
        lot: lot || null,
        elaborationDate: elaborationDate ? new Date(elaborationDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        samplingDate: samplingDate ? new Date(samplingDate) : null,
        receptionDate: receptionDate ? new Date(receptionDate) : null,
        packaging: packaging || null,
        contentAmount: contentAmount || null,
        location: location || null,
        sampleCount: sampleCount ? parseInt(String(sampleCount)) : null,
        storageCondition: storageCondition || null,
        samplingBy: samplingBy || null,
        responsibleName: responsibleName || null,
        invoiceEmail: invoiceEmail || null,
        reportEmail: reportEmail || null,
        createdById: userId,
        items: {
          create: (analysisTypeIds ?? []).map((atId: string) => ({
            analysisTypeId: atId,
            quantity: 1,
          })),
        },
      },
      include: {
        client: { select: { name: true } },
        items: { include: { analysisType: true } },
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'CREATE',
      entity: 'REQUEST',
      entityId: newRequest.id,
      details: `Solicitud ${requestNumber} creada para ${newRequest.client?.name ?? 'cliente'}`,
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    console.error('Requests POST error:', error);
    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 });
  }
}
