'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Plus, TestTubes, ArrowLeft, Tag, FileBarChart, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function OrdenDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sampleTypes, setSampleTypes] = useState<any[]>([]);
  const [sampleDialog, setSampleDialog] = useState(false);
  const [sampleForm, setSampleForm] = useState({
    description: '', sampleTypeId: '', quantity: '', unit: '', receptionCondition: '',
    storageCondition: 'AMBIENTE', area: 'FISICOQUIMICA', notes: '',
  });

  const loadOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-orders/${params?.id}`);
      if (res.ok) setOrder(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [params?.id]);

  useEffect(() => {
    loadOrder();
    fetch('/api/sample-types').then((r: any) => r.json()).then((d: any) => setSampleTypes(d ?? [])).catch(() => {});
  }, [loadOrder]);

  const addSample = async () => {
    try {
      const res = await fetch('/api/samples', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sampleForm, workOrderId: params?.id }),
      });
      if (res.ok) {
        toast.success('Muestra registrada');
        setSampleDialog(false);
        setSampleForm({ description: '', sampleTypeId: '', quantity: '', unit: '', receptionCondition: '', storageCondition: 'AMBIENTE', area: 'FISICOQUIMICA', notes: '' });
        loadOrder();
      } else { const err = await res.json(); toast.error(err?.error ?? 'Error'); }
    } catch { toast.error('Error'); }
  };

  // Autocompletado: precarga el formulario de muestra con los datos ya capturados en el ingreso
  const openSampleDialog = () => {
    const req = order?.quote?.request;
    const items = order?.items ?? [];
    const hasFq = items.some((i: any) => i?.analysisType?.area === 'FISICOQUIMICA');
    const hasMica = items.some((i: any) => i?.analysisType?.area === 'MICROBIOLOGIA');
    const suggestedArea = (!hasFq && hasMica) ? 'MICROBIOLOGIA' : 'FISICOQUIMICA';
    const validStorage = ['REFRIGERACION', 'CONGELACION', 'AMBIENTE'];
    setSampleForm({
      description: [req?.productName, req?.brand].filter(Boolean).join(' - '),
      sampleTypeId: req?.sampleTypeId || '',
      quantity: req?.contentAmount || '',
      unit: '',
      receptionCondition: '',
      storageCondition: validStorage.includes(req?.storageCondition) ? req.storageCondition : 'AMBIENTE',
      area: suggestedArea,
      notes: req?.lot ? `Lote: ${req.lot}` : '',
    });
    setSampleDialog(true);
  };

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/work-orders/${params?.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success('Estado actualizado'); loadOrder(); }
      else { toast.error(data?.error ?? 'No se pudo actualizar el estado'); }
    } catch { toast.error('Error'); }
  };

  const createReport = async () => {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId: params?.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Reporte creado');
        router.push(`/reportes/${data?.id}`);
      } else if (res.status === 409 && data?.reportId) {
        toast.info('Ya existe un reporte para esta OT');
        router.push(`/reportes/${data.reportId}`);
      } else {
        toast.error(data?.error ?? 'Error');
      }
    } catch { toast.error('Error'); }
  };

  const [downloadingOt, setDownloadingOt] = useState(false);
  const downloadOtPdf = async () => {
    setDownloadingOt(true);
    try {
      const createRes = await fetch(`/api/work-orders/${params?.id}/pdf`, { method: 'POST' });
      if (!createRes.ok) { toast.error('Error al iniciar generación de PDF'); setDownloadingOt(false); return; }
      const { request_id } = await createRes.json();
      let attempts = 0;
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
          a.download = `OT-${order?.orderNumber ?? 'orden'}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('PDF de la orden generado');
          setDownloadingOt(false);
        } else if (result?.status === 'FAILED') {
          toast.error('Error al generar PDF'); setDownloadingOt(false);
        } else if (attempts < 60) {
          setTimeout(poll, 2000);
        } else { toast.error('Tiempo de espera agotado'); setDownloadingOt(false); }
      };
      await poll();
    } catch { toast.error('Error'); setDownloadingOt(false); }
  };

  const samplesList = (order?.samples ?? []);
  const activeSamples = samplesList.filter((s: any) => s?.status !== 'DESCARTADA');
  const hasSamples = activeSamples.length > 0;
  const hasResults = samplesList.some((s: any) => (s?.results ?? []).length > 0);
  const allSamplesHaveResults = hasSamples && activeSamples.every((s: any) => (s?.results ?? []).length > 0);
  const hasEmittedReport = (order?.reports ?? []).some((r: any) => r?.status === 'EMITIDO' || r?.status === 'ENVIADO');
  const canComplete = hasSamples && allSamplesHaveResults && hasEmittedReport;

  if (loading) return <div className="flex items-center justify-center py-20"><span className="text-muted-foreground">Cargando...</span></div>;
  if (!order) return <div className="text-center py-20 text-muted-foreground">Orden no encontrada</div>;

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      </div>

      <PageHeader
        title={`OT ${order?.orderNumber ?? ''}`}
        description={`Cliente: ${order?.client?.name ?? '-'}`}
        icon={ClipboardList}
        actions={
          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={order?.status ?? ''} />
            <Button size="sm" variant="outline" onClick={downloadOtPdf} disabled={downloadingOt}><Download className="w-3 h-3 mr-1" /> {downloadingOt ? 'Generando...' : 'Descargar OT (PDF)'}</Button>
            {order?.status === 'ABIERTA' && <Button size="sm" onClick={() => updateStatus('EN_PROCESO')} className="bg-[#00AEEF] hover:bg-[#005F9E] text-white">Iniciar Proceso</Button>}
            {order?.status === 'EN_PROCESO' && <Button size="sm" onClick={() => updateStatus('COMPLETADA')} disabled={!canComplete} title={canComplete ? '' : 'Complete muestras, resultados y emita el informe antes de cerrar la orden'} className="bg-green-600 hover:bg-green-700 text-white">Completar</Button>}
            {order?.status === 'COMPLETADA' && <Button size="sm" onClick={() => updateStatus('ENTREGADA')} className="bg-emerald-600 hover:bg-emerald-700 text-white">Marcar Entregada</Button>}
          </div>
        }
      />

      {/* Progreso del flujo */}
      <Card className="border-none shadow-sm mb-6">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-[#005F9E] uppercase mb-3">Progreso de la Orden</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center">
            {[
              { label: '1. Muestras registradas', done: hasSamples },
              { label: '2. Resultados de todas las muestras', done: allSamplesHaveResults },
              { label: '3. Informe emitido', done: hasEmittedReport },
              { label: '4. Orden completada', done: order?.status === 'COMPLETADA' || order?.status === 'ENTREGADA' },
            ].map((step: any, i: number) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${step.done ? 'text-gray-800 font-medium' : 'text-muted-foreground'}`}>{step.label}</span>
                {i < 3 && <div className="hidden sm:block flex-1 h-px bg-gray-200 mx-2" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-none shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cotización</p><p className="font-mono text-sm font-bold">{order?.quote?.quoteNumber ?? '-'}</p></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Fecha de Ingreso</p><p className="text-sm font-medium">{order?.receivedAt ? new Date(order.receivedAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-'}</p></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Entrega Estimada</p><p className="text-sm font-medium">{order?.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-'}</p></CardContent></Card>
      </div>

      {/* Parámetros solicitados (heredados del ingreso de la muestra) */}
      {(() => {
        const items = order?.items ?? [];
        const fq = items.filter((i: any) => i?.analysisType?.area === 'FISICOQUIMICA');
        const mica = items.filter((i: any) => i?.analysisType?.area === 'MICROBIOLOGIA');
        const req = order?.quote?.request;
        return (
          <Card className="border-none shadow-sm mb-6">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-[#005F9E] uppercase mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Parámetros solicitados por el cliente</p>
              {req?.productName && (
                <p className="text-xs text-muted-foreground mb-3">
                  Producto: <span className="font-medium text-gray-800">{req.productName}</span>
                  {req?.brand ? ` · Marca: ${req.brand}` : ''}{req?.lot ? ` · Lote: ${req.lot}` : ''}
                </p>
              )}
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay parámetros asociados a esta orden.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Fisicoquímica ({fq.length})</p>
                    {fq.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : (
                      <ul className="text-xs text-gray-700 space-y-0.5">{fq.map((i: any) => <li key={i.id}>• {i.analysisType?.name} <span className="text-muted-foreground">({i.analysisType?.code})</span></li>)}</ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Microbiología ({mica.length})</p>
                    {mica.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : (
                      <ul className="text-xs text-gray-700 space-y-0.5">{mica.map((i: any) => <li key={i.id}>• {i.analysisType?.name} <span className="text-muted-foreground">({i.analysisType?.code})</span></li>)}</ul>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-3">Estos parámetros aparecerán automáticamente al registrar la muestra y al ingresar los resultados.</p>
            </CardContent>
          </Card>
        );
      })()}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><TestTubes className="w-4 h-4 text-[#00AEEF]" /> Muestras</h3>
          <div className="flex gap-2">
            <Dialog open={sampleDialog} onOpenChange={setSampleDialog}>
              <Button size="sm" onClick={openSampleDialog} className="bg-[#00AEEF] hover:bg-[#005F9E] text-white"><Plus className="w-3 h-3 mr-1" /> Agregar Muestra</Button>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Registrar Muestra</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-[11px] text-[#005F9E] bg-[#00AEEF]/5 rounded px-2 py-1">Datos precargados desde el ingreso de la muestra. Revíselos y complete lo faltante.</p>
                  <div><Label>Tipo de Muestra</Label>
                    <Select value={sampleForm.sampleTypeId} onValueChange={(v: string) => setSampleForm({ ...sampleForm, sampleTypeId: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{(sampleTypes ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Descripción</Label><Input value={sampleForm.description} onChange={(e: any) => setSampleForm({ ...sampleForm, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Cantidad</Label><Input value={sampleForm.quantity} onChange={(e: any) => setSampleForm({ ...sampleForm, quantity: e.target.value })} /></div>
                    <div><Label>Unidad</Label><Input value={sampleForm.unit} onChange={(e: any) => setSampleForm({ ...sampleForm, unit: e.target.value })} placeholder="ml, g, kg..." /></div>
                  </div>
                  <div><Label>Área</Label>
                    <Select value={sampleForm.area} onValueChange={(v: string) => setSampleForm({ ...sampleForm, area: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="FISICOQUIMICA">Fisicoquímica</SelectItem><SelectItem value="MICROBIOLOGIA">Microbiología</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Condición de Almacenamiento</Label>
                    <Select value={sampleForm.storageCondition} onValueChange={(v: string) => setSampleForm({ ...sampleForm, storageCondition: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REFRIGERACION">Refrigeración (2-8°C)</SelectItem>
                        <SelectItem value="CONGELACION">Congelación (-18°C o menos)</SelectItem>
                        <SelectItem value="AMBIENTE">Ambiente (18-27°C)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Notas</Label><Textarea value={sampleForm.notes} onChange={(e: any) => setSampleForm({ ...sampleForm, notes: e.target.value })} /></div>
                  {(() => {
                    const areaParams = (order?.items ?? []).filter((i: any) => i?.analysisType?.area === sampleForm.area);
                    return (
                      <div className="rounded-lg bg-[#00AEEF]/5 border border-[#00AEEF]/20 p-3">
                        <p className="text-xs font-semibold text-[#005F9E] mb-1">Parámetros que se analizarán en esta muestra ({sampleForm.area === 'FISICOQUIMICA' ? 'Fisicoquímica' : 'Microbiología'})</p>
                        {areaParams.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No hay parámetros de esta área en la orden. Cambie el área para ver los solicitados.</p>
                        ) : (
                          <ul className="text-xs text-gray-700 space-y-0.5">{areaParams.map((i: any) => <li key={i.id}>• {i.analysisType?.name} <span className="text-muted-foreground">({i.analysisType?.code})</span></li>)}</ul>
                        )}
                      </div>
                    );
                  })()}
                  <Button onClick={addSample} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">Registrar Muestra</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" onClick={createReport} disabled={!hasResults} title={hasResults ? '' : 'Registre al menos un resultado antes de crear el reporte'}><FileBarChart className="w-3 h-3 mr-1" /> Crear Reporte</Button>
          </div>
        </div>
        <div className="space-y-2">
          {(order?.samples ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 bg-white rounded-xl">No hay muestras registradas</p>
          ) : (
            (order?.samples ?? []).map((s: any) => (
              <Card key={s.id} className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center"><TestTubes className="w-5 h-5 text-[#00AEEF]" /></div>
                    <div><p className="font-mono text-sm font-bold">{s?.sampleCode ?? ''}</p><p className="text-xs text-muted-foreground">{s?.description ?? s?.sampleType?.name ?? '-'}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{s?.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA'}</span>
                    <StatusBadge status={s?.status ?? ''} />
                    <Button size="sm" variant="outline" onClick={() => router.push(`/etiquetas?sampleId=${s.id}`)}><Tag className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Reports */}
      {(order?.reports ?? []).length > 0 && (
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><FileBarChart className="w-4 h-4 text-[#00AEEF]" /> Reportes</h3>
          <div className="space-y-2">
            {(order?.reports ?? []).map((r: any) => (
              <Card key={r.id} className="border-none shadow-sm cursor-pointer hover:bg-[#00AEEF]/5 transition-colors" onClick={() => router.push(`/reportes/${r.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div><p className="font-mono text-sm font-bold">{r?.reportNumber ?? ''}</p></div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r?.status ?? ''} />
                    <Button size="sm" variant="outline" onClick={(e: any) => { e.stopPropagation(); router.push(`/reportes/${r.id}`); }}><FileBarChart className="w-3 h-3 mr-1" /> Abrir</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
