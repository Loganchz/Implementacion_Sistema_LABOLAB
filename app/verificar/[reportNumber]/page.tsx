export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { CheckCircle2, XCircle, AlertCircle, FlaskConical, ShieldCheck } from 'lucide-react';

async function getReport(reportNumber: string) {
  try {
    return await prisma.report.findUnique({
      where: { reportNumber: decodeURIComponent(reportNumber) },
      include: {
        workOrder: {
          include: {
            client: { select: { name: true } },
            samples: { select: { id: true } },
          },
        },
      },
    });
  } catch {
    return null;
  }
}

export default async function VerificarReportePage({ params }: { params: { reportNumber: string } }) {
  const report = await getReport(params.reportNumber);
  const isValid = !!report && (report.status === 'EMITIDO' || report.status === 'ENVIADO');
  const isDraft = !!report && report.status === 'BORRADOR';

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00AEEF]/10 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-6">
          <FlaskConical className="w-8 h-8 text-[#00AEEF]" />
          <span className="font-bold text-2xl text-[#005F9E] tracking-tight">LAB<span className="text-[#00AEEF]">O</span>LAB</span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className={`p-6 text-center ${isValid ? 'bg-emerald-50' : isDraft ? 'bg-amber-50' : 'bg-red-50'}`}>
            {isValid ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-emerald-700">Informe Auténtico</h1>
                <p className="text-sm text-emerald-600 mt-1">Este documento fue emitido oficialmente por LABOLAB.</p>
              </>
            ) : isDraft ? (
              <>
                <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-amber-700">Informe No Emitido</h1>
                <p className="text-sm text-amber-600 mt-1">Este informe existe pero aún no ha sido emitido oficialmente.</p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-red-700">Informe No Encontrado</h1>
                <p className="text-sm text-red-600 mt-1">No existe un informe con este código. Verifique el número o el código QR.</p>
              </>
            )}
          </div>

          {report && (
            <div className="p-6 space-y-3">
              <Row label="N° de Informe" value={report.reportNumber} mono />
              <Row label="Orden de Trabajo" value={report.workOrder?.orderNumber ?? '-'} mono />
              <Row label="Cliente" value={report.workOrder?.client?.name ?? '-'} />
              <Row label="N° de Muestras" value={String(report.workOrder?.samples?.length ?? 0)} />
              <Row label="Fecha de Emisión" value={fmt(report.emittedAt)} />
              <Row label="Estado" value={report.status === 'ENVIADO' ? 'Enviado al cliente' : report.status === 'EMITIDO' ? 'Emitido' : 'Borrador'} />
            </div>
          )}

          <div className="border-t border-gray-100 px-6 py-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-[#00AEEF] shrink-0" />
            Verificación de autenticidad de informes de LABOLAB. Si detecta inconsistencias, contáctenos.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-50 pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
