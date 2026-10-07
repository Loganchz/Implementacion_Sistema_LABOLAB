'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function MisSolicitudesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [analysisTypes, setAnalysisTypes] = useState<any[]>([]);
  const [sampleTypes, setSampleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ sampleTypeId: '', description: '', observations: '', urgent: false, analysisTypeIds: [] as string[] });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, atRes, stRes] = await Promise.all([
        fetch('/api/requests'),
        fetch('/api/analysis-types?active=true'),
        fetch('/api/sample-types'),
      ]);
      if (reqRes.ok) { const d = await reqRes.json(); setRequests(d?.requests ?? []); }
      if (atRes.ok) { const d = await atRes.json(); setAnalysisTypes(d ?? []); }
      if (stRes.ok) { const d = await stRes.json(); setSampleTypes(d ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleAnalysis = (id: string) => {
    setForm((prev: any) => ({
      ...prev,
      analysisTypeIds: (prev.analysisTypeIds ?? []).includes(id)
        ? (prev.analysisTypeIds ?? []).filter((x: string) => x !== id)
        : [...(prev.analysisTypeIds ?? []), id],
    }));
  };

  const handleCreate = async () => {
    if (!form.sampleTypeId) { toast.error('Seleccione el tipo de muestra'); return; }
    if ((form.analysisTypeIds ?? []).length === 0) { toast.error('Seleccione al menos un análisis'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success('Solicitud enviada al laboratorio');
        setDialogOpen(false);
        setForm({ sampleTypeId: '', description: '', observations: '', urgent: false, analysisTypeIds: [] });
        loadData();
      } else { const err = await res.json(); toast.error(err?.error ?? 'Error al enviar la solicitud'); }
    } catch { toast.error('Error al enviar la solicitud'); }
    finally { setSubmitting(false); }
  };

  const columns: Column<any>[] = [
    { key: 'requestNumber', label: 'N°', render: (r: any) => <span className="font-mono text-xs">{r?.requestNumber ?? ''}</span> },
    { key: 'sampleType', label: 'Tipo Muestra', render: (r: any) => r?.sampleType?.name ?? '-' },
    { key: 'items', label: 'Análisis', render: (r: any) => (r?.items?.length ?? 0) },
    { key: 'urgent', label: 'Urgente', render: (r: any) => r?.urgent ? <span className="text-red-600 font-bold">Sí</span> : 'No' },
    { key: 'status', label: 'Estado', render: (r: any) => <StatusBadge status={r?.status ?? ''} /> },
    { key: 'createdAt', label: 'Fecha', render: (r: any) => r?.createdAt ? new Date(r.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
  ];

  return (
    <div>
      <PageHeader
        title="Mis Solicitudes"
        description="Envíe y haga seguimiento de sus solicitudes de análisis"
        icon={FileText}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white"><Plus className="w-4 h-4 mr-2" /> Nueva Solicitud</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nueva Solicitud de Análisis</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipo de Muestra *</Label>
                  <Select value={form.sampleTypeId} onValueChange={(v: string) => setForm({ ...form, sampleTypeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                    <SelectContent>{(sampleTypes ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Descripción de la muestra</Label><Textarea placeholder="Ej. Producto terminado, lote 2024-05" value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></div>
                <div>
                  <Label className="mb-2 block">Análisis Requeridos *</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                    {(analysisTypes ?? []).map((at: any) => (
                      <label key={at.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={(form.analysisTypeIds ?? []).includes(at.id)} onCheckedChange={() => toggleAnalysis(at.id)} />
                        <span>{at.name}</span>
                        <span className="text-xs text-muted-foreground">({at.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA'})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div><Label>Observaciones</Label><Textarea placeholder="Información adicional para el laboratorio" value={form.observations} onChange={(e: any) => setForm({ ...form, observations: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.urgent} onCheckedChange={(v: any) => setForm({ ...form, urgent: !!v })} />
                  <span className="text-red-600 font-medium">Solicitud urgente</span>
                </label>
                <Button onClick={handleCreate} disabled={submitting} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">{submitting ? 'Enviando...' : 'Enviar Solicitud'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable columns={columns} data={requests} loading={loading} emptyMessage="Aún no ha enviado solicitudes. Use el botón «Nueva Solicitud» para empezar." />
    </div>
  );
}
