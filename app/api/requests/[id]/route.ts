export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getSessionClient } from '@/lib/portal';
import { hasPermission } from '@/lib/permissions';
import { checkIntake } from '@/lib/intake-rules';

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
      responsibleName, invoiceEmail, reportEmail,
    } = body ?? {};

    const current = await prisma.analysisRequest.findUnique({
      where: { id: params.id },
      select: { status: true },
    });
    if (!current) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    const editingIntake = productName !== undefined || Array.isArray(analysisTypeIds);
    if (editingIntake && current.status !== 'BORRADOR') {
      return NextResponse.json({ error: 'Solo se puede editar una solicitud en borrador' }, { status: 409 });
    }

    let normalizedSampleCount = sampleCount;
    if (productName !== undefined) {
      const check = checkIntake({ clientId, sampleTypeId, productName, lot, sampleCount, receptionDate, analysisTypeIds });
      if (!check.ok) return NextResponse.json({ error: check.messages[0] }, { status: 400 });
      normalizedSampleCount = check.sampleCount;
    }

    const textOrNull = (value: unknown) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const text = String(value).trim();
      return text ? text : null;
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
          ...(description !== undefined ? { description: textOrNull(description) } : {}),
          ...(observations !== undefined ? { observations: textOrNull(observations) } : {}),
          ...(urgent !== undefined ? { urgent: !!urgent } : {}),
          ...(sampleTypeId !== undefined ? { sampleTypeId: sampleTypeId || null } : {}),
          ...(productName !== undefined ? { productName: textOrNull(productName) } : {}),
          ...(brand !== undefined ? { brand: textOrNull(brand) } : {}),
          ...(lot !== undefined ? { lot: textOrNull(lot) } : {}),
          ...(elaborationDate !== undefined ? { elaborationDate: dateOrNull(elaborationDate) } : {}),
          ...(expirationDate !== undefined ? { expirationDate: dateOrNull(expirationDate) } : {}),
          ...(samplingDate !== undefined ? { samplingDate: dateOrNull(samplingDate) } : {}),
          ...(receptionDate !== undefined ? { receptionDate: dateOrNull(receptionDate) } : {}),
          ...(packaging !== undefined ? { packaging: textOrNull(packaging) } : {}),
          ...(contentAmount !== undefined ? { contentAmount: textOrNull(contentAmount) } : {}),
          ...(location !== undefined ? { location: textOrNull(location) } : {}),
          ...(sampleCount !== undefined ? { sampleCount: normalizedSampleCount ? parseInt(String(normalizedSampleCount), 10) : null } : {}),
          ...(storageCondition !== undefined ? { storageCondition: textOrNull(storageCondition) } : {}),
          ...(samplingBy !== undefined ? { samplingBy: textOrNull(samplingBy) } : {}),
          ...(responsibleName !== undefined ? { responsibleName: textOrNull(responsibleName) } : {}),
          ...(invoiceEmail !== undefined ? { invoiceEmail: textOrNull(invoiceEmail) } : {}),
          ...(reportEmail !== undefined ? { reportEmail: textOrNull(reportEmail) } : {}),
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
