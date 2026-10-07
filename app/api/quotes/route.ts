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

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          client: { select: { name: true } },
          request: { select: { requestNumber: true } },
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
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { requestId, items, discount, notes, conditions, validDays, taxRate } = body ?? {};

    if (!requestId) return NextResponse.json({ error: 'Solicitud requerida' }, { status: 400 });

    const req = await prisma.analysisRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { analysisType: true } } },
    });
    if (!req) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });

    const quoteNumber = await getNextNumber('COT');

    // Calculate totals
    const quoteItems = (items ?? req.items ?? []).map((item: any) => {
      const unitPrice = item?.unitPrice ?? item?.analysisType?.basePrice ?? 0;
      const qty = item?.quantity ?? 1;
      return {
        analysisTypeId: item?.analysisTypeId ?? item?.analysisType?.id,
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
      };
    });

    // Read defaults from system configuration (IVA rate and quote validity)
    const [ivaConfig, validConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'iva_rate' } }),
      prisma.systemConfig.findUnique({ where: { key: 'quote_valid_days' } }),
    ]);
    const configRate = ivaConfig?.value ? parseFloat(ivaConfig.value) : 15;
    const configValidDays = validConfig?.value ? parseInt(validConfig.value) : 15;

    const subtotal = quoteItems.reduce((sum: number, i: any) => sum + (i?.totalPrice ?? 0), 0);
    const disc = discount ?? 0;
    const rate = taxRate ?? configRate;
    const taxable = subtotal - disc;
    const taxAmount = taxable * (rate / 100);
    const total = taxable + taxAmount;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        requestId,
        clientId: req.clientId,
        subtotal,
        discount: disc,
        taxRate: rate,
        taxAmount,
        total,
        validDays: validDays ?? configValidDays,
        notes: notes || null,
        conditions: conditions || null,
        status: 'BORRADOR',
        createdById: (session.user as any)?.id,
        items: { create: quoteItems },
      },
      include: { items: { include: { analysisType: true } }, client: true },
    });

    // Update request status
    await prisma.analysisRequest.update({
      where: { id: requestId },
      data: { status: 'EN_COTIZACION' },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'CREATE',
      entity: 'QUOTE',
      entityId: quote.id,
      details: `Cotización ${quoteNumber} creada - Total: $${total.toFixed(2)}`,
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error: any) {
    console.error('Quote POST error:', error);
    return NextResponse.json({ error: 'Error al crear cotización' }, { status: 500 });
  }
}
