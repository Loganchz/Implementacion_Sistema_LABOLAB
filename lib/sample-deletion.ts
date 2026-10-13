const LAB_SAMPLE_STATUSES = new Set(['EN_ANALISIS', 'ANALIZADA']);
const LAB_ORDER_STATUSES = new Set(['EN_PROCESO', 'COMPLETADA', 'ENTREGADA']);

export interface DeletionWorkOrder {
  status?: string | null;
  samples?: { status?: string | null }[] | null;
  reports?: { id?: string | null }[] | null;
}

export interface DeletionQuote {
  status?: string | null;
  workOrder?: DeletionWorkOrder | null;
}

export interface DeletionRow {
  requestNumber?: string | null;
  status?: string | null;
  quote?: DeletionQuote | null;
  quoteLinks?: { quote?: DeletionQuote | null }[] | null;
}

export function resolveLinkedQuote(row: DeletionRow): DeletionQuote | null {
  return row?.quote ?? row?.quoteLinks?.[0]?.quote ?? null;
}

/**
 * ISO/IEC 17025: una muestra aprobada que ya entró a análisis no se puede borrar,
 * porque el informe debe conservar su trazabilidad.
 */
export function deletionBlockReason(row: DeletionRow): string | null {
  const quote = resolveLinkedQuote(row);
  const workOrder = quote?.workOrder ?? null;
  const samples = workOrder?.samples ?? [];
  const approved = row?.status === 'CONFIRMADA' || quote?.status === 'ACEPTADA';
  const inAnalysis =
    samples.some((sample) => LAB_SAMPLE_STATUSES.has(sample?.status ?? '')) ||
    LAB_ORDER_STATUSES.has(workOrder?.status ?? '') ||
    (workOrder?.reports?.length ?? 0) > 0;

  if (approved && inAnalysis) {
    const number = row?.requestNumber ?? 'seleccionada';
    return `La muestra ${number} ya está aprobada y en análisis en laboratorio. ISO 17025 impide eliminarla para proteger la trazabilidad legal del informe.`;
  }
  return null;
}
