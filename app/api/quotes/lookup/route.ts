export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionClient } from '@/lib/portal';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const { session, role, client } = await getSessionClient();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!hasPermission(role ?? '', 'quotes.view') && !hasPermission(role ?? '', 'requests.create')) {
      return NextResponse.json({ error: 'No tiene permiso para consultar proformas' }, { status: 403 });
    }

    const number = new URL(request.url).searchParams.get('number')?.trim() ?? '';
    if (!number || /^n\/?a$/i.test(number)) {
      return NextResponse.json({ error: 'Indique el número de proforma' }, { status: 400 });
    }

    const quote = await prisma.quote.findUnique({
      where: { quoteNumber: number },
      select: {
        quoteNumber: true,
        clientId: true,
        client: { select: { name: true } },
        items: {
          select: {
            analysisTypeId: true,
            analysisType: { select: { code: true, name: true } },
          },
        },
      },
    });
    if (!quote) return NextResponse.json({ error: 'No existe una proforma con ese número' }, { status: 404 });

    if (role === 'CLIENTE' && client && quote.clientId !== client.id) {
      return NextResponse.json({ error: 'Esa proforma no pertenece a su cuenta' }, { status: 404 });
    }

    const seen = new Set<string>();
    const items = quote.items.filter((item) => {
      if (seen.has(item.analysisTypeId)) return false;
      seen.add(item.analysisTypeId);
      return true;
    });

    return NextResponse.json({
      quoteNumber: quote.quoteNumber,
      clientId: quote.clientId,
      clientName: quote.client.name,
      analysisTypeIds: items.map((item) => item.analysisTypeId),
      codes: items.map((item) => item.analysisType.code),
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar la proforma' }, { status: 500 });
  }
}
