export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getSessionClient } from '@/lib/portal';
import { hasPermission } from '@/lib/permissions';
import { checkIntake, issueFromServer } from '@/lib/intake-rules';
import { quoteClientMismatch } from '@/lib/quote-client';
import { joinStorageConditions, normalizeStorageCondition, storageConditionCodes } from '@/lib/storage-condition';

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
    const { session, role, userId } = await getSessionClient();
    if (!session || !userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!hasPermission(role ?? '', 'requests.edit')) {
      return NextResponse.json({ error: 'No tiene permiso para editar muestras' }, { status: 403 });
    }

    const body = await request.json();
    const {
      status, description, observations, urgent, sampleTypeId, clientId, analysisTypeIds,
      productName, brand, lot, elaborationDate, expirationDate, samplingDate, receptionDate,
      packaging, contentAmount, location, sampleCount, storageCondition, samplingBy,
      responsibleName, invoiceEmail, reportEmail, quoteNumber, isSanitaryNotification,
      packagingMaterial, servingSize, shelfLife, dilution, hasCustomAnalyses, customAnalyses,
    } = body ?? {};

    const current = await prisma.analysisRequest.findUnique({
      where: { id: params.id },
      select: { status: true, clientId: true },
    });
    if (!current) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    const editingIntake = productName !== undefined || Array.isArray(analysisTypeIds);
    if (editingIntake && current.status !== 'BORRADOR') {
      const blocked = 'Solo se puede editar una solicitud en borrador. Esta ya avanzó y solo se puede consultar.';
      return NextResponse.json({ error: blocked, issues: [issueFromServer(blocked)] }, { status: 409 });
    }

    let normalizedSampleCount = sampleCount;
    if (productName !== undefined) {
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

    if (quoteNumber !== undefined) {
      const quoteError = await quoteClientMismatch(quoteNumber, clientId || current.clientId);
      if (quoteError) return NextResponse.json({ error: quoteError, issues: [issueFromServer(quoteError)] }, { status: 400 });
    }

    const textOrNull = (value: unknown) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const text = String(value).trim();
      return text ? text : null;
    };
    const textOrNA = (value: unknown) => {
      if (value === undefined) return undefined;
      if (value === null) return 'N/A';
      const text = String(value).trim();
      return text ? text : 'N/A';
    };
    const dateOrNull = (value: unknown) => {
      if (value === undefined) return undefined;
      if (!value) return null;
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const updated = await prisma.$transaction(async (tx) => {
      await tx.analysisRequest.update({
        where: { id: params.id },
        data: {
          ...(status ? { status } : {}),
          ...(clientId ? { clientId } : {}),
          ...(description !== undefined ? { description: productName !== undefined ? textOrNA(description) : textOrNull(description) } : {}),
          ...(observations !== undefined ? { observations: productName !== undefined ? textOrNA(observations) : textOrNull(observations) } : {}),
          ...(urgent !== undefined ? { urgent: !!urgent } : {}),
          ...(sampleTypeId !== undefined ? { sampleTypeId: sampleTypeId || null } : {}),
          ...(productName !== undefined ? { productName: textOrNull(productName) } : {}),
          ...(brand !== undefined ? { brand: textOrNA(brand) } : {}),
          ...(lot !== undefined ? { lot: textOrNA(lot) } : {}),
          ...(elaborationDate !== undefined ? { elaborationDate: dateOrNull(elaborationDate) } : {}),
          ...(expirationDate !== undefined ? { expirationDate: dateOrNull(expirationDate) } : {}),
          ...(samplingDate !== undefined ? { samplingDate: dateOrNull(samplingDate) } : {}),
          ...(receptionDate !== undefined ? { receptionDate: dateOrNull(receptionDate) } : {}),
          ...(packaging !== undefined ? { packaging: productName !== undefined ? textOrNA(packaging) : textOrNull(packaging) } : {}),
          ...(contentAmount !== undefined ? { contentAmount: productName !== undefined ? textOrNA(contentAmount) : textOrNull(contentAmount) } : {}),
          ...(location !== undefined ? { location: textOrNA(location) } : {}),
          ...(sampleCount !== undefined ? { sampleCount: normalizedSampleCount ? parseInt(String(normalizedSampleCount), 10) : 1 } : {}),
          ...(storageCondition !== undefined ? {
            storageCondition: productName !== undefined
              ? joinStorageConditions(storageConditionCodes(typeof storageCondition === 'string' ? storageCondition : ''))
              : normalizeStorageCondition(storageCondition),
          } : {}),
          ...(samplingBy !== undefined ? { samplingBy: productName !== undefined ? textOrNA(samplingBy) : textOrNull(samplingBy) } : {}),
          ...(responsibleName !== undefined ? { responsibleName: productName !== undefined ? textOrNA(responsibleName) : textOrNull(responsibleName) } : {}),
          ...(invoiceEmail !== undefined ? { invoiceEmail: productName !== undefined ? textOrNA(invoiceEmail) : textOrNull(invoiceEmail) } : {}),
          ...(reportEmail !== undefined ? { reportEmail: productName !== undefined ? textOrNA(reportEmail) : textOrNull(reportEmail) } : {}),

          // Nuevos campos oficiales
          ...(quoteNumber !== undefined ? { quoteNumber: textOrNA(quoteNumber) } : {}),
          ...(isSanitaryNotification !== undefined ? { isSanitaryNotification: Boolean(isSanitaryNotification) } : {}),
          ...(packagingMaterial !== undefined ? { packagingMaterial: textOrNA(packagingMaterial) } : {}),
          ...(servingSize !== undefined ? { servingSize: textOrNA(servingSize) } : {}),
          ...(shelfLife !== undefined ? { shelfLife: textOrNA(shelfLife) } : {}),
          ...(dilution !== undefined ? { dilution: textOrNA(dilution) } : {}),
          ...(hasCustomAnalyses !== undefined ? { hasCustomAnalyses: Boolean(hasCustomAnalyses) } : {}),
          ...(customAnalyses !== undefined ? {
            customAnalyses: Array.isArray(customAnalyses)
              ? customAnalyses
                  .filter((row: any) => String(row?.analysis ?? '').trim())
                  .map((row: any) => ({ analysis: textOrNA(row?.analysis), technique: textOrNA(row?.technique) }))
              : undefined,
          } : {}),
        },
      });

      if (Array.isArray(analysisTypeIds)) {
        const ids = analysisTypeIds.filter((id: unknown) => typeof id === 'string' && id);
        await tx.requestItem.deleteMany({ where: { requestId: params.id } });
        if (ids.length) {
          await tx.requestItem.createMany({
            data: ids.map((analysisTypeId: string) => ({ requestId: params.id, analysisTypeId, quantity: 1 })),
          });
        }
      }

      return tx.analysisRequest.findUnique({
        where: { id: params.id },
        include: {
          client: { select: { name: true } },
          sampleType: { select: { name: true } },
          items: { include: { analysisType: { select: { id: true, name: true, code: true, area: true, basePrice: true } } } },
        },
      });
    });

    await createAuditLog({
      userId,
      action: status ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'REQUEST',
      entityId: updated?.id,
      details: status
        ? `Solicitud ${updated?.requestNumber} cambió a ${status}`
        : `Solicitud ${updated?.requestNumber} actualizada desde el formulario de ingreso`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
