export type IntakeCheckInput = {
  clientId?: string | null;
  sampleTypeId?: string | null;
  productName?: string | null;
  lot?: string | null;
  sampleCount?: string | number | null;
  receptionDate?: string | null;
  analysisTypeIds?: string[] | null;
};

export type IntakeField =
  | 'clientId'
  | 'sampleTypeId'
  | 'productName'
  | 'lot'
  | 'sampleCount'
  | 'receptionDate'
  | 'analysisTypeIds';

export function checkIntake(input: IntakeCheckInput) {
  const fields: IntakeField[] = [];
  const messages: string[] = [];

  if (!input.clientId) {
    fields.push('clientId');
    messages.push('Seleccione un cliente');
  }
  if (!input.sampleTypeId) {
    fields.push('sampleTypeId');
    messages.push('Seleccione el tipo de muestra');
  }
  if (!String(input.productName ?? '').trim()) {
    fields.push('productName');
    messages.push('Escriba el nombre del producto');
  }
  if (!String(input.lot ?? '').trim()) {
    fields.push('lot');
    messages.push('Escriba el lote');
  }
  if (!input.analysisTypeIds?.length) {
    fields.push('analysisTypeIds');
    messages.push('Seleccione al menos un parámetro');
  }
  if (!input.receptionDate) {
    fields.push('receptionDate');
    messages.push('Indique la fecha de recepción');
  }

  const sampleCount = String(input.sampleCount ?? '').trim();
  if (!sampleCount || !/^\d+$/.test(sampleCount) || parseInt(sampleCount, 10) < 1) {
    fields.push('sampleCount');
    messages.push('Indique el número de muestras');
  }

  return { ok: messages.length === 0, messages, fields, sampleCount };
}
