'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Calculator, Eye } from 'lucide-react';
import { toast } from 'sonner';

// Mapeo de productos a códigos de análisis del catálogo del laboratorio.
// Para la demo se pre-configuran leche, agua y harinas basados en el alcance de acreditación SAE LEN 06-001.
const PRODUCT_ANALYSIS_MAP: Record<string, { label: string; norma: string; codes: string[] }> = {
  'leche': {
    label: 'Leche y productos lácteos',
    norma: 'NTE INEN 10 / NTE INEN 14',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-SOL', 'FQ-DEN', 'FQ-ACI', 'FQ-PH', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH', 'MI-SAL'],
  },
  'agua': {
    label: 'Agua potable / natural',
    norma: 'NTE INEN 1108 / Standard Methods',
    codes: ['FQ-PH', 'FQ-SOL', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH'],
  },
  'harinas': {
    label: 'Harinas y pastas de origen vegetal',
    norma: 'NTE INEN-ISO 712 / NTE INEN-ISO 11085',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-FIB', 'FQ-PH', 'FQ-ACI', 'FQ-CAR', 'MI-AER', 'MI-MOH'],
  },
  'carnes': {
    label: 'Carne y productos cárnicos',
    norma: 'NTE INEN-ISO 1442 / NTE INEN-ISO 937',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-PH', 'FQ-SAL', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-SAL'],
  },
};

