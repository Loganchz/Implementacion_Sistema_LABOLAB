'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Plus, FlaskConical, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracionPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [analysisTypes, setAnalysisTypes] = useState<any[]>([]);
  const [sampleTypes, setSampleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [atDialog, setAtDialog] = useState(false);
  const [atForm, setAtForm] = useState({ code: '', name: '', area: 'FISICOQUIMICA', description: '', method: '', basePrice: 0, estimatedDays: 5, unit: '', detectionLimit: '', minValue: '', maxValue: '' });
  const [stDialog, setStDialog] = useState(false);
  const [stForm, setStForm] = useState({ name: '', description: '' });
  const [editDialog, setEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({ code: '', name: '', area: 'FISICOQUIMICA', description: '', method: '', basePrice: 0, estimatedDays: 5, unit: '', detectionLimit: '', minValue: '', maxValue: '', active: true });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, atRes, stRes] = await Promise.all([
        fetch('/api/config'), fetch('/api/analysis-types'), fetch('/api/sample-types'),
      ]);
      if (cfgRes.ok) setConfigs(await cfgRes.json());
      if (atRes.ok) setAnalysisTypes(await atRes.json());
      if (stRes.ok) setSampleTypes(await stRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveConfig = async (key: string, value: string, label: string, category: string) => {
    try {
      await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value, label, category }) });
      toast.success('Configuración guardada');
      loadData();
    } catch { toast.error('Error'); }
  };

  const createAnalysisType = async () => {
    if (!atForm.code || !atForm.name) { toast.error('Código y nombre requeridos'); return; }
    try {
      const body = { ...atForm, basePrice: parseFloat(String(atForm.basePrice)) || 0, estimatedDays: parseInt(String(atForm.estimatedDays)) || 5, minValue: atForm.minValue ? parseFloat(atForm.minValue) : null, maxValue: atForm.maxValue ? parseFloat(atForm.maxValue) : null };
      const res = await fetch('/api/analysis-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { toast.success('Análisis creado'); setAtDialog(false); loadData(); }
      else { const err = await res.json(); toast.error(err?.error ?? 'Error'); }
    } catch { toast.error('Error'); }
  };

  const openEdit = (at: any) => {
    setEditingId(at.id);
    setEditForm({
      code: at.code ?? '', name: at.name ?? '', area: at.area ?? 'FISICOQUIMICA',
      description: at.description ?? '', method: at.method ?? '',
      basePrice: at.basePrice ?? 0, estimatedDays: at.estimatedDays ?? 5,
      unit: at.unit ?? '', detectionLimit: at.detectionLimit ?? '',
      minValue: at.minValue ?? '', maxValue: at.maxValue ?? '', active: at.active ?? true,
    });
    setEditDialog(true);
  };

  const updateAnalysisType = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/analysis-types/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { toast.success('Parámetro actualizado'); setEditDialog(false); setEditingId(null); loadData(); }
      else { const err = await res.json(); toast.error(err?.error ?? 'Error'); }
    } catch { toast.error('Error'); }
  };

  const createSampleType = async () => {
    if (!stForm.name) { toast.error('Nombre requerido'); return; }
    try {
      const res = await fetch('/api/sample-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stForm) });
      if (res.ok) { toast.success('Tipo de muestra creado'); setStDialog(false); loadData(); }
    } catch { toast.error('Error'); }
  };

  const getConfigValue = (key: string, def: string = '') => (configs ?? []).find((c: any) => c?.key === key)?.value ?? def;

  return (
    <div>
      <PageHeader title="Configuración" description="Parámetros del sistema" icon={Settings} />

      <Tabs defaultValue="laboratorio">
        <TabsList className="mb-4">
          <TabsTrigger value="laboratorio">Laboratorio</TabsTrigger>
          <TabsTrigger value="analisis">Catálogo de Análisis</TabsTrigger>
          <TabsTrigger value="muestras">Tipos de Muestra</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="laboratorio">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 space-y-4">
              <LabConfigField label="Nombre del Laboratorio" configKey="lab_name" category="LABORATORIO" defaultValue="LABOLAB" currentValue={getConfigValue('lab_name', 'LABOLAB')} onSave={saveConfig} />
              <LabConfigField label="Dirección" configKey="lab_address" category="LABORATORIO" defaultValue="" currentValue={getConfigValue('lab_address')} onSave={saveConfig} />
              <LabConfigField label="Teléfono" configKey="lab_phone" category="LABORATORIO" defaultValue="" currentValue={getConfigValue('lab_phone')} onSave={saveConfig} />
              <LabConfigField label="Email" configKey="lab_email" category="LABORATORIO" defaultValue="" currentValue={getConfigValue('lab_email')} onSave={saveConfig} />
              <LabConfigField label="IVA (%)" configKey="tax_rate" category="SISTEMA" defaultValue="12" currentValue={getConfigValue('tax_rate', '12')} onSave={saveConfig} />
              <LabConfigField label="Validez Cotización (días)" configKey="quote_validity_days" category="SISTEMA" defaultValue="15" currentValue={getConfigValue('quote_validity_days', '15')} onSave={saveConfig} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analisis">
          <div className="mb-4 rounded-lg bg-[#00AEEF]/5 border border-[#00AEEF]/20 p-3 text-xs text-[#005F9E]">
            Configure aquí los <b>límites normativos</b> de cada parámetro (valor mínimo y máximo permitidos, unidad, método/norma y límite de detección). El sistema usará estos límites para <b>alertar automáticamente</b> cuando un resultado quede fuera de rango (no conforme).
          </div>
          <div className="flex justify-end mb-4">
            <Dialog open={atDialog} onOpenChange={setAtDialog}>
              <DialogTrigger asChild><Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white"><Plus className="w-4 h-4 mr-2" /> Nuevo Análisis</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nuevo Tipo de Análisis</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Código *</Label><Input value={atForm.code} onChange={(e: any) => setAtForm({ ...atForm, code: e.target.value })} /></div>
                    <div><Label>Nombre *</Label><Input value={atForm.name} onChange={(e: any) => setAtForm({ ...atForm, name: e.target.value })} /></div>
                  </div>
                  <div><Label>Área</Label>
                    <Select value={atForm.area} onValueChange={(v: string) => setAtForm({ ...atForm, area: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="FISICOQUIMICA">Fisicoquímica</SelectItem><SelectItem value="MICROBIOLOGIA">Microbiología</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Método / Norma</Label><Input value={atForm.method} onChange={(e: any) => setAtForm({ ...atForm, method: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Precio Base ($)</Label><Input type="number" value={atForm.basePrice} onChange={(e: any) => setAtForm({ ...atForm, basePrice: e.target.value })} /></div>
                    <div><Label>Días Est.</Label><Input type="number" value={atForm.estimatedDays} onChange={(e: any) => setAtForm({ ...atForm, estimatedDays: e.target.value })} /></div>
                    <div><Label>Unidad</Label><Input value={atForm.unit} onChange={(e: any) => setAtForm({ ...atForm, unit: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor Mín.</Label><Input type="number" step="any" value={atForm.minValue} onChange={(e: any) => setAtForm({ ...atForm, minValue: e.target.value })} /></div>
                    <div><Label>Valor Máx.</Label><Input type="number" step="any" value={atForm.maxValue} onChange={(e: any) => setAtForm({ ...atForm, maxValue: e.target.value })} /></div>
                  </div>
                  <Button onClick={createAnalysisType} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">Crear</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {(analysisTypes ?? []).map((at: any) => {
              const limit = at.minValue != null && at.maxValue != null
                ? `${at.minValue} – ${at.maxValue} ${at.unit ?? ''}`
                : at.maxValue != null ? `≤ ${at.maxValue} ${at.unit ?? ''}`
                : at.minValue != null ? `≥ ${at.minValue} ${at.unit ?? ''}`
                : 'Sin límite';
              return (
              <Card key={at.id} className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FlaskConical className="w-4 h-4 text-[#00AEEF] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{at.name} <span className="font-mono text-xs text-muted-foreground">({at.code})</span></p>
                      <p className="text-xs text-muted-foreground">{at.method ?? '-'} | {at.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA'} | ${at.basePrice?.toFixed(2) ?? '0.00'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Límite normativo</p>
                      <p className={`text-xs font-semibold ${limit === 'Sin límite' ? 'text-amber-600' : 'text-[#005F9E]'}`}>{limit}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${at.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{at.active ? 'Activo' : 'Inactivo'}</span>
                    <Button size="sm" variant="outline" onClick={() => openEdit(at)}><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>

          <Dialog open={editDialog} onOpenChange={setEditDialog}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Editar Parámetro y Límites</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nombre</Label><Input value={editForm.name} onChange={(e: any) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div><Label>Área</Label>
                  <Select value={editForm.area} onValueChange={(v: string) => setEditForm({ ...editForm, area: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="FISICOQUIMICA">Fisicoquímica</SelectItem><SelectItem value="MICROBIOLOGIA">Microbiología</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Método / Norma</Label><Input value={editForm.method} onChange={(e: any) => setEditForm({ ...editForm, method: e.target.value })} placeholder="Ej: AOAC 990.12, INEN 1529" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Precio Base ($)</Label><Input type="number" value={editForm.basePrice} onChange={(e: any) => setEditForm({ ...editForm, basePrice: e.target.value })} /></div>
                  <div><Label>Días Est.</Label><Input type="number" value={editForm.estimatedDays} onChange={(e: any) => setEditForm({ ...editForm, estimatedDays: e.target.value })} /></div>
                  <div><Label>Unidad</Label><Input value={editForm.unit} onChange={(e: any) => setEditForm({ ...editForm, unit: e.target.value })} placeholder="mg/L, UFC/g" /></div>
                </div>
                <div><Label>Límite de Detección</Label><Input value={editForm.detectionLimit} onChange={(e: any) => setEditForm({ ...editForm, detectionLimit: e.target.value })} placeholder="Ej: <10 UFC/g" /></div>
                <div className="rounded-lg border border-[#00AEEF]/30 bg-[#00AEEF]/5 p-3">
                  <p className="text-xs font-semibold text-[#005F9E] mb-2">Límites normativos (para alertas de fuera de rango)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor Mín.</Label><Input type="number" step="any" value={editForm.minValue} onChange={(e: any) => setEditForm({ ...editForm, minValue: e.target.value })} placeholder="opcional" /></div>
                    <div><Label>Valor Máx.</Label><Input type="number" step="any" value={editForm.maxValue} onChange={(e: any) => setEditForm({ ...editForm, maxValue: e.target.value })} placeholder="opcional" /></div>
                  </div>
                </div>
                <div><Label>Descripción</Label><Textarea value={editForm.description} onChange={(e: any) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                <div className="flex items-center gap-2">
                  <input id="at-active" type="checkbox" checked={!!editForm.active} onChange={(e: any) => setEditForm({ ...editForm, active: e.target.checked })} className="w-4 h-4 accent-[#00AEEF]" />
                  <Label htmlFor="at-active" className="cursor-pointer">Análisis activo</Label>
                </div>
                <Button onClick={updateAnalysisType} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">Guardar Cambios</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="muestras">
          <div className="flex justify-end mb-4">
            <Dialog open={stDialog} onOpenChange={setStDialog}>
              <DialogTrigger asChild><Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white"><Plus className="w-4 h-4 mr-2" /> Nuevo Tipo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Tipo de Muestra</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nombre *</Label><Input value={stForm.name} onChange={(e: any) => setStForm({ ...stForm, name: e.target.value })} /></div>
                  <div><Label>Descripción</Label><Input value={stForm.description} onChange={(e: any) => setStForm({ ...stForm, description: e.target.value })} /></div>
                  <Button onClick={createSampleType} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">Crear</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {(sampleTypes ?? []).map((st: any) => (
              <Card key={st.id} className="border-none shadow-sm">
                <CardContent className="p-4"><p className="text-sm font-medium">{st.name}</p><p className="text-xs text-muted-foreground">{st.description ?? '-'}</p></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sistema">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Configuraciones adicionales del sistema. Los contadores de numeración (OT, COT, MUE, SOL, REP) se gestionan automáticamente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LabConfigField({ label, configKey, category, defaultValue, currentValue, onSave }: any) {
  const [value, setValue] = useState(currentValue ?? defaultValue ?? '');
  useEffect(() => { setValue(currentValue ?? defaultValue ?? ''); }, [currentValue, defaultValue]);
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1"><Label>{label}</Label><Input value={value} onChange={(e: any) => setValue(e.target.value)} /></div>
      <Button size="sm" variant="outline" onClick={() => onSave(configKey, value, label, category)}>Guardar</Button>
    </div>
  );
}
