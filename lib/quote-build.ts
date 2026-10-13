export type QuotePresentationMode = 'DETALLADA' | 'CONSOLIDADA';

export interface QuoteSourceItem {
  analysisTypeId: string;
  quantity?: number | null;
  analysisType?: { basePrice?: number | null; name?: string | null; area?: string | null } | null;
}

export interface QuoteSourceRequest {
  id: string;
  requestNumber: string;
  productName?: string | null;
  description?: string | null;
  items?: QuoteSourceItem[] | null;
}

export interface BuiltQuoteLine {
  analysisTypeId: string;
  name: string;
  area: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requestId: string | null;
  scopeKey: string;
  notes: string;
}

function sampleCaption(req: QuoteSourceRequest) {
  const label = req.productName || req.description || 'Muestra';
  return `${req.requestNumber} · ${label}`;
}

export function buildQuoteLines(requests: QuoteSourceRequest[], presentation: QuotePresentationMode): BuiltQuoteLine[] {
  if (presentation === 'CONSOLIDADA') {
    const map = new Map<string, BuiltQuoteLine>();
    for (const req of requests ?? []) {
      for (const item of req.items ?? []) {
        const unitPrice = Number(item?.analysisType?.basePrice ?? 0);
        const quantity = item?.quantity ?? 1;
        const prev = map.get(item.analysisTypeId);
        if (prev) {
          prev.quantity += quantity;
          prev.totalPrice = prev.unitPrice * prev.quantity;
          continue;
        }
        map.set(item.analysisTypeId, {
          analysisTypeId: item.analysisTypeId,
          name: item?.analysisType?.name ?? 'Ensayo',
          area: item?.analysisType?.area ?? null,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
          requestId: null,
          scopeKey: 'PKG',
          notes: 'Paquete consolidado',
        });
      }
    }
    return [...map.values()];
  }

  return (requests ?? []).flatMap((req) =>
    (req.items ?? []).map((item) => {
      const unitPrice = Number(item?.analysisType?.basePrice ?? 0);
      const quantity = item?.quantity ?? 1;
      return {
        analysisTypeId: item.analysisTypeId,
        name: item?.analysisType?.name ?? 'Ensayo',
        area: item?.analysisType?.area ?? null,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        requestId: req.id,
        scopeKey: req.id,
        notes: sampleCaption(req),
      };
    })
  );
}
