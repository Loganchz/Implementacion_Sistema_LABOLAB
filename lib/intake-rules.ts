import { storageConditionCodes } from '@/lib/storage-condition';

export type CustomAnalysisItem = {
  analysis: string;
  technique: string;
};

export type IntakeCheckInput = {
  clientId?: string | null;
  sampleTypeId?: string | null;
  productName?: string | null;
  lot?: string | null;
  sampleCount?: string | number | null;
  receptionDate?: string | null;
  storageCondition?: string | null;
  analysisTypeIds?: string[] | null;
  hasCustomAnalyses?: boolean | null;
  customAnalyses?: CustomAnalysisItem[] | null;
};

export type IntakeField =
  | 'clientId'
  | 'sampleTypeId'
  | 'productName'
  | 'lot'
  | 'sampleCount'
  | 'receptionDate'
  | 'storageCondition'
  | 'analysisTypeIds'
  | 'quoteNumber'
  | 'form';

export type IntakeIssue = {
  field: IntakeField;
  label: string;
  message: string;
};

export function toNA(val?: string | null): string {
  const trimmed = String(val ?? '').trim();
  return trimmed || 'N/A';
}

function pushIssue(issues: IntakeIssue[], field: IntakeField, label: string, message: string) {
  issues.push({ field, label, message });
}

export function issueFromServer(error?: string): IntakeIssue {
  const message = String(error ?? '').trim() || 'El servidor no pudo guardar la solicitud.';
  if (/proforma/i.test(message)) return { field: 'quoteNumber', label: 'No. de proforma', message };
  if (/borrador/i.test(message)) return { field: 'form', label: 'Estado de la solicitud', message };
  if (/cliente/i.test(message) && !/proforma/i.test(message)) return { field: 'clientId', label: 'Cliente', message };
  if (/tipo de muestra/i.test(message)) return { field: 'sampleTypeId', label: 'Tipo de muestra', message };
  if (/producto/i.test(message)) return { field: 'productName', label: 'Nombre del producto', message };
  if (/lote/i.test(message)) return { field: 'lot', label: 'Lote', message };
  if (/muestra/i.test(message) && /n[uú]mero/i.test(message)) return { field: 'sampleCount', label: 'Número de muestras', message };
  if (/recepci[oó]n/i.test(message)) return { field: 'receptionDate', label: 'Fecha de recepción', message };
  if (/conservaci[oó]n/i.test(message)) return { field: 'storageCondition', label: 'Conservación', message };
  if (/par[aá]metro|an[aá]lisis/i.test(message)) return { field: 'analysisTypeIds', label: 'Parámetros', message };
  return { field: 'form', label: 'Guardado', message };
}

export function checkIntake(input: IntakeCheckInput) {
  const issues: IntakeIssue[] = [];

  if (!input.clientId) {
    pushIssue(issues, 'clientId', 'Cliente', 'Falta el cliente. Sin ese dato la solicitud no tiene titular.');
  }
  if (!input.sampleTypeId) {
    pushIssue(issues, 'sampleTypeId', 'Tipo de muestra', 'Falta el tipo de muestra. Sin la matriz no se sabe qué ensayos corresponden.');
  }
  if (!input.receptionDate) {
    pushIssue(issues, 'receptionDate', 'Fecha de recepción', 'Falta la fecha de recepción. Indique el día en que la muestra entra al laboratorio.');
  }
  if (!String(input.productName ?? '').trim()) {
    pushIssue(issues, 'productName', 'Nombre del producto', 'Falta el nombre del producto. Escriba qué muestra es.');
  }
  if (!String(input.lot ?? '').trim()) {
    pushIssue(issues, 'lot', 'Lote', 'Falta el lote. Sirve para identificar esta muestra y no se puede dejar vacío.');
  }

  const sampleCount = String(input.sampleCount ?? '').trim();
  if (!sampleCount) {
    pushIssue(issues, 'sampleCount', 'Número de muestras', 'El número de muestras está vacío. Escriba cuántos recipientes ingresan, por ejemplo 1.');
  } else if (!/^\d+$/.test(sampleCount)) {
    pushIssue(issues, 'sampleCount', 'Número de muestras', `«${sampleCount}» no es un número entero. Use solo cifras, sin decimales ni letras.`);
  } else if (parseInt(sampleCount, 10) < 1) {
    pushIssue(issues, 'sampleCount', 'Número de muestras', 'El número de muestras tiene que ser 1 o más.');
  }

  if (!storageConditionCodes(input.storageCondition).length) {
    pushIssue(issues, 'storageCondition', 'Conservación', 'No hay ninguna condición marcada. Elija ambiente, refrigeración, congelación o más de una.');
  }

  const hasCustom = Boolean(input.hasCustomAnalyses);
  const validCustom = (input.customAnalyses ?? []).filter((item) => String(item.analysis ?? '').trim().length > 0);
  const hasStandard = Boolean(input.analysisTypeIds?.length);
  if (!hasStandard && (!hasCustom || validCustom.length === 0)) {
    pushIssue(
      issues,
      'analysisTypeIds',
      'Parámetros',
      hasCustom
        ? 'Eligió análisis diferentes, pero ninguna fila tiene el nombre del análisis.'
        : 'No hay parámetros marcados. Seleccione al menos uno en la tabla de la norma.',
    );
  }

  return {
    ok: issues.length === 0,
    messages: issues.map((issue) => `${issue.label}: ${issue.message}`),
    fields: issues.map((issue) => issue.field),
    issues,
    sampleCount,
  };
}

