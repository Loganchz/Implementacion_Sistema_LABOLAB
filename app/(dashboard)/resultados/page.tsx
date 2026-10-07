'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FieldInfo } from '@/components/field-info';
import { FlaskConical, Plus, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function ResultadosPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [analysisTypes, setAnalysisTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultDialog, setResultDialog] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [resultForm, setResultForm] = useState({ sampleId: '', analysisTypeId: '', value: '', numericValue: '', unit: '', method: '', observations: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, atRes] = await Promise.all([
        fetch('/api/samples?pending=true&limit=50'),
        fetch('/api/analysis-types?active=true'),
      ]);
      if (sRes.ok) { const d = await sRes.json(); setSamples(d?.samples ?? []); }
      if (atRes.ok) { const d = await atRes.json(); setAnalysisTypes(d ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openResultDialog = (sample: any) => {
    setSelectedSample(sample);
    setResultForm({ ...resultForm, sampleId: sample?.id ?? '' });
    setResultDialog(true);
  };

  const submitResult = async () => {
    if (!resultForm.sampleId || !resultForm.analysisTypeId) { toast.error('Seleccione muestra y análisis'); return; }
    try {
      const body = {
        ...resultForm,
        numericValue: resultForm.numericValue ? parseFloat(resultForm.numericValue) : null,
      };
      const res = await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success('Resultado registrado');
        setResultDialog(false);
        setResultForm({ sampleId: '', analysisTypeId: '', value: '', numericValue: '', unit: '', method: '', observations: '' });
        loadData();
      } else { const err = await res.json(); toast.error(err?.error ?? 'Error'); }
    } catch { toast.error('Error'); }
  };

  const verifyResult = async (resultId: string) => {
    try {
      const res = await fetch(`/api/results/${resultId}/verify`, { method: 'POST' });
      if (res.ok) { toast.success('Resultado verificado'); loadData(); }
    } catch { toast.error('Error'); }
  };

  const markAnalyzed = async (sampleId: string) => {
    try {
      const res = await fetch(`/api/samples/${sampleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ANALIZADA' }),
      });
      if (res.ok) { toast.success('Muestra marcada como analizada'); loadData(); }
      else { const err = await res.json(); toast.error(err?.error ?? 'Error'); }
    } catch { toast.error('Error'); }
  };

  // Parámetros heredados de la Orden de Trabajo de la muestra seleccionada,
  // filtrados por el área de la muestra. Si la OT no tiene items, cae al catálogo global.
  const assignedParams = (() => {
    const items = selectedSample?.workOrder?.items ?? [];
    const forArea = items.filter((it: any) => !selectedSample?.area || it.area === selectedSample.area);
    const src = forArea.length ? forArea : items;
    const list = src.map((it: any) => it.analysisType).filter(Boolean);
    return list.length ? list : (analysisTypes ?? []);
  })();
  const registeredIds = new Set((selectedSample?.results ?? []).map((r: any) => r?.analysisTypeId).filter(Boolean));

  const selectedAt = assignedParams.find((a: any) => a.id === resultForm.analysisTypeId)
    ?? (analysisTypes ?? []).find((a: any) => a.id === resultForm.analysisTypeId);
  const numVal = resultForm.numericValue !== '' ? parseFloat(resultForm.numericValue) : null;
  const hasLimits = selectedAt && (selectedAt.minValue != null || selectedAt.maxValue != null);
  const liveOutOfRange = !!(selectedAt && numVal != null && !isNaN(numVal) && (
    (selectedAt.minValue != null && numVal < selectedAt.minValue) ||
    (selectedAt.maxValue != null && numVal > selectedAt.maxValue)
  ));
  const limitLabel = selectedAt
    ? (selectedAt.minValue != null && selectedAt.maxValue != null
        ? `${selectedAt.minValue} – ${selectedAt.maxValue} ${selectedAt.unit ?? ''}`
        : selectedAt.maxValue != null
          ? `≤ ${selectedAt.maxValue} ${selectedAt.unit ?? ''}`
          : selectedAt.minValue != null
            ? `≥ ${selectedAt.minValue} ${selectedAt.unit ?? ''}`
            : 'Sin límite definido')
    : '';

  return (
    <div>
      <PageHeader title="Resultados de Análisis" description="Registrar y verificar resultados" icon={FlaskConical} />

      {loading ? (
        <p className="text-center py-10 text-muted-foreground">Cargando...</p>
      ) : (samples ?? []).length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">No hay muestras pendientes de análisis</p>
      ) : (
        <div className="space-y-4">
          {(samples ?? []).map((s: any) => (
            <Card key={s.id} className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-[#00AEEF]" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold">{s?.sampleCode ?? ''}</p>
                      <p className="text-xs text-muted-foreground">OT: {s?.workOrder?.orderNumber ?? '-'} | {s?.description ?? '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s?.status ?? ''} />
                    <Button size="sm" onClick={() => openResultDialog(s)} className="bg-[#00AEEF] hover:bg-[#005F9E] text-white">
                      <Plus className="w-3 h-3 mr-1" /> Registrar Resultado
                    </Button>
                    {(s?.results ?? []).length > 0 && s?.status !== 'ANALIZADA' && (
                      <Button size="sm" variant="outline" onClick={() => markAnalyzed(s.id)} className="text-green-600 border-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" /> Marcar Analizada
                      </Button>
                    )}
                  </div>
                </div>

                {(s?.results ?? []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(s?.results ?? []).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          {r?.outOfRange && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          <span className="font-medium">{r?.analysisType?.name ?? ''}</span>
                          <span className="text-muted-foreground">= {r?.value ?? r?.numericValue ?? '-'} {r?.unit ?? ''}</span>
                          {r?.numericValue != null && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r?.outOfRange ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {r?.outOfRange ? 'NO CONFORME' : 'CONFORME'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={r?.status ?? ''} />
                          {r?.status === 'COMPLETADO' && (
                            <Button size="sm" variant="outline" onClick={() => verifyResult(r.id)} className="text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" /> Verificar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={resultDialog} onOpenChange={setResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Resultado - {selectedSample?.sampleCode ?? ''}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldInfo label="Análisis" required info="Seleccione el ensayo que va a registrar para esta muestra. Al elegirlo, la unidad y el método se completan automáticamente según el catálogo, y se muestran los límites normativos configurados para ese parámetro." />
              <Select value={resultForm.analysisTypeId} onValueChange={(v: string) => {
                const at = assignedParams.find((a: any) => a.id === v) ?? (analysisTypes ?? []).find((a: any) => a.id === v);
                setResultForm({ ...resultForm, analysisTypeId: v, unit: at?.unit ?? '', method: at?.method ?? '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar análisis" /></SelectTrigger>
                <SelectContent>{assignedParams.map((at: any) => <SelectItem key={at.id} value={at.id}>{at.name} ({at.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA'}){registeredIds.has(at.id) ? ' ✓ ya registrado' : ''}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Parámetros solicitados en la OT {selectedSample?.workOrder?.orderNumber ?? ''}. {assignedParams.length} disponible(s).</p>
            </div>

            {selectedAt && (
              <div className="rounded-lg border border-[#00AEEF]/30 bg-[#00AEEF]/5 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#005F9E]">
                  <Info className="w-3.5 h-3.5" /> Guía del análisis seleccionado
                </div>
                <p><span className="text-muted-foreground">Método/Norma:</span> {selectedAt.method ?? 'No definido'}</p>
                <p><span className="text-muted-foreground">Unidad esperada:</span> {selectedAt.unit ?? 'No definida'}</p>
                {selectedAt.detectionLimit && <p><span className="text-muted-foreground">Límite de detección:</span> {selectedAt.detectionLimit}</p>}
                <p><span className="text-muted-foreground">Rango normativo permitido:</span> <span className="font-semibold">{limitLabel}</span></p>
                {!hasLimits && <p className="text-amber-600">Este análisis no tiene límites configurados. Puede definirlos en Configuración → Catálogo de Análisis.</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldInfo label="Valor" info="Resultado tal como aparecerá en el informe. Admite texto y notación especial: por ejemplo '<10', 'Ausencia', 'No detectado', 'Conforme' o '1,3 x 10⁶'. Úselo para resultados cualitativos o con formato." />
                <Input value={resultForm.value} onChange={(e: any) => setResultForm({ ...resultForm, value: e.target.value })} />
              </div>
              <div>
                <FieldInfo label="Valor Numérico" info="Número puro (sin unidades ni texto) usado para comparar automáticamente contra los límites normativos y para las estadísticas. Ej: 6, 0.05, 1300. Déjelo vacío si el resultado es cualitativo (Ausencia/Presencia)." />
                <Input type="number" step="any" value={resultForm.numericValue} onChange={(e: any) => setResultForm({ ...resultForm, numericValue: e.target.value })} className={liveOutOfRange ? 'border-red-500 focus-visible:ring-red-500' : ''} />
              </div>
            </div>

            {liveOutOfRange && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>El valor ingresado (<b>{resultForm.numericValue}</b>) está <b>fuera del rango normativo</b> permitido ({limitLabel}). El resultado se guardará como <b>NO CONFORME</b>.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldInfo label="Unidad" info="Unidad de medida del resultado (ej: mg/L, UFC/g, %, NMP/100mL). Se completa automáticamente según el análisis, pero puede ajustarla si es necesario." />
                <Input value={resultForm.unit} onChange={(e: any) => setResultForm({ ...resultForm, unit: e.target.value })} />
              </div>
              <div>
                <FieldInfo label="Método" info="Norma o método de ensayo aplicado (ej: AOAC 990.12, INEN 1529, Standard Methods). Se precarga desde el catálogo del análisis; edítelo si usó otro método." />
                <Input value={resultForm.method} onChange={(e: any) => setResultForm({ ...resultForm, method: e.target.value })} />
              </div>
            </div>
            <div>
              <FieldInfo label="Observaciones" info="Notas técnicas opcionales sobre el ensayo o el resultado (condiciones, incidencias, dilaciones). Aparecerán en el informe si se incluyen." />
              <Textarea value={resultForm.observations} onChange={(e: any) => setResultForm({ ...resultForm, observations: e.target.value })} />
            </div>
            <Button onClick={submitResult} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">Guardar Resultado</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
