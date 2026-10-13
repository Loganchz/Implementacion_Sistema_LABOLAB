export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getNextNumber } from '@/lib/counters';
import { getSessionClient } from '@/lib/portal';
import { hasPermission } from '@/lib/permissions';
import { buildQuoteLines } from '@/lib/quote-build';

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

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          client: { select: { name: true } },
          request: { select: { requestNumber: true } },
          links: { include: { request: { select: { requestNumber: true, productName: true } } } },
          items: { include: { analysisType: { select: { name: true, code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({ quotes, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, role, userId } = await getSessionClient();
    if (!session || !userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!hasPermission(role ?? '', 'quotes.create')) {
      return NextResponse.json({ error: 'No tiene permiso para generar cotizaciones' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, items, discount, notes, conditions, validDays, taxRate } = body ?? {};
    const presentation = body?.presentation === 'CONSOLIDADA' ? 'CONSOLIDADA' : 'DETALLADA';
    const requestIds: string[] = Array.isArray(body?.requestIds) && body.requestIds.length
      ? [...new Set(body.requestIds.filter((id: unknown) => typeof id === 'string' && id.length > 0))]
      : (requestId ? [requestId] : []);

    if (!requestIds.length) return NextResponse.json({ error: 'Solicitud requerida' }, { status: 400 });

    const reqs = await prisma.analysisRequest.findMany({
      where: { id: { in: requestIds } },
      include: {
        items: { include: { analysisType: true } },
        quote: { select: { id: true } },
        quoteLinks: { select: { id: true } },
      },
    });
    if (reqs.length !== requestIds.length) {
      return NextResponse.json({ error: 'Una o más muestras no existen' }, { status: 404 });
    }

    const clientIds = new Set(reqs.map((row) => row.clientId));
    if (clientIds.size !== 1) {
      return NextResponse.json({ error: 'Las muestras deben pertenecer al mismo cliente' }, { status: 400 });
    }

    const notOpen = reqs.filter((row) => !['BORRADOR', 'ENVIADA'].includes(row.status) || row.quote || row.quoteLinks.length > 0);
    if (notOpen.length) {
      return NextResponse.json({
        error: `No se puede cotizar ${notOpen.map((row) => row.requestNumber).join(', ')}. Solo muestras en borrador o enviadas, sin proforma previa.`,
      }, { status: 400 });
    }

    const ordered = requestIds.map((id) => reqs.find((row) => row.id === id)).filter(Boolean) as typeof reqs;
    const quoteItems = (requestIds.length === 1 && Array.isArray(items) && items.length)
      ? items.map((item: any) => {
          const unitPrice = Number(item?.unitPrice ?? item?.analysisType?.basePrice ?? 0);
          const qty = item?.quantity ?? 1;
          return {
            analysisTypeId: item?.analysisTypeId ?? item?.analysisType?.id,
            quantity: qty,
            unitPrice,
            totalPrice: unitPrice * qty,
            requestId: requestIds[0],
            scopeKey: requestIds[0],
            notes: item?.notes ?? null,
          };
        })
      : buildQuoteLines(ordered, presentation);

    if (!quoteItems.length || quoteItems.some((item: any) => !item.analysisTypeId)) {
      return NextResponse.json({ error: 'Las muestras no tienen ensayos para cotizar' }, { status: 400 });
    }

    const [ivaConfig, validConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'iva_rate' } }),
      prisma.systemConfig.findUnique({ where: { key: 'quote_valid_days' } }),
    ]);
    const configRate = ivaConfig?.value ? parseFloat(ivaConfig.value) : 15;
    const configValidDays = validConfig?.value ? parseInt(validConfig.value) : 15;

    const subtotal = quoteItems.reduce((sum: number, item: any) => sum + (item?.totalPrice ?? 0), 0);
    const disc = discount ?? 0;
    const rate = taxRate ?? configRate;
    const taxable = subtotal - disc;
    const taxAmount = taxable * (rate / 100);
    const total = taxable + taxAmount;
    const primary = ordered[0];
    const numbers = ordered.map((row) => row.requestNumber).join(', ');
    const autoNotes = ordered.length > 1
      ? (presentation === 'CONSOLIDADA'
        ? `Paquete consolidado (${ordered.length} muestras): ${numbers}`
        : `Proforma detallada (${ordered.length} muestras): ${numbers}`)
      : null;

    const quoteNumber = await getNextNumber('COT');
    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          quoteNumber,
          requestId: primary.id,
          clientId: primary.clientId,
          subtotal,
          discount: disc,
          taxRate: rate,
          taxAmount,
          total,
          validDays: validDays ?? configValidDays,
          notes: notes || autoNotes,
          conditions: conditions || null,
          presentation,
          status: 'BORRADOR',
          createdById: userId,
          items: {
            create: quoteItems.map((item: any) => ({
              analysisTypeId: item.analysisTypeId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              requestId: item.requestId,
              scopeKey: item.scopeKey,
              notes: item.notes,
            })),
          },
          links: { create: ordered.map((row) => ({ requestId: row.id })) },
        },
        include: { items: { include: { analysisType: true } }, client: true, links: true },
      });

      await tx.analysisRequest.updateMany({
        where: { id: { in: ordered.map((row) => row.id) } },
        data: { status: 'EN_COTIZACION' },
      });
      return created;
    });

    await createAuditLog({
      userId,
      action: 'CREATE',
      entity: 'QUOTE',
      entityId: quote.id,
      details: `Cotización ${quoteNumber} creada para ${numbers} - Total: $${total.toFixed(2)} (${presentation})`,
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error: any) {
    console.error('Quote POST error:', error);
    return NextResponse.json({ error: 'Error al crear cotización' }, { status: 500 });
  }
}
