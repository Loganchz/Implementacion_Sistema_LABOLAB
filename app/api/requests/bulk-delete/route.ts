export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getSessionClient } from '@/lib/portal';
import { hasPermission } from '@/lib/permissions';
import { buildQuoteLines } from '@/lib/quote-build';
import { deletionBlockReason } from '@/lib/sample-deletion';

const quoteTree = {
  include: {
    links: { select: { requestId: true } },
    workOrder: {
      include: {
        samples: { select: { id: true, status: true, sampleCode: true } },
        reports: { select: { id: true, status: true } },
      },
    },
  },
} as const;

function siblingIdsOf(quote: { requestId: string; links?: { requestId: string }[] | null }) {
  return [...new Set([quote.requestId, ...(quote.links ?? []).map((link) => link.requestId)])];
}

async function deleteQuoteChain(tx: any, quoteId: string) {
  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    include: { links: { select: { requestId: true } }, workOrder: { include: { samples: { select: { id: true } } } } },
  });
  if (!quote) return [] as string[];

  const requestIds = siblingIdsOf(quote);
  const workOrder = quote.workOrder;
  if (workOrder) {
    await tx.report.deleteMany({ where: { workOrderId: workOrder.id } });
    const sampleIds = (workOrder.samples ?? []).map((sample: { id: string }) => sample.id);
    if (sampleIds.length) {
      await tx.analysisResult.deleteMany({ where: { sampleId: { in: sampleIds } } });
    }
    await tx.sample.deleteMany({ where: { workOrderId: workOrder.id } });
    await tx.workOrderItem.deleteMany({ where: { workOrderId: workOrder.id } });
    await tx.workOrder.delete({ where: { id: workOrder.id } });
  }

  await tx.quoteItem.deleteMany({ where: { quoteId: quote.id } });
  await tx.quoteRequest.deleteMany({ where: { quoteId: quote.id } });
  await tx.quote.delete({ where: { id: quote.id } });
  await tx.analysisRequest.deleteMany({ where: { id: { in: requestIds } } });
  return requestIds;
}

async function removeRequestsFromQuote(tx: any, quoteId: string, removeIds: string[]) {
  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    include: {
      links: {
        include: {
          request: { include: { items: { include: { analysisType: true } } } },
        },
      },
      workOrder: { include: { samples: { select: { id: true } } } },
    },
  });
  if (!quote) return [] as string[];

  const remove = new Set(removeIds);
  const linked = (quote.links ?? []).map((link: any) => link.request).filter(Boolean);
  const remaining = linked.filter((req: any) => !remove.has(req.id));

  if (!linked.length || remaining.length === 0) {
    return deleteQuoteChain(tx, quote.id);
  }

  if (remove.has(quote.requestId)) {
    await tx.quote.update({ where: { id: quote.id }, data: { requestId: remaining[0].id } });
  }

  await tx.quoteItem.deleteMany({ where: { quoteId: quote.id } });
  const presentation = quote.presentation === 'CONSOLIDADA' ? 'CONSOLIDADA' : 'DETALLADA';
  const lines = buildQuoteLines(remaining, presentation);
  if (lines.length) {
    await tx.quoteItem.createMany({
      data: lines.map((line) => ({
        quoteId: quote.id,
        analysisTypeId: line.analysisTypeId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
        requestId: line.requestId,
        scopeKey: line.scopeKey,
        notes: line.notes,
      })),
    });
  }

  await tx.quoteRequest.deleteMany({ where: { quoteId: quote.id, requestId: { in: removeIds } } });

  const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const discount = Number(quote.discount ?? 0);
  const rate = Number(quote.taxRate ?? 15);
  const taxable = subtotal - discount;
  const taxAmount = taxable * (rate / 100);
  const numbers = remaining.map((req: any) => req.requestNumber).join(', ');
  const autoNotes = presentation === 'CONSOLIDADA'
    ? `Paquete consolidado (${remaining.length} muestras): ${numbers}`
    : `Proforma detallada (${remaining.length} muestras): ${numbers}`;

  await tx.quote.update({
    where: { id: quote.id },
    data: {
      subtotal,
      taxAmount,
      total: taxable + taxAmount,
      ...(typeof quote.notes === 'string' && (quote.notes.startsWith('Paquete consolidado') || quote.notes.startsWith('Proforma detallada'))
        ? { notes: autoNotes }
        : {}),
    },
  });

  await tx.analysisRequest.deleteMany({ where: { id: { in: removeIds } } });
  return removeIds;
}

