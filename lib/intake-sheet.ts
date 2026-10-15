import { storageConditionLabel } from '@/lib/storage-condition';

export function intakeText(value: unknown) {
  const text = String(value ?? '').trim();
  return text || 'N/A';
}

export function intakeDate(value: unknown) {
  if (!value) return 'N/A';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' });
}

export function intakeStorage(value: unknown) {
  return storageConditionLabel(typeof value === 'string' ? value : '') || 'N/A';
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function intakeFactPairs(sample: any): [string, string][] {
  const custom = Array.isArray(sample?.customAnalyses)
    ? sample.customAnalyses
        .map((row: any) => {
          const analysis = String(row?.analysis ?? '').trim();
          if (!analysis) return '';
          return `${analysis} (${intakeText(row?.technique)})`;
        })
        .filter(Boolean)
        .join('; ')
    : '';

  return [
    ['Producto', intakeText(sample?.productName || sample?.description)],
    ['Marca', intakeText(sample?.brand)],
    ['Lote', intakeText(sample?.lot)],
    ['Tipo de muestra', intakeText(sample?.sampleType?.name)],
    ['N° de muestras', sample?.sampleCount != null ? String(sample.sampleCount) : 'N/A'],
    ['Recepción', intakeDate(sample?.receptionDate)],
    ['Elaboración', intakeDate(sample?.elaborationDate)],
    ['Toma', intakeDate(sample?.samplingDate)],
    ['Vencimiento', intakeDate(sample?.expirationDate)],
    ['Envase y contenido', intakeText(sample?.packaging)],
    ['Contenido', intakeText(sample?.contentAmount)],
    ['Material de empaque', intakeText(sample?.packagingMaterial)],
    ['Localización', intakeText(sample?.location)],
    ['Conservación', intakeStorage(sample?.storageCondition)],
    ['Responsable', intakeText(sample?.responsibleName)],
    ['Toma de muestra por', intakeText(sample?.samplingBy)],
    ['Email factura', intakeText(sample?.invoiceEmail)],
    ['Email informe', intakeText(sample?.reportEmail)],
    ['Proforma de referencia', intakeText(sample?.quoteNumber)],
    ['Notificación sanitaria', sample?.isSanitaryNotification ? 'Sí' : 'N/A'],
    ['Porción', intakeText(sample?.servingSize)],
    ['Vida útil', intakeText(sample?.shelfLife)],
    ['Dilución', intakeText(sample?.dilution)],
    ['Análisis adicionales', custom || 'N/A'],
    ['Observaciones', intakeText(sample?.observations)],
  ];
}

export function intakeFactsHtml(sample: any) {
  const title = escapeHtml(sample?.requestNumber || 'Muestra');
  const cells = intakeFactPairs(sample)
    .map(([label, value]) => `<div><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</div>`)
    .join('');
  return `<div style="border:1px solid #ddd;border-radius:4px;padding:8px;margin:0 0 10px 0;">
    <div style="font-weight:bold;color:#005F9E;font-size:10px;text-transform:uppercase;margin-bottom:6px;">Ficha de ingreso ${title}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;font-size:10px;">${cells}</div>
  </div>`;
}
