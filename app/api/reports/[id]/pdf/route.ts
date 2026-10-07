export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import QRCode from 'qrcode';
import { createLocalPdfJob } from '@/lib/pdf';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        workOrder: {
          include: {
            client: true,
            quote: { include: { request: true } },
            samples: {
              include: {
                sampleType: true,
                results: {
                  include: { analysisType: true, analyst: { select: { name: true } } },
                  where: { status: { in: ['COMPLETADO', 'VERIFICADO'] } },
                },
              },
            },
          },
        },
        createdBy: { select: { name: true } },
      },
    });

    if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });

    // Un CLIENTE solo puede descargar informes EMITIDOS/ENVIADOS de sus propias órdenes
    const role = (session.user as any)?.role;
    if (role === 'CLIENTE') {
      const ownerUserId = report.workOrder?.client?.userId ?? null;
      const isOwner = ownerUserId && ownerUserId === (session.user as any)?.id;
      const isIssued = report.status === 'EMITIDO' || report.status === 'ENVIADO';
      if (!isOwner || !isIssued) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    // Get lab config
    const configs = await prisma.systemConfig.findMany({ where: { category: 'LABORATORIO' } });
    const getConfig = (key: string, def: string) => configs.find((c: any) => c?.key === key)?.value ?? def;

    const labName = getConfig('lab_name', 'LABOLAB');
    const labAddress = getConfig('lab_address', 'Ecuador');
    const labPhone = getConfig('lab_phone', '');
    const labEmail = getConfig('lab_email', '');

    const client = report.workOrder?.client;
    const samples = report.workOrder?.samples ?? [];
    const req: any = report.workOrder?.quote?.request ?? {};

    // Generar código QR de verificación de autenticidad
    const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verificar/${encodeURIComponent(report.reportNumber)}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1, color: { dark: '#005F9E', light: '#ffffff' } });
    } catch (e) { console.error('QR error:', e); }

    // Build results table rows
    let resultsHtml = '';
    let hasAnyNonConforming = false;
    for (const sample of samples) {
      for (const result of (sample?.results ?? [])) {
        const at = result?.analysisType;
        const isNonConforming = result?.outOfRange === true;
        if (isNonConforming) hasAnyNonConforming = true;
        const rangeStr = at?.minValue != null && at?.maxValue != null
          ? `${at.minValue} - ${at.maxValue}`
          : at?.maxValue != null ? `≤ ${at.maxValue}`
          : at?.minValue != null ? `≥ ${at.minValue}`
          : '-';
        const conformityLabel = result?.numericValue != null
          ? (isNonConforming ? '<span style="color:red;font-weight:bold;">No conforme</span>' : '<span style="color:#059669;font-weight:bold;">Conforme</span>')
          : '-';
        resultsHtml += `
          <tr>
            <td>${sample?.sampleCode ?? ''}</td>
            <td>${at?.name ?? ''}</td>
            <td style="font-size:9px;">${at?.method ?? '-'}</td>
            <td style="text-align:center;font-weight:bold;${isNonConforming ? 'color:red;' : ''}">${result?.value ?? result?.numericValue ?? '-'}</td>
            <td>${result?.unit ?? ''}</td>
            <td style="text-align:center;">${rangeStr}</td>
            <td style="text-align:center;">${conformityLabel}</td>
          </tr>`;
      }
    }

    const html_content = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #00AEEF; padding-bottom: 10px; margin-bottom: 20px; }
  .logo { font-size: 24px; font-weight: bold; color: #005F9E; }
  .logo span { color: #00AEEF; }
  .lab-info { text-align: right; font-size: 9px; color: #666; }
  .report-title { text-align: center; font-size: 16px; font-weight: bold; color: #005F9E; margin: 15px 0; text-transform: uppercase; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
  .info-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px; }
  .info-box h4 { margin: 0 0 8px 0; color: #005F9E; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .info-row { display: flex; margin: 3px 0; }
  .info-label { font-weight: bold; width: 120px; color: #555; }
  .info-value { flex: 1; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th { background: #005F9E; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
  tr:nth-child(even) { background: #f8f9fa; }
  .footer { margin-top: 40px; border-top: 2px solid #00AEEF; padding-top: 10px; }
  .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
  .sig-block { text-align: center; width: 200px; }
  .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; font-size: 10px; }
  .sig-name { font-weight: bold; }
  .section { margin: 18px 0; }
  .section h4 { color: #005F9E; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px; margin: 0 0 6px 0; }
  .section p { margin: 0; white-space: pre-wrap; font-size: 10px; line-height: 1.5; }
</style></head>
<body>
  <div class="header">
    <div class="logo">LAB<span>O</span>LAB</div>
    <div class="lab-info">
      <div>${labName}</div>
      <div>${labAddress}</div>
      <div>${labPhone} | ${labEmail}</div>
    </div>
  </div>

  <div class="report-title">Informe de Resultados</div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Datos del Cliente</h4>
      <div class="info-row"><span class="info-label">Cliente:</span><span class="info-value">${client?.name ?? ''}</span></div>
      <div class="info-row"><span class="info-label">RUC/Cédula:</span><span class="info-value">${client?.ruc ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">Dirección:</span><span class="info-value">${client?.address ?? '-'}</span></div>
    </div>
    <div class="info-box">
      <h4>Datos del Informe</h4>
      <div class="info-row"><span class="info-label">N° Informe:</span><span class="info-value">${report?.reportNumber ?? ''}</span></div>
      <div class="info-row"><span class="info-label">N° OT:</span><span class="info-value">${report.workOrder?.orderNumber ?? ''}</span></div>
      <div class="info-row"><span class="info-label">Fecha:</span><span class="info-value">${new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' })}</span></div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Información de la Muestra</h4>
      <div class="info-row"><span class="info-label">Producto:</span><span class="info-value">${req.productName ?? req.description ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">Marca / Lote:</span><span class="info-value">${[req.brand, req.lot].filter(Boolean).join(' / ') || '-'}</span></div>
      <div class="info-row"><span class="info-label">Envase:</span><span class="info-value">${req.packaging ?? '-'}</span></div>
    </div>
    <div class="info-box">
      <h4>Recepción</h4>
      <div class="info-row"><span class="info-label">Conservación:</span><span class="info-value">${req.storageCondition ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">Contenido:</span><span class="info-value">${req.contentAmount ?? '-'}</span></div>
      <div class="info-row"><span class="info-label">N° Muestras:</span><span class="info-value">${req.sampleCount ?? samples.length ?? '-'}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Muestra</th>
        <th>Análisis</th>
        <th>Método</th>
        <th>Resultado</th>
        <th>Unidad</th>
        <th>Límite</th>
        <th>Declaración</th>
      </tr>
    </thead>
    <tbody>
      ${resultsHtml || '<tr><td colspan="7" style="text-align:center">Sin resultados</td></tr>'}
    </tbody>
  </table>

  <div class="section" style="margin-top:20px;padding:10px;border:1px solid ${hasAnyNonConforming ? '#dc2626' : '#059669'};border-radius:4px;background:${hasAnyNonConforming ? '#fef2f2' : '#f0fdf4'};">
    <h4 style="color:${hasAnyNonConforming ? '#dc2626' : '#059669'};border:none;margin-bottom:4px;">Declaración de Conformidad</h4>
    <p style="font-size:11px;">De acuerdo con los resultados obtenidos y los límites normativos aplicables, la muestra analizada <b style="color:${hasAnyNonConforming ? '#dc2626' : '#059669'};">${hasAnyNonConforming ? 'NO ESTÁ CONFORME' : 'ESTÁ CONFORME'}</b> con los requisitos establecidos en las normas de referencia.</p>
  </div>

  ${report?.observations ? `<div class="section"><h4>Observaciones</h4><p>${report.observations}</p></div>` : ''}
  ${report?.conclusions ? `<div class="section"><h4>Conclusiones</h4><p>${report.conclusions}</p></div>` : ''}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">${report?.analystName ? `<span class="sig-name">${report.analystName}</span><br/>` : ''}Analista Responsable</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${report?.directorName ? `<span class="sig-name">${report.directorName}</span><br/>` : ''}Director Técnico</div>
    </div>
  </div>

  <div class="footer">
    <table style="width:100%;border:none;margin:0;"><tr style="background:none;">
      <td style="border:none;vertical-align:middle;width:130px;">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR de verificación" style="width:110px;height:110px;" />` : ''}
      </td>
      <td style="border:none;vertical-align:middle;">
        <div style="font-size:10px;font-weight:bold;color:#005F9E;margin-bottom:3px;">Verificación de autenticidad</div>
        <div style="font-size:9px;color:#555;">Escanee el código QR o visite el siguiente enlace para comprobar la autenticidad de este informe:</div>
        <div style="font-size:9px;color:#00AEEF;word-break:break-all;margin-top:2px;">${verifyUrl}</div>
        <div style="font-size:9px;color:#555;margin-top:2px;">Código del informe: <b>${report.reportNumber}</b></div>
      </td>
    </tr></table>
    <small style="display:block;margin-top:10px;">Este informe no puede ser reproducido parcialmente sin autorización del laboratorio. Los resultados corresponden únicamente a las muestras analizadas.</small>
  </div>
</body>
</html>`;

    const request_id = await createLocalPdfJob(html_content, {
      format: 'A4',
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      print_background: true,
    });

    // Update report status (preserve original emission date on regeneration)
    await prisma.report.update({
      where: { id: params.id },
      data: {
        status: report.status === 'ENVIADO' ? 'ENVIADO' : 'EMITIDO',
        ...(report.emittedAt ? {} : { emittedAt: new Date() }),
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'GENERATE_REPORT',
      entity: 'REPORT',
      entityId: report.id,
      details: `PDF generado para reporte ${report.reportNumber}`,
    });

    return NextResponse.json({ success: true, request_id });
  } catch (error: any) {
    console.error('Report PDF error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
