export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { createLocalPdfJob } from '@/lib/pdf';

function fmtDate(d: any) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }); } catch { return ''; }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        items: { include: { analysisType: true } },
        samples: { include: { sampleType: true } },
        quote: { include: { request: { include: { sampleType: true } } } },
      },
    });
    if (!workOrder) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });

    const configs = await prisma.systemConfig.findMany({ where: { category: 'LABORATORIO' } });
    const getConfig = (key: string, def: string) => configs.find((c: any) => c?.key === key)?.value ?? def;
    const labAddress = getConfig('lab_address', 'Francisco Andrade Marín E7-29 y Diego de Almagro, Quito - Ecuador');
    const labPhone = getConfig('lab_phone', 'Telfs: 2563 225 / 2561 350 / 3238 503 / 3238 504 - Cel: 0999 590 412');
    const labEmail = getConfig('lab_email', 'informes@labolab.com.ec / secretaria@labolab.com.ec');

    const client = workOrder.client;
    const req: any = workOrder.quote?.request ?? {};
    const items = workOrder.items ?? [];
    const fqItems = items.filter((it: any) => it.area === 'FISICOQUIMICA');
    const micaItems = items.filter((it: any) => it.area === 'MICROBIOLOGIA');

    const renderParams = (list: any[]) => list.length
      ? list.map((it: any) => {
          const at = it.analysisType;
          const range = (at?.minValue != null && at?.maxValue != null)
            ? `${at.minValue} - ${at.maxValue}`
            : (at?.maxValue != null ? `≤ ${at.maxValue}` : (at?.minValue != null ? `≥ ${at.minValue}` : '-'));
          return `<tr><td>${at?.name ?? ''}</td><td style="text-align:center;">${at?.unit ?? '-'}</td><td>${at?.method ?? '-'}</td><td style="text-align:center;">${range}</td></tr>`;
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;color:#888;">Sin parámetros en esta área</td></tr>';

    const sampleDesc = req.productName || workOrder.samples?.[0]?.description || req.description || '-';
    const sampleType = req.sampleType?.name || workOrder.samples?.[0]?.sampleType?.name || '-';

    const html_content = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #00AEEF; padding-bottom: 10px; }
  .logo { font-size: 26px; font-weight: bold; color: #005F9E; }
  .logo span { color: #00AEEF; }
  .lab-info { text-align: right; font-size: 9px; color: #666; }
  .doc-title { text-align: center; font-size: 15px; font-weight: bold; color: #005F9E; margin: 12px 0 4px; text-transform: uppercase; }
  .doc-num { text-align: center; font-size: 13px; font-weight: bold; color: #00AEEF; margin-bottom: 12px; }
  table.info { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.info td { border: 1px solid #ccc; padding: 5px 8px; font-size: 10px; }
  table.info td.lbl { background: #f0f7fb; font-weight: bold; color: #005F9E; width: 22%; }
  .section h4 { color: #fff; background: #005F9E; font-size: 11px; text-transform: uppercase; padding: 5px 8px; margin: 12px 0 0; }
  table.params { width: 100%; border-collapse: collapse; }
  table.params th { background: #00AEEF; color: #fff; padding: 5px 8px; text-align: left; font-size: 10px; }
  table.params td { border-bottom: 1px solid #eee; padding: 4px 8px; font-size: 10px; }
  .obs { border: 1px solid #ccc; min-height: 40px; padding: 6px; margin-top: 12px; font-size: 10px; }
  .foot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; font-size: 10px; }
  .foot-box { border: 1px solid #ccc; padding: 8px; }
  .signatures { display: flex; justify-content: space-around; margin-top: 45px; }
  .sig-block { text-align: center; width: 220px; }
  .sig-line { border-top: 1px solid #333; margin-top: 35px; padding-top: 5px; font-size: 10px; }
  .note { font-size: 8px; color: #888; margin-top: 8px; }
</style></head><body>
  <div class="header">
    <div class="logo">LAB<span>O</span>LAB</div>
    <div class="lab-info">
      <div>${labAddress}</div>
      <div>${labPhone}</div>
      <div>${labEmail}</div>
    </div>
  </div>

  <div class="doc-title">Orden de Trabajo</div>
  <div class="doc-num">N° ${workOrder.orderNumber ?? ''}</div>

  <table class="info">
    <tr><td class="lbl">Fecha de recepción</td><td>${fmtDate(req.receptionDate || workOrder.receivedAt)}</td><td class="lbl">Cliente</td><td>${client?.name ?? ''}</td></tr>
    <tr><td class="lbl">Muestra</td><td>${sampleType}</td><td class="lbl">Descripción de la muestra</td><td>${sampleDesc}</td></tr>
    <tr><td class="lbl">Marca / Lote</td><td>${[req.brand, req.lot].filter(Boolean).join(' / ') || '-'}</td><td class="lbl">N° de muestras</td><td>${req.sampleCount ?? workOrder.samples?.length ?? '-'}</td></tr>
    <tr><td class="lbl">Envase</td><td>${req.packaging ?? '-'}</td><td class="lbl">Contenido</td><td>${req.contentAmount ?? '-'}</td></tr>
    <tr><td class="lbl">Condiciones de conservación</td><td>${req.storageCondition ?? '-'}</td><td class="lbl">Toma de muestra por</td><td>${req.samplingBy ?? req.responsibleName ?? '-'}</td></tr>
    <tr><td class="lbl">Fecha elaboración</td><td>${fmtDate(req.elaborationDate) || '-'}</td><td class="lbl">Fecha vencimiento</td><td>${fmtDate(req.expirationDate) || '-'}</td></tr>
  </table>

  <div class="section"><h4>Parámetros Microbiológicos</h4>
    <table class="params"><thead><tr><th>Parámetro</th><th>Unidad</th><th>Método</th><th>Rango</th></tr></thead>
    <tbody>${renderParams(micaItems)}</tbody></table>
  </div>

  <div class="section"><h4>Parámetros Físico Químicos</h4>
    <table class="params"><thead><tr><th>Parámetro</th><th>Unidad</th><th>Método</th><th>Rango</th></tr></thead>
    <tbody>${renderParams(fqItems)}</tbody></table>
  </div>

  <div class="obs"><b>Observaciones:</b><br/>${req.observations ?? workOrder.notes ?? ''}</div>

  <div class="foot-grid">
    <div class="foot-box">Proforma / Factura N°: ____________________</div>
    <div class="foot-box">Declaración de conformidad: ¡incluida en el informe de resultados!</div>
  </div>

  <div class="signatures">
    <div class="sig-block"><div class="sig-line">Revisado por</div></div>
    <div class="sig-block"><div class="sig-line">Autorizado por</div></div>
  </div>

  <div class="note">(*) Parámetro subcontratado. Este documento corresponde únicamente a las muestras descritas. Fecha de emisión: ${fmtDate(new Date())}.</div>
</body></html>`;

    const request_id = await createLocalPdfJob(html_content, {
      format: 'A4',
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
      print_background: true,
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'GENERATE_PDF',
      entity: 'WORK_ORDER',
      entityId: workOrder.id,
      details: `PDF de OT ${workOrder.orderNumber} generado`,
    });

    return NextResponse.json({ success: true, request_id });
  } catch (error: any) {
    console.error('WorkOrder PDF error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