export async function POST(request: Request) {
  try {
    const { session, role, userId } = await getSessionClient();
    if (!session || !userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!hasPermission(role ?? '', 'requests.edit')) {
      return NextResponse.json({ error: 'No tiene permiso para eliminar muestras' }, { status: 403 });
    }

    const body = await request.json();
    const rawIds = Array.isArray(body?.ids) ? (body.ids as unknown[]) : [];
    const ids: string[] = Array.from(new Set<string>(rawIds.filter((id): id is string => typeof id === 'string' && id.length > 0)));
    if (!ids.length) return NextResponse.json({ error: 'Seleccione al menos una muestra' }, { status: 400 });

    const rows = await prisma.analysisRequest.findMany({
      where: { id: { in: ids } },
      include: {
        quote: quoteTree,
        quoteLinks: { include: { quote: quoteTree } },
      },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));

    const blocked: { id: string; requestNumber: string; reason: string }[] = [];
    const deletable: typeof rows = [];
    for (const id of ids) {
      const row = byId.get(id);
      if (!row) {
        blocked.push({ id, requestNumber: id, reason: 'La muestra no existe o ya fue eliminada.' });
        continue;
      }
      const reason = deletionBlockReason(row);
      if (reason) blocked.push({ id: row.id, requestNumber: row.requestNumber, reason });
      else deletable.push(row);
    }

    const deleted: { id: string; requestNumber: string }[] = [];
    const skipped: { id: string; requestNumber: string; reason: string }[] = [];
    const handled = new Set<string>();

    await prisma.$transaction(async (tx) => {
      for (const row of deletable) {
        if (handled.has(row.id)) continue;
        const quote = row.quote ?? row.quoteLinks?.[0]?.quote ?? null;

        if (!quote) {
          await tx.analysisRequest.delete({ where: { id: row.id } });
          handled.add(row.id);
          deleted.push({ id: row.id, requestNumber: row.requestNumber });
          continue;
        }

        const siblings = siblingIdsOf(quote);
        const selected = new Set(deletable.map((item) => item.id));
        const allSelected = siblings.every((id) => selected.has(id));
        const accepted = quote.status === 'ACEPTADA';

        if (accepted && !allSelected) {
          handled.add(row.id);
          skipped.push({
            id: row.id,
            requestNumber: row.requestNumber,
            reason: 'Esta muestra pertenece a una proforma aceptada compartida. Seleccione todas las muestras de esa proforma para eliminarla, y solo si ninguna está en análisis.',
          });
          continue;
        }

        const removedIds = accepted ? siblings : siblings.filter((id) => selected.has(id));
        const gone = accepted
          ? await deleteQuoteChain(tx, quote.id)
          : await removeRequestsFromQuote(tx, quote.id, removedIds);

        for (const id of gone) {
          handled.add(id);
          const match = byId.get(id);
          if (match) deleted.push({ id: match.id, requestNumber: match.requestNumber });
        }
      }
    }, { timeout: 20000 });

    for (const item of deleted) {
      await createAuditLog({
        userId,
        action: 'DELETE',
        entity: 'REQUEST',
        entityId: item.id,
        details: `Solicitud ${item.requestNumber} eliminada desde la bandeja de ingreso`,
      });
    }

    return NextResponse.json({
      deleted,
      blocked: [...blocked, ...skipped],
    });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Error al eliminar las muestras' }, { status: 500 });
  }
}
