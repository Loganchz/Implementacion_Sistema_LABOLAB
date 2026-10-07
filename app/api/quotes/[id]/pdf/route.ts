export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { createLocalPdfJob } from '@/lib/pdf';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        request: {
          include: { items: { include: { analysisType: true } } },
        },
        items: { include: { analysisType: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!quote) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

    const configs = await prisma.systemConfig.findMany({ where: { category: 'LABORATORIO' } });
    const getConfig = (key: string, def: string) => configs.find((c: any) => c?.key === key)?.value ?? def;
    const labName = getConfig('lab_name', 'LABOLAB');
    const labAddress = getConfig('lab_address', 'Francisco Andrade Marín E7-29 y Diego de Almagro, Quito - Ecuador');
    const labPhone = getConfig('lab_phone', 'Telfs. 2563 225 / 2561 350 / 3238 503 / 3238 504 / Cel.: 0999 590 412');
    const labEmail = getConfig('lab_email', 'informes@labolab.com.ec / secretaria@labolab.com.ec');

    const client = quote.client;
    const req = quote.request;
    const sampleCount = req?.sampleCount ?? 1;

    // Build items table
    let itemsHtml = '';
    let idx = 1;
    const fqItems = (quote.items ?? []).filter((i: any) => i?.analysisType?.area === 'FISICOQUIMICA');
    const micaItems = (quote.items ?? []).filter((i: any) => i?.analysisType?.area === 'MICROBIOLOGIA');

    const renderItems = (items: any[], areaLabel: string) => {
      if (!items.length) return '';
      let html = `<tr><td colspan="7" style="background:#e8f4fd;font-weight:bold;color:#005F9E;font-size:10px;padding:6px 8px;">PARÁMETROS ${areaLabel}</td></tr>`;
      for (const item of items) {
        const at = item?.analysisType;
        const rangeStr = at?.minValue != null && at?.maxValue != null
          ? `${at.minValue} - ${at.maxValue} ${at.unit ?? ''}`
          : at?.maxValue != null ? `≤ ${at.maxValue} ${at.unit ?? ''}`
          : at?.minValue != null ? `≥ ${at.minValue} ${at.unit ?? ''}`
          : '-';
        html += `
          <tr>
            <td style="text-align:center;">${idx++}</td>
            <td>${at?.name ?? ''}</td>
            <td style="font-size:9px;">${at?.method ?? '-'}</td>
            <td style="text-align:center;font-size:9px;">${rangeStr}</td>
            <td style="text-align:right;">$${(item?.unitPrice ?? 0).toFixed(2)}</td>
            <td style="text-align:center;">${item?.quantity ?? 1}</td>
            <td style="text-align:right;">$${(item?.totalPrice ?? 0).toFixed(2)}</td>
          </tr>`;
      }
      return html;
    };

    itemsHtml = renderItems(fqItems, 'FÍSICO QUÍMICOS') + renderItems(micaItems, 'MICROBIOLÓGICOS');

    const dateStr = new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', day: '2-digit', month: 'long', year: 'numeric' });
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (quote.validDays ?? 15));
    const validStr = validUntil.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', day: '2-digit', month: 'long', year: 'numeric' });

    const html_content = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #00AEEF; padding-bottom: 10px; margin-bottom: 15px; }
  .logo { font-size: 24px; font-weight: bold; color: #005F9E; }
  .logo span { color: #00AEEF; }
  .lab-info { text-align: right; font-size: 9px; color: #666; }
  .title-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .title { font-size: 18px; font-weight: bold; color: #005F9E; text-transform: uppercase; }
  .proforma-num { font-size: 16px; font-weight: bold; color: #dc2626; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
  .info-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px; }
  .info-box h4 { margin: 0 0 6px 0; color: #005F9E; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 3px; }
  .info-row { display: flex; margin: 2px 0; font-size: 10px; }
  .info-label { font-weight: bold; width: 110px; color: #555; }
  .info-value { flex: 1; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #005F9E; color: white; padding: 5px 6px; text-align: left; font-size: 9px; }
  td { padding: 4px 6px; border-bottom: 1px solid #eee; font-size: 10px; }
  tr:nth-child(even) { background: #f8f9fa; }
  .totals { width: 280px; margin-left: auto; margin-top: 10px; }
  .totals td { padding: 4px 8px; border: none; font-size: 11px; }
  .totals .total-row { font-weight: bold; font-size: 13px; color: #005F9E; border-top: 2px solid #005F9E; }
  .conditions { margin-top: 25px; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-size: 9px; line-height: 1.6; }
  .conditions h4 { margin: 0 0 6px 0; color: #005F9E; font-size: 10px; }
  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head>
<body>
  <div class="header">
    <div class="logo">LAB<span>O</span>LAB</div>
    <div class="lab-info">
      <div style="font-weight:bold;">${labName}</div>
      <div>ANÁLISIS DE ALIMENTOS, AGUAS Y AFINES</div>
      <div>${labAddress}</div>
      <div>${labPhone}</div>
      <div>${labEmail}</div>
    </div>
  </div>

  <div class="title-bar">
    <div class="title">Proforma / Cotización</div>
    <div class="proforma-num">N° ${quote.quoteNumber}</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Datos del Cliente</h4>
      <div class="info-row"><span class="info-label">Cliente:</span><span class="info-value">${client?.name ?? ''}</span></div>
      <div class="info-row"><span class="info-label">RUC/Cédula:</span><span class="info-value">${client?.ruc ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">Dirección:</span><span class="info-value">${client?.address ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">Teléfono:</span><span class="info-value">${client?.phone ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${client?.email ?? '-'}</span></div>
    </div>
    <div class="info-box">
      <h4>Datos de la Proforma</h4>
      <div class="info-row"><span class="info-label">Fecha:</span><span class="info-value">${dateStr}</span></div>
      <div class="info-row"><span class="info-label">Solicitud:</span><span class="info-value">${req?.requestNumber ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">Muestra:</span><span class="info-value">${req?.productName ?? req?.description ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">N° Muestras:</span><span class="info-value">${sampleCount}</span></div>
      <div class="info-row"><span class="info-label">Vigencia:</span><span class="info-value">${quote.validDays} días (hasta ${validStr})</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center;">#</th>
        <th>Parámetro</th>
        <th>Método / Norma</th>
        <th style="text-align:center;">Rango</th>
        <th style="text-align:right;">P. Unit.</th>
        <th style="text-align:center;">Cant.</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || '<tr><td colspan="7" style="text-align:center">Sin ítems</td></tr>'}
    </tbody>
  </table>

  <table class="totals">
    <tr><td style="text-align:right;">Subtotal:</td><td style="text-align:right;">$${(quote.subtotal ?? 0).toFixed(2)}</td></tr>
    ${quote.discount ? `<tr><td style="text-align:right;">Descuento:</td><td style="text-align:right;color:#dc2626;">-$${(quote.discount).toFixed(2)}</td></tr>` : ''}
    <tr><td style="text-align:right;">IVA (${quote.taxRate ?? 15}%):</td><td style="text-align:right;">$${(quote.taxAmount ?? 0).toFixed(2)}</td></tr>
    <tr class="total-row"><td style="text-align:right;">TOTAL:</td><td style="text-align:right;">$${(quote.total ?? 0).toFixed(2)}</td></tr>
  </table>

  ${quote.notes ? `<div style="margin-top:12px;font-size:10px;"><b>Notas:</b> ${quote.notes}</div>` : ''}

  <div class="conditions">
    <h4>Condiciones Generales</h4>
    ${quote.conditions || `<ul style="margin:0;padding-left:15px;">
      <li>Los precios incluyen IVA.</li>
      <li>El plazo de entrega de resultados depende del tipo de análisis solicitado y se contará a partir de la recepción de la(s) muestra(s) en el laboratorio.</li>
      <li>Las muestras deben entregarse en envases adecuados y en las condiciones de conservación requeridas para cada tipo de análisis.</li>
      <li>LABOLAB se reserva el derecho de rechazar muestras que no cumplan los criterios de aceptación.</li>
      <li>Los resultados corresponden exclusivamente a las muestras analizadas.</li>
      <li>Esta proforma tiene una vigencia de ${quote.validDays ?? 15} días calendario a partir de la fecha de emisión.</li>
      <li>Forma de pago: contado / transferencia bancaria.</li>
    </ul>`}
  </div>

  <div class="footer">
    <p>${labName} &mdash; ${labAddress}</p>
    <p>${labPhone} | ${labEmail}</p>
    <p>Acreditación SAE LEN 06-001 | NTE INEN ISO/IEC 17025:2018</p>
  </div>
</body>
</html>`;

    const request_id = await createLocalPdfJob(html_content, {
      format: 'A4',
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      print_background: true,
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'GENERATE_REPORT',
      entity: 'QUOTE',
      entityId: quote.id,
      details: `PDF generado para proforma ${quote.quoteNumber}`,
    });

    return NextResponse.json({ success: true, request_id });
  } catch (error: any) {
    console.error('Quote PDF error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
