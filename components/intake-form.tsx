'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STORAGE_CONDITIONS } from '@/lib/storage-condition';

function IntakeLabel({ text, optional = false }: { text: string; optional?: boolean }) {
  return (
    <Label>
      {text}
      {optional
        ? <span className="ml-1 text-[11px] font-normal text-muted-foreground/60">(opcional)</span>
        : ' *'}
    </Label>
  );
}

export const PRODUCT_ANALYSIS_MAP: Record<string, { label: string; norma: string; codes: string[] }> = {
  leche: {
    label: 'Leche y productos lácteos',
    norma: 'NTE INEN 10 / NTE INEN 14 / NTE INEN 1528',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-SOL', 'FQ-DEN', 'FQ-ACI', 'FQ-PH', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH', 'MI-SAL', 'MI-STA', 'MI-LIS'],
  },
  agua: {
    label: 'Agua potable / natural',
    norma: 'NTE INEN 1108 / Standard Methods',
    codes: ['FQ-PH', 'FQ-SOL', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH'],
  },
  harinas: {
    label: 'Harinas y pastas de origen vegetal',
    norma: 'NTE INEN-ISO 712 / NTE INEN 616 (Fortificación)',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-FIB', 'FQ-PH', 'FQ-ACI', 'FQ-CAR', 'FQ-HIE', 'FQ-CAL', 'MI-AER', 'MI-MOH'],
  },
  carnes: {
    label: 'Carne y productos cárnicos',
    norma: 'NTE INEN-ISO 1442 / NTE INEN 1338',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-PH', 'FQ-SAL', 'FQ-PER', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-SAL', 'MI-STA', 'MI-LIS', 'MI-CLP'],
  },
  alimentos: {
    label: 'Alimentos procesados y snacks',
    norma: 'NTE INEN 1334-2 / NTE INEN 2561',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-FIB', 'FQ-CAR', 'FQ-PH', 'FQ-ACI', 'FQ-SAL', 'FQ-PER', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH', 'MI-SAL', 'MI-STA', 'MI-LIS'],
  },
  bebidas: {
    label: 'Bebidas y jugos analcohólicos',
    norma: 'NTE INEN 2304 / NTE INEN 2337',
    codes: ['FQ-PH', 'FQ-BRI', 'FQ-ACI', 'FQ-SOL', 'FQ-VIT', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH'],
  },
  cereales: {
    label: 'Cereales, granos y derivados',
    norma: 'NTE INEN-ISO 712 / NTE INEN-ISO 20483',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-FIB', 'FQ-CAR', 'FQ-PH', 'FQ-HIE', 'FQ-CAL', 'MI-AER', 'MI-MOH', 'MI-SAL'],
  },
  conservas: {
    label: 'Conservas y alimentos enlatados',
    norma: 'NTE INEN 405 / NTE INEN 181',
    codes: ['FQ-PH', 'FQ-ACI', 'FQ-SAL', 'FQ-SOL', 'FQ-PER', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH', 'MI-CLP', 'MI-SAL', 'MI-STA'],
  },
  frutas: {
    label: 'Frutas, vegetales y pulpas',
    norma: 'NTE INEN 2337 / AOAC',
    codes: ['FQ-HUM', 'FQ-PH', 'FQ-BRI', 'FQ-ACI', 'FQ-VIT', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH'],
  },
  suplementos: {
    label: 'Suplementos alimenticios y nutricionales',
    norma: 'Regulación ARCSA / AOAC',
    codes: ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-CEN', 'FQ-HIE', 'FQ-CAL', 'FQ-VIT', 'MI-AER', 'MI-COL', 'MI-ECO', 'MI-MOH', 'MI-SAL'],
  },
};

export type IntakeValues = {
  clientId: string;
  sampleTypeId: string;
  description: string;
  observations: string;
  urgent: boolean;
  analysisTypeIds: string[];
  productName: string;
  brand: string;
  lot: string;
  elaborationDate: string;
  expirationDate: string;
  samplingDate: string;
  receptionDate: string;
  packaging: string;
  contentAmount: string;
  location: string;
  sampleCount: string;
  storageCondition: string;
  samplingBy: string;
  responsibleName: string;
  invoiceEmail: string;
  reportEmail: string;
};

export const emptyIntake = (): IntakeValues => ({
  clientId: '', sampleTypeId: '', description: '', observations: '', urgent: false,
  analysisTypeIds: [],
  productName: '', brand: '', lot: '', elaborationDate: '', expirationDate: '',
  samplingDate: '', receptionDate: '', packaging: '', contentAmount: '', location: '',
  sampleCount: '', storageCondition: '', samplingBy: '', responsibleName: '',
  invoiceEmail: '', reportEmail: '',
});

function foldName(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function productKeyForSampleType(name?: string | null) {
  const folded = foldName(name ?? '');
  if (!folded) return null;
  if (folded.includes('agua')) return 'agua';
  if (folded.includes('lact') || folded.includes('leche')) return 'leche';
  if (folded.includes('carn')) return 'carnes';
  if (folded.includes('harina')) return 'harinas';
  if (folded.includes('suplement')) return 'suplementos';
  if (folded.includes('bebida')) return 'bebidas';
  if (folded.includes('cereal') || folded.includes('grano')) return 'cereales';
  if (folded.includes('conserva')) return 'conservas';
  if (folded.includes('fruta') || folded.includes('vegetal') || folded.includes('hortaliza')) return 'frutas';
  if (folded.includes('alimento')) return 'alimentos';
  return null;
}

interface IntakeFormProps {
  form: IntakeValues;
  onChange: (next: IntakeValues) => void;
  clients: any[];
  sampleTypes: any[];
  analysisTypes: any[];
  readOnly?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  issues?: string[];
}

export function IntakeForm({
  form,
  onChange,
  clients,
  sampleTypes,
  analysisTypes,
  readOnly = false,
  onSubmit,
  submitLabel,
  issues = [],
}: IntakeFormProps) {
  const selectedIds = form.analysisTypeIds ?? [];
  const sampleTypeName = (sampleTypes ?? []).find((item) => item.id === form.sampleTypeId)?.name ?? '';
  const productKey = productKeyForSampleType(sampleTypeName);
  const spec = productKey ? PRODUCT_ANALYSIS_MAP[productKey] : null;
  const matrixIds = spec
    ? (analysisTypes ?? []).filter((item) => spec.codes.includes(String(item.code ?? '').trim())).map((item) => item.id)
    : [];
  const matrixIdSet = new Set(matrixIds);

  const toggleAnalysis = (id: string) => {
    if (readOnly) return;
    onChange({
      ...form,
      analysisTypeIds: selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id],
    });
  };

  const onSampleTypeChange = (value: string) => {
    if (readOnly) return;
    const nextName = (sampleTypes ?? []).find((item) => item.id === value)?.name ?? '';
    const nextKey = productKeyForSampleType(nextName);
    const nextSpec = nextKey ? PRODUCT_ANALYSIS_MAP[nextKey] : null;
    const allowed = nextSpec
      ? new Set((analysisTypes ?? []).filter((item) => nextSpec.codes.includes(String(item.code ?? '').trim())).map((item) => item.id))
      : null;
    onChange({
      ...form,
      sampleTypeId: value,
      analysisTypeIds: allowed ? selectedIds.filter((id) => allowed.has(id)) : [],
    });
  };

  const catalog = [...(analysisTypes ?? [])].sort((a, b) => {
    const area = String(a.area ?? '').localeCompare(String(b.area ?? ''));
    return area || String(a.name ?? '').localeCompare(String(b.name ?? ''));
  });
  const visible = spec ? catalog.filter((item) => matrixIdSet.has(item.id)) : [];
  const selectedVisible = visible.filter((item) => selectedIds.includes(item.id));
  const selectionTotal = selectedVisible.reduce((sum, item) => sum + Number(item.basePrice ?? 0), 0);

  const selectAll = () => {
    if (readOnly || !matrixIds.length) return;
    onChange({ ...form, analysisTypeIds: matrixIds });
  };

  const clearSelection = () => {
    if (readOnly) return;
    onChange({ ...form, analysisTypeIds: [] });
  };

  const selectedClient = (clients ?? []).find((item) => item.id === form.clientId);
  const clientEmail = String(selectedClient?.email ?? '').trim() || String(selectedClient?.contactEmail ?? '').trim();
  const invalid = (field: string) => issues.includes(field);
  const matrixKey = matrixIds.join('|');
  useEffect(() => {
    if (readOnly || !spec || !matrixKey) return;
    const allowed = new Set(matrixKey.split('|'));
    if (!selectedIds.some((id) => !allowed.has(id))) return;
    onChange({ ...form, analysisTypeIds: selectedIds.filter((id) => allowed.has(id)) });
  }, [readOnly, productKey, matrixKey]);

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-[#005F9E] mb-2 border-b pb-1">Datos del cliente y muestra</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className={invalid('clientId') ? 'rounded-md ring-1 ring-red-500' : ''}>
            <IntakeLabel text="Cliente" />
            <Select value={form.clientId || undefined} disabled={readOnly} onValueChange={(value: string) => onChange({ ...form, clientId: value })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>{(clients ?? []).map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={invalid('sampleTypeId') ? 'rounded-md ring-1 ring-red-500' : ''}>
            <IntakeLabel text="Tipo de Muestra" />
            <Select value={form.sampleTypeId || undefined} disabled={readOnly} onValueChange={onSampleTypeChange}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
              <SelectContent>{(sampleTypes ?? []).map((sampleType) => <SelectItem key={sampleType.id} value={sampleType.id}>{sampleType.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.clientId && (
            <p className={`col-span-2 text-xs ${clientEmail ? 'text-[#005F9E]' : 'text-amber-700'}`}>
              {clientEmail
                ? <>Se enviará a: <span className="font-medium">{clientEmail}</span></>
                : 'Este cliente no tiene correo. Complételo en Clientes.'}
            </p>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[#005F9E] mb-2 border-b pb-1">Información del producto</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className={invalid('productName') ? 'rounded-md ring-1 ring-red-500' : ''}><IntakeLabel text="Nombre del producto" /><Input disabled={readOnly} value={form.productName} onChange={(event: any) => onChange({ ...form, productName: event.target.value })} /></div>
          <div><IntakeLabel text="Marca" optional /><Input disabled={readOnly} value={form.brand} onChange={(event: any) => onChange({ ...form, brand: event.target.value })} /></div>
          <div className={invalid('lot') ? 'rounded-md ring-1 ring-red-500' : ''}><IntakeLabel text="Lote" /><Input disabled={readOnly} value={form.lot} onChange={(event: any) => onChange({ ...form, lot: event.target.value })} /></div>
          <div className={invalid('sampleCount') ? 'rounded-md ring-1 ring-red-500' : ''}><IntakeLabel text="N° de muestras" /><Input disabled={readOnly} type="number" min="1" value={form.sampleCount} onChange={(event: any) => onChange({ ...form, sampleCount: event.target.value })} /></div>
          <div><IntakeLabel text="Fecha de elaboración" optional /><Input disabled={readOnly} type="date" value={form.elaborationDate} onChange={(event: any) => onChange({ ...form, elaborationDate: event.target.value })} /></div>
          <div><IntakeLabel text="Fecha de vencimiento" optional /><Input disabled={readOnly} type="date" value={form.expirationDate} onChange={(event: any) => onChange({ ...form, expirationDate: event.target.value })} /></div>
          <div><IntakeLabel text="Fecha de toma de muestra" optional /><Input disabled={readOnly} type="date" value={form.samplingDate} onChange={(event: any) => onChange({ ...form, samplingDate: event.target.value })} /></div>
          <div className={invalid('receptionDate') ? 'rounded-md ring-1 ring-red-500' : ''}><IntakeLabel text="Fecha de recepción" /><Input disabled={readOnly} type="date" value={form.receptionDate} onChange={(event: any) => onChange({ ...form, receptionDate: event.target.value })} /></div>
          <div><IntakeLabel text="Envase" optional /><Input disabled={readOnly} value={form.packaging} onChange={(event: any) => onChange({ ...form, packaging: event.target.value })} /></div>
          <div><IntakeLabel text="Contenido / cantidad" optional /><Input disabled={readOnly} value={form.contentAmount} onChange={(event: any) => onChange({ ...form, contentAmount: event.target.value })} /></div>
          <div><IntakeLabel text="Localización" optional /><Input disabled={readOnly} value={form.location} onChange={(event: any) => onChange({ ...form, location: event.target.value })} /></div>
          <div>
            <IntakeLabel text="Condiciones de conservación" optional />
            <Select value={form.storageCondition || undefined} disabled={readOnly} onValueChange={(value: string) => onChange({ ...form, storageCondition: value })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {STORAGE_CONDITIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                {form.storageCondition && !STORAGE_CONDITIONS.some((item) => item.value === form.storageCondition) && (
                  <SelectItem value={form.storageCondition}>{form.storageCondition}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div><IntakeLabel text="Toma de muestra por" optional /><Input disabled={readOnly} value={form.samplingBy} onChange={(event: any) => onChange({ ...form, samplingBy: event.target.value })} /></div>
          <div><IntakeLabel text="Responsable" optional /><Input disabled={readOnly} value={form.responsibleName} onChange={(event: any) => onChange({ ...form, responsibleName: event.target.value })} /></div>
        </div>
      </div>

      <div>
        <h4 className={`text-sm font-semibold mb-2 border-b pb-1 ${invalid('analysisTypeIds') ? 'text-red-600' : 'text-[#005F9E]'}`}>Parámetros a analizar *</h4>
        <div className="mb-3 space-y-2">
          {spec ? (
            <div className="rounded-lg border border-[#00AEEF]/30 bg-[#00AEEF]/5 px-3 py-2 text-sm text-[#005F9E]">
              Norma técnica aplicable: <span className="font-medium">{spec.norma}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{spec.label}</span>
            </div>
          ) : form.sampleTypeId ? (
            <p className="text-sm text-muted-foreground">Este tipo de muestra no tiene parámetros normativos cargados.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Seleccione el tipo de muestra para ver los parámetros de la norma aplicable.</p>
          )}
          {spec && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={readOnly || visible.length === 0} onClick={selectAll}>
                Seleccionar todo
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={readOnly || selectedVisible.length === 0} onClick={clearSelection}>
                Limpiar selección
              </Button>
            </div>
          )}
        </div>
        <div className="max-h-72 overflow-auto rounded-lg border">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[25%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-[#005F9E]">
                <th className="bg-[#e7f6fc] p-2 font-medium"></th>
                <th className="bg-[#e7f6fc] p-2 font-medium">Parámetro</th>
                <th className="bg-[#e7f6fc] p-2 font-medium">Área</th>
                <th className="bg-[#e7f6fc] p-2 font-medium">Unidad</th>
                <th className="bg-[#e7f6fc] p-2 font-medium">Método</th>
                <th className="bg-[#e7f6fc] p-2 font-medium">Rango</th>
                <th className="bg-[#e7f6fc] p-2 text-right font-medium">Precio</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-sm text-muted-foreground">
                    {form.sampleTypeId ? 'No hay ensayos cargados para esta norma.' : 'Seleccione el tipo de muestra para listar los ensayos de su norma.'}
                  </td>
                </tr>
              )}
              {visible.map((item: any) => {
                const checked = selectedIds.includes(item.id);
                const range = (item.minValue != null && item.maxValue != null)
                  ? `${item.minValue}–${item.maxValue}`
                  : (item.maxValue != null ? `≤ ${item.maxValue}` : (item.minValue != null ? `≥ ${item.minValue}` : '—'));
                return (
                  <tr key={item.id} className={`${readOnly ? '' : 'cursor-pointer hover:bg-muted/50'} ${checked ? 'bg-[#00AEEF]/5' : ''}`} onClick={() => toggleAnalysis(item.id)}>
                    <td className="border-t p-2 align-top" onClick={(event) => event.stopPropagation()}><Checkbox checked={checked} disabled={readOnly} onCheckedChange={() => toggleAnalysis(item.id)} /></td>
                    <td className="border-t p-2 align-top break-words font-medium">{item.name ?? '—'}</td>
                    <td className="border-t p-2 align-top break-words text-xs">{item.area === 'FISICOQUIMICA' ? 'FQ' : item.area === 'MICROBIOLOGIA' ? 'MICA' : '—'}</td>
                    <td className="border-t p-2 align-top break-words text-xs">{item.unit ?? '—'}</td>
                    <td className="border-t p-2 align-top break-words text-xs leading-snug">{item.method ?? '—'}</td>
                    <td className="border-t p-2 align-top break-words text-xs">{range}</td>
                    <td className="border-t p-2 align-top break-words text-right text-xs">{item.basePrice != null ? `$${Number(item.basePrice).toFixed(2)}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm ${invalid('analysisTypeIds') ? 'bg-red-50' : 'bg-[#00AEEF]/5'}`}>
          <span className="text-muted-foreground">{selectedVisible.length} parámetro(s) seleccionado(s)</span>
          <span className="font-semibold text-[#005F9E]">Total ${selectionTotal.toFixed(2)}</span>
        </div>
        {invalid('analysisTypeIds') && <p className="text-xs text-red-600 mt-1">Seleccione al menos un parámetro.</p>}
      </div>

      <div><IntakeLabel text="Descripción" optional /><Textarea disabled={readOnly} value={form.description} onChange={(event: any) => onChange({ ...form, description: event.target.value })} /></div>
      <div><IntakeLabel text="Observaciones" optional /><Textarea disabled={readOnly} value={form.observations} onChange={(event: any) => onChange({ ...form, observations: event.target.value })} /></div>
      {onSubmit && submitLabel && (
        <Button onClick={onSubmit} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">{submitLabel}</Button>
      )}
    </div>
  );
}