export default function SolicitudesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [analysisTypes, setAnalysisTypes] = useState<any[]>([]);
  const [sampleTypes, setSampleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const emptyForm = {
    clientId: '', sampleTypeId: '', description: '', observations: '', urgent: false,
    analysisTypeIds: [] as string[],
    productName: '', brand: '', lot: '', elaborationDate: '', expirationDate: '',
    samplingDate: '', receptionDate: '', packaging: '', contentAmount: '', location: '',
    sampleCount: '', storageCondition: '', samplingBy: '', responsibleName: '',
    invoiceEmail: '', reportEmail: '',
  };
  const [form, setForm] = useState({ ...emptyForm });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, cliRes, atRes, stRes] = await Promise.all([
        fetch('/api/requests'),
        fetch('/api/clients?limit=100'),
        fetch('/api/analysis-types?active=true'),
        fetch('/api/sample-types'),
      ]);
      if (reqRes.ok) { const d = await reqRes.json(); setRequests(d?.requests ?? []); }
      if (cliRes.ok) { const d = await cliRes.json(); setClients(d?.clients ?? []); }
      if (atRes.ok) { const d = await atRes.json(); setAnalysisTypes(d ?? []); }
      if (stRes.ok) { const d = await stRes.json(); setSampleTypes(d ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.clientId) { toast.error('Seleccione un cliente'); return; }
    try {
      const res = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success('Solicitud creada');
        setDialogOpen(false);
        setForm({ ...emptyForm });
        loadData();
      } else { const err = await res.json(); toast.error(err?.error ?? 'Error'); }
    } catch { toast.error('Error'); }
  };

  const [generating, setGenerating] = useState<string | null>(null);

  const generateQuote = async (requestId: string) => {
    setGenerating(requestId);
    try {
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) });
      if (res.ok) {
        toast.success('Cotización generada. Redirigiendo a Cotizaciones...');
        setTimeout(() => router.push('/cotizaciones'), 800);
      } else { const err = await res.json(); toast.error(err?.error ?? 'Error al generar cotización'); }
    } catch { toast.error('Error al generar cotización'); }
    finally { setGenerating(null); }
  };

  const toggleAnalysis = (id: string) => {
    setForm((prev: any) => ({
      ...prev,
      analysisTypeIds: (prev.analysisTypeIds ?? []).includes(id)
        ? (prev.analysisTypeIds ?? []).filter((x: string) => x !== id)
        : [...(prev.analysisTypeIds ?? []), id],
    }));
  };

  const columns: Column<any>[] = [
    { key: 'requestNumber', label: 'N°', render: (r: any) => <span className="font-mono text-xs">{r?.requestNumber ?? ''}</span> },
    { key: 'client', label: 'Cliente', render: (r: any) => r?.client?.name ?? '-' },
    { key: 'sampleType', label: 'Tipo Muestra', render: (r: any) => r?.sampleType?.name ?? '-' },
    { key: 'items', label: 'Análisis', render: (r: any) => (r?.items?.length ?? 0) },
    { key: 'urgent', label: 'Urgente', render: (r: any) => r?.urgent ? <span className="text-red-600 font-bold">Sí</span> : 'No' },
    { key: 'status', label: 'Estado', render: (r: any) => <StatusBadge status={r?.status ?? ''} /> },
    { key: 'createdAt', label: 'Fecha', render: (r: any) => r?.createdAt ? new Date(r.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
    {
      key: 'actions', label: 'Acciones', render: (r: any) => (
        <div className="flex gap-1">
          {(r?.status === 'BORRADOR' || r?.status === 'ENVIADA') && (
            <Button size="sm" className="bg-[#00AEEF] hover:bg-[#005F9E] text-white h-8" disabled={generating === r.id} onClick={(e: any) => { e.stopPropagation(); generateQuote(r.id); }}>
              <Calculator className="w-3 h-3 mr-1" /> {generating === r.id ? 'Generando...' : 'Generar Cotización'}
            </Button>
          )}
          {r?.status && !['BORRADOR', 'ENVIADA', 'CANCELADA'].includes(r.status) && (
            <Button size="sm" variant="outline" className="h-8" onClick={(e: any) => { e.stopPropagation(); router.push('/cotizaciones'); }}>
              <Eye className="w-3 h-3 mr-1" /> Ver Cotización
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Ingreso de Muestras"
        description="Registro de solicitudes y datos del producto"
        icon={FileText}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white"><Plus className="w-4 h-4 mr-2" /> Nuevo Ingreso</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nuevo Ingreso de Muestra</DialogTitle></DialogHeader>
              <div className="space-y-5">
                {/* Datos del cliente y muestra */}
                <div>
                  <h4 className="text-sm font-semibold text-[#005F9E] mb-2 border-b pb-1">Datos del cliente y muestra</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cliente *</Label>
                      <Select value={form.clientId} onValueChange={(v: string) => setForm({ ...form, clientId: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                        <SelectContent>{(clients ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de Muestra</Label>
                      <Select value={form.sampleTypeId} onValueChange={(v: string) => setForm({ ...form, sampleTypeId: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                        <SelectContent>{(sampleTypes ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Información del producto */}
                <div>
                  <h4 className="text-sm font-semibold text-[#005F9E] mb-2 border-b pb-1">Información del producto</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nombre del producto</Label><Input value={form.productName} onChange={(e: any) => setForm({ ...form, productName: e.target.value })} /></div>
                    <div><Label>Marca</Label><Input value={form.brand} onChange={(e: any) => setForm({ ...form, brand: e.target.value })} /></div>
                    <div><Label>Lote</Label><Input value={form.lot} onChange={(e: any) => setForm({ ...form, lot: e.target.value })} /></div>
                    <div><Label>N° de muestras</Label><Input type="number" min="1" value={form.sampleCount} onChange={(e: any) => setForm({ ...form, sampleCount: e.target.value })} /></div>
                    <div><Label>Fecha de elaboración</Label><Input type="date" value={form.elaborationDate} onChange={(e: any) => setForm({ ...form, elaborationDate: e.target.value })} /></div>
                    <div><Label>Fecha de vencimiento</Label><Input type="date" value={form.expirationDate} onChange={(e: any) => setForm({ ...form, expirationDate: e.target.value })} /></div>
                    <div><Label>Fecha de toma de muestra</Label><Input type="date" value={form.samplingDate} onChange={(e: any) => setForm({ ...form, samplingDate: e.target.value })} /></div>
                    <div><Label>Fecha de recepción</Label><Input type="date" value={form.receptionDate} onChange={(e: any) => setForm({ ...form, receptionDate: e.target.value })} /></div>
                    <div><Label>Envase</Label><Input value={form.packaging} onChange={(e: any) => setForm({ ...form, packaging: e.target.value })} /></div>
                    <div><Label>Contenido / cantidad</Label><Input value={form.contentAmount} onChange={(e: any) => setForm({ ...form, contentAmount: e.target.value })} /></div>
                    <div><Label>Localización</Label><Input value={form.location} onChange={(e: any) => setForm({ ...form, location: e.target.value })} /></div>
                    <div><Label>Condiciones de conservación</Label><Input value={form.storageCondition} onChange={(e: any) => setForm({ ...form, storageCondition: e.target.value })} /></div>
                    <div><Label>Toma de muestra por</Label><Input value={form.samplingBy} onChange={(e: any) => setForm({ ...form, samplingBy: e.target.value })} /></div>
                    <div><Label>Responsable</Label><Input value={form.responsibleName} onChange={(e: any) => setForm({ ...form, responsibleName: e.target.value })} /></div>
                    <div><Label>Correo para factura</Label><Input type="email" value={form.invoiceEmail} onChange={(e: any) => setForm({ ...form, invoiceEmail: e.target.value })} /></div>
                    <div><Label>Correo para informe</Label><Input type="email" value={form.reportEmail} onChange={(e: any) => setForm({ ...form, reportEmail: e.target.value })} /></div>
                  </div>
                </div>

                {/* Parámetros a analizar — filtrados por producto */}
                <div>
                  <h4 className="text-sm font-semibold text-[#005F9E] mb-2 border-b pb-1">Parámetros a analizar</h4>
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground">Filtrar por producto (seleccione para ver parámetros de la norma aplicable)</Label>
                    <Select value={selectedProduct} onValueChange={(v: string) => {
                      setSelectedProduct(v);
                      if (v && PRODUCT_ANALYSIS_MAP[v]) {
                        const codes = PRODUCT_ANALYSIS_MAP[v].codes;
                        const matchIds = (analysisTypes ?? []).filter((at: any) => codes.includes(at.code)).map((at: any) => at.id);
                        setForm((prev: any) => ({ ...prev, analysisTypeIds: matchIds }));
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Todos los análisis (sin filtro)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los análisis</SelectItem>
                        {Object.entries(PRODUCT_ANALYSIS_MAP).map(([key, v]) => (
                          <SelectItem key={key} value={key}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProduct && selectedProduct !== 'all' && PRODUCT_ANALYSIS_MAP[selectedProduct] && (
                      <p className="text-xs text-[#005F9E] mt-1 font-medium">Norma de referencia: {PRODUCT_ANALYSIS_MAP[selectedProduct].norma}</p>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-[#00AEEF]/10 sticky top-0">
                        <tr className="text-left text-xs text-[#005F9E]">
                          <th className="p-2 w-8"></th>
                          <th className="p-2">Parámetro</th>
                          <th className="p-2">Área</th>
                          <th className="p-2">Unidad</th>
                          <th className="p-2">Método</th>
                          <th className="p-2">Rango</th>
                          <th className="p-2 text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const productCodes = selectedProduct && selectedProduct !== 'all' && PRODUCT_ANALYSIS_MAP[selectedProduct]
                            ? PRODUCT_ANALYSIS_MAP[selectedProduct].codes
                            : null;
                          const filtered = productCodes
                            ? (analysisTypes ?? []).filter((at: any) => productCodes.includes(at.code))
                            : (analysisTypes ?? []);
                          return filtered.map((at: any) => {
                            const checked = (form.analysisTypeIds ?? []).includes(at.id);
                            const range = (at.minValue != null && at.maxValue != null)
                              ? `${at.minValue}–${at.maxValue}`
                              : (at.maxValue != null ? `≤ ${at.maxValue}` : (at.minValue != null ? `≥ ${at.minValue}` : '—'));
                            return (
                              <tr key={at.id} className={`border-t cursor-pointer hover:bg-muted/50 ${checked ? 'bg-[#00AEEF]/5' : ''}`} onClick={() => toggleAnalysis(at.id)}>
                                <td className="p-2"><Checkbox checked={checked} onCheckedChange={() => toggleAnalysis(at.id)} /></td>
                                <td className="p-2 font-medium">{at.name}</td>
                                <td className="p-2"><span className="text-xs">{at.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA'}</span></td>
                                <td className="p-2 text-xs">{at.unit ?? '—'}</td>
                                <td className="p-2 text-xs">{at.method ?? '—'}</td>
                                <td className="p-2 text-xs">{range}</td>
                                <td className="p-2 text-right text-xs">{at.basePrice != null ? `$${Number(at.basePrice).toFixed(2)}` : '—'}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{(form.analysisTypeIds ?? []).length} parámetro(s) seleccionado(s)</p>
                </div>

                <div><Label>Descripción</Label><Textarea value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Observaciones</Label><Textarea value={form.observations} onChange={(e: any) => setForm({ ...form, observations: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.urgent} onCheckedChange={(v: any) => setForm({ ...form, urgent: !!v })} />
                  <span className="text-red-600 font-medium">Urgente</span>
                </label>
                <Button onClick={handleCreate} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">Registrar Ingreso</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable columns={columns} data={requests} loading={loading} emptyMessage="No hay solicitudes" />
    </div>
  );
}
