'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileBarChart, ArrowLeft, Save, Download, Loader2, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export default function ReporteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ observations: '', conclusions: '', analystName: '', directorName: '', notes: '' });
  const [origin, setOrigin] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    if (report?.reportNumber && origin) {
      QRCode.toDataURL(`${origin}/verificar/${report.reportNumber}`, {
        width: 110,
        margin: 1,
        color: { dark: '#005F9E', light: '#FFFFFF' },
      })
        .then(setQrCodeUrl)
        .catch(() => {});
    }
  }, [report?.reportNumber, origin]);

  const loadReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/${params?.id}`);
      if (res.ok) {
        const d = await res.json();
        setReport(d);
        setForm({
          observations: d?.observations ?? '',
          conclusions: d?.conclusions ?? '',
          analystName: d?.analystName ?? '',
          directorName: d?.directorName ?? '',
          notes: d?.notes ?? '',
        });
      } else { toast.error('No se pudo cargar el reporte'); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [params?.id]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const saveReport = async (silent = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/${params?.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { if (!silent) toast.success('Reporte guardado'); await loadReport(); return true; }
      else { toast.error('Error al guardar'); return false; }
    } catch { toast.error('Error'); return false; }
    finally { setSaving(false); }
  };

  const generatePdf = async () => {
    // Save current edits first
    setGenerating(true);
    const ok = await saveReport(true);
    if (!ok) { setGenerating(false); return; }
    try {
      const createRes = await fetch(`/api/reports/${params?.id}/pdf`, { method: 'POST' });
      if (!createRes.ok) { toast.error('Error al iniciar generación de PDF'); setGenerating(false); return; }
      const { request_id } = await createRes.json();
      let attempts = 0;
      const maxAttempts = 60;
      const poll = async () => {
        attempts++;
        const statusRes = await fetch('/api/generate-pdf/status', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id }),
        });
        const result = await statusRes.json();
        if (result?.status === 'SUCCESS' && result?.pdf_base64) {
          const bytes = atob(result.pdf_base64);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          const blob = new Blob([arr], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${report?.reportNumber ?? 'reporte'}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('PDF generado exitosamente');
          loadReport();
          setGenerating(false);
        } else if (result?.status === 'FAILED') {
          toast.error('Error al generar PDF'); setGenerating(false);
        } else if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          toast.error('Tiempo de espera agotado'); setGenerating(false);
        }
      };
      await poll();
    } catch { toast.error('Error'); setGenerating(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#00AEEF] animate-spin" /></div>;
  if (!report) return <div className="text-center py-20 text-muted-foreground">Reporte no encontrado</div>;

  const client = report?.workOrder?.client;
  const samples = report?.workOrder?.samples ?? [];

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      </div>

      <PageHeader
        title={`Informe ${report?.reportNumber ?? ''}`}
        description={`OT: ${report?.workOrder?.orderNumber ?? '-'} | Cliente: ${client?.name ?? '-'}`}
        icon={FileBarChart}
        actions={
          <div className="flex gap-2 items-center flex-wrap">
            <StatusBadge status={report?.status ?? ''} />
            <Button size="sm" variant="outline" onClick={() => saveReport()} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Guardar
            </Button>
            <Button size="sm" onClick={generatePdf} disabled={generating} className="bg-[#00AEEF] hover:bg-[#005F9E] text-white">
              {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
              {generating ? 'Generando...' : 'Emitir + PDF'}
            </Button>
          </div>
        }
      />

      {/* Client / report info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <h4 className="text-xs font-semibold text-[#005F9E] uppercase mb-2">Datos del Cliente</h4>
          <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> {client?.name ?? '-'}</p>
          <p className="text-sm"><span className="text-muted-foreground">RUC/Cédula:</span> {client?.ruc ?? '-'}</p>
          <p className="text-sm"><span className="text-muted-foreground">Dirección:</span> {client?.address ?? '-'}</p>
        </CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <h4 className="text-xs font-semibold text-[#005F9E] uppercase mb-2">Datos del Informe</h4>
          <p className="text-sm"><span className="text-muted-foreground">N° Informe:</span> {report?.reportNumber ?? '-'}</p>
          <p className="text-sm"><span className="text-muted-foreground">Cotización:</span> {report?.workOrder?.quote?.quoteNumber ?? '-'}</p>
          <p className="text-sm"><span className="text-muted-foreground">Emitido:</span> {report?.emittedAt ? new Date(report.emittedAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : 'Pendiente'}</p>
        </CardContent></Card>
      </div>

      {/* Verificación de autenticidad (QR) */}
      {(report?.status === 'EMITIDO' || report?.status === 'ENVIADO') && origin && (
        <Card className="border-none shadow-sm mb-6">
          <CardContent className="p-4 flex items-center gap-4">
            <img
              src={qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=005F9E&data=${encodeURIComponent(`${origin}/verificar/${report.reportNumber}`)}`}
              alt="Código QR de verificación"
              className="w-24 h-24 rounded-lg border border-gray-100"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-[#005F9E] flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#00AEEF]" /> Verificación de autenticidad</h4>
              <p className="text-xs text-muted-foreground mt-1">Este código QR se incluye en el PDF del informe. Cualquier persona puede escanearlo o abrir el enlace para comprobar que el informe es auténtico.</p>
              <a href={`/verificar/${report.reportNumber}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00AEEF] hover:underline break-all flex items-center gap-1 mt-1">
                <ExternalLink className="w-3 h-3 shrink-0" /> {origin}/verificar/{report.reportNumber}
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results table (read-only, from analysts) */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Resultados de Análisis</h3>
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-600 uppercase">
                <th className="px-3 py-2">Muestra</th>
                <th className="px-3 py-2">Análisis</th>
                <th className="px-3 py-2">Método</th>
                <th className="px-3 py-2 text-center">Resultado</th>
                <th className="px-3 py-2">Unidad</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {samples.flatMap((s: any) => (s?.results ?? []).map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{s?.sampleCode ?? ''}</td>
                  <td className="px-3 py-2">{r?.analysisType?.name ?? '-'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r?.analysisType?.method ?? '-'}</td>
                  <td className={`px-3 py-2 text-center font-bold ${r?.outOfRange ? 'text-red-600' : ''}`}>
                    {r?.outOfRange && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {r?.value ?? r?.numericValue ?? '-'}
                  </td>
                  <td className="px-3 py-2">{r?.unit ?? ''}</td>
                  <td className="px-3 py-2 text-center"><StatusBadge status={r?.status ?? ''} /></td>
                </tr>
              )))}
              {samples.flatMap((s: any) => s?.results ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Sin resultados registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4 mb-6">
        <div>
          <Label>Observaciones</Label>
          <Textarea rows={4} value={form.observations} onChange={(e: any) => setForm({ ...form, observations: e.target.value })} placeholder="Observaciones sobre las muestras o el análisis..." />
        </div>
        <div>
          <Label>Conclusiones</Label>
          <Textarea rows={4} value={form.conclusions} onChange={(e: any) => setForm({ ...form, conclusions: e.target.value })} placeholder="Conclusiones del informe..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Analista Responsable (firma)</Label>
            <Input value={form.analystName} onChange={(e: any) => setForm({ ...form, analystName: e.target.value })} placeholder="Nombre del analista" />
          </div>
          <div>
            <Label>Director Técnico (firma)</Label>
            <Input value={form.directorName} onChange={(e: any) => setForm({ ...form, directorName: e.target.value })} placeholder="Nombre del director" />
          </div>
        </div>
        <div>
          <Label>Notas internas</Label>
          <Textarea rows={2} value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas (no aparecen en el PDF)" />
        </div>
      </div>
    </div>
  );
}
