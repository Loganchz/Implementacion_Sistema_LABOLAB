export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { checkIntake, issueFromServer } from '@/lib/intake-rules';
import { getNextNumber } from '@/lib/counters';
import { getSessionClient } from '@/lib/portal';
import { quoteClientMismatch } from '@/lib/quote-client';
import { joinStorageConditions, normalizeStorageCondition, storageConditionCodes } from '@/lib/storage-condition';

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
          items: { include: { analysisType: { select: { id: true, name: true, code: true, area: true, basePrice: true } } } },
          quote: {
            include: {
              workOrder: {
                include: {
                  samples: { select: { status: true, sampleCode: true } },
                  reports: { select: { id: true, status: true } },
                },
              },
            },
          },
          quoteLinks: {
            include: {
              quote: {
                include: {
                  workOrder: {
                    include: {
                      samples: { select: { status: true, sampleCode: true } },
                      reports: { select: { id: true, status: true } },
                    },
                  },
                },
              },
            },
          },
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
      quoteNumber, isSanitaryNotification, packagingMaterial, servingSize,
      shelfLife, dilution, hasCustomAnalyses, customAnalyses,
    } = body ?? {};

    // Helper: Si un campo descriptivo viene vacío o nulo, se guarda como 'N/A'
    const toNA = (val: unknown): string => {
      if (val === undefined || val === null) return 'N/A';
      const text = String(val).trim();
      return text || 'N/A';
    };

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

    const quoteError = await quoteClientMismatch(quoteNumber, clientId);
    if (quoteError) return NextResponse.json({ error: quoteError, issues: [issueFromServer(quoteError)] }, { status: 400 });

    const fullIntake = Object.prototype.hasOwnProperty.call(body ?? {}, 'productName');
    let normalizedSampleCount = sampleCount;
    if (fullIntake) {
      const check = checkIntake({
        clientId,
        sampleTypeId,
        productName,
        lot,
        sampleCount,
        receptionDate,
        storageCondition,
        analysisTypeIds,
        hasCustomAnalyses: Boolean(hasCustomAnalyses),
        customAnalyses: customAnalyses ?? [],
      });
      if (!check.ok) return NextResponse.json({ error: check.messages[0], issues: check.issues }, { status: 400 });
      normalizedSampleCount = check.sampleCount;
    }

    const requestNumber = await getNextNumber('SOL');

    const newRequest = await prisma.analysisRequest.create({
      data: {
        requestNumber,
        clientId,
        sampleTypeId: sampleTypeId || null,
        description: fullIntake ? toNA(description) : (description || null),
        observations: fullIntake ? toNA(observations) : (observations ? String(observations).trim() : null),
        urgent: urgent || false,
        status,
        productName: productName ? String(productName).trim() : null,
        brand: toNA(brand),
        lot: toNA(lot),
        elaborationDate: elaborationDate ? new Date(elaborationDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        samplingDate: samplingDate ? new Date(samplingDate) : null,
        receptionDate: receptionDate ? new Date(receptionDate) : null,
        packaging: fullIntake ? toNA(packaging) : (packaging ? String(packaging).trim() : null),
        contentAmount: fullIntake ? toNA(contentAmount) : (contentAmount ? String(contentAmount).trim() : null),
        location: toNA(location),
        sampleCount: normalizedSampleCount ? parseInt(String(normalizedSampleCount), 10) : 1,
        storageCondition: fullIntake
          ? joinStorageConditions(storageConditionCodes(typeof storageCondition === 'string' ? storageCondition : ''))
          : normalizeStorageCondition(storageCondition),
        samplingBy: fullIntake ? toNA(samplingBy) : (samplingBy ? String(samplingBy).trim() : null),
        responsibleName: fullIntake ? toNA(responsibleName) : (responsibleName ? String(responsibleName).trim() : null),
        invoiceEmail: fullIntake ? toNA(invoiceEmail) : (invoiceEmail ? String(invoiceEmail).trim() : null),
        reportEmail: fullIntake ? toNA(reportEmail) : (reportEmail ? String(reportEmail).trim() : null),

        quoteNumber: fullIntake ? toNA(quoteNumber) : (quoteNumber ? String(quoteNumber).trim() : null),
        isSanitaryNotification: Boolean(isSanitaryNotification),
        packagingMaterial: fullIntake ? toNA(packagingMaterial) : null,
        servingSize: fullIntake ? toNA(servingSize) : null,
        shelfLife: fullIntake ? toNA(shelfLife) : null,
        dilution: fullIntake ? toNA(dilution) : null,
        hasCustomAnalyses: Boolean(hasCustomAnalyses),
        customAnalyses: hasCustomAnalyses && Array.isArray(customAnalyses)
          ? customAnalyses
              .filter((row: any) => String(row?.analysis ?? '').trim())
              .map((row: any) => ({ analysis: toNA(row?.analysis), technique: toNA(row?.technique) }))
          : undefined,

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
      details: `Solicitud ${requestNumber} creada para ${(newRequest as any)?.client?.name ?? 'cliente'}`,
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    console.error('Requests POST error:', error);
    const raw = String(error?.message ?? '');
    const message = /Unknown argument/.test(raw)
      ? 'No se guardó nada. El servidor todavía no reconoce los campos nuevos del ingreso (proforma, notificación sanitaria y análisis adicionales).'
      : 'No se pudo crear la solicitud. No se guardó ningún dato.';
    return NextResponse.json({ error: message, issues: [issueFromServer(message)] }, { status: 500 });
  }
}
