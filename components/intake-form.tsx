'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, CheckCircle2, ShieldCheck, FileCheck, Layers, FlaskConical, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { joinStorageConditions, storageConditionCodes } from '@/lib/storage-condition';
import type { IntakeIssue } from '@/lib/intake-rules';

export type CustomAnalysisItem = {
  analysis: string;
  technique: string;
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

  // Campos oficiales adicionales (Norma / ARCSA / Proforma)
  quoteNumber: string;
  isSanitaryNotification: boolean;
  packagingMaterial: string;
  servingSize: string;
  shelfLife: string;
  dilution: string;
  hasCustomAnalyses: boolean;
  customAnalyses: CustomAnalysisItem[];
};

export const emptyIntake = (): IntakeValues => ({
  clientId: '',
  sampleTypeId: '',
  description: '',
  observations: '',
  urgent: false,
  analysisTypeIds: [],
  productName: '',
  brand: '',
  lot: '',
  elaborationDate: '',
  expirationDate: '',
  samplingDate: '',
  receptionDate: new Date().toISOString().split('T')[0],
  packaging: '',
  contentAmount: '',
  location: '',
  sampleCount: '1',
  storageCondition: 'AMBIENTE',
  samplingBy: '',
  responsibleName: '',
  invoiceEmail: '',
  reportEmail: '',

  quoteNumber: '',
  isSanitaryNotification: false,
  packagingMaterial: '',
  servingSize: '',
  shelfLife: '',
  dilution: '',
  hasCustomAnalyses: false,
  customAnalyses: [{ analysis: '', technique: '' }],
});

function FieldHelp({
  title,
  description,
  isRequired = false,
}: {
  title?: string;
  description: string;
  isRequired?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          onMouseEnter={() => {
            if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
              setOpen(true);
            }
          }}
          onMouseLeave={() => {
            if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
              setOpen(false);
            }
          }}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-[#005F9E] hover:bg-sky-50 active:bg-sky-100 transition-colors focus:outline-hidden cursor-pointer touch-manipulation shrink-0"
          aria-label={`Ayuda sobre ${title || 'este campo'}`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-72 sm:w-80 p-3.5 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-xl z-50 text-xs text-slate-700 pointer-events-auto"
        onMouseEnter={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
            setOpen(true);
          }
        }}
        onMouseLeave={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
            setOpen(false);
          }
        }}
      >
        {title && (
          <h5 className="font-bold text-[#005F9E] mb-1.5 text-xs flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#00AEEF] shrink-0" />
            {title}
          </h5>
        )}
        <p className="leading-relaxed text-slate-600 text-xs">{description}</p>
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px]">
          {isRequired ? (
            <span className="font-semibold text-emerald-700">✓ Campo obligatorio para el registro</span>
          ) : (
            <span className="font-normal text-slate-500">💡 Si no aplica, déjelo vacío (se guardará como N/A)</span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function IntakeLabel({
  text,
  required = false,
  help,
}: {
  text: string;
  required?: boolean;
  help?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-1">
        <span>{text}</span>
        {required && <span className="text-red-500 font-bold">*</span>}
      </Label>
      {help && <FieldHelp title={text} description={help} isRequired={required} />}
    </div>
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
  issues?: IntakeIssue[];
  scrollToken?: number;
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
  scrollToken = 0,
}: IntakeFormProps) {
  const selectedIds = form.analysisTypeIds ?? [];
  const sampleTypeName = (sampleTypes ?? []).find((item) => item.id === form.sampleTypeId)?.name ?? '';
  const productKey = productKeyForSampleType(sampleTypeName);
  const spec = productKey ? PRODUCT_ANALYSIS_MAP[productKey] : null;
  const formRef = React.useRef(form);
  formRef.current = form;
  const quoteAssayIds = React.useRef<string[] | null>(null);
  const quoteRequest = React.useRef(0);
  const typedQuote = React.useRef(form.quoteNumber);
  const [quoteHint, setQuoteHint] = React.useState('');
  const [quoteHintOk, setQuoteHintOk] = React.useState(false);
  const [quoteBusy, setQuoteBusy] = React.useState(false);
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

  const onClientSelect = (clientId: string) => {
    if (readOnly) return;
    const hadQuote = quoteAssayIds.current !== null;
    quoteAssayIds.current = null;
    typedQuote.current = '';
    setQuoteHint('');
    setQuoteHintOk(false);
    const client = (clients ?? []).find((c) => c.id === clientId);
    const email = String(client?.email ?? '').trim() || String(client?.contactEmail ?? '').trim();
    onChange({
      ...form,
      clientId,
      invoiceEmail: email,
      reportEmail: email,
      responsibleName: String(client?.contactName ?? '').trim(),
      quoteNumber: '',
      analysisTypeIds: hadQuote ? [] : selectedIds,
    });
  };

  const assaysForMatrix = (sampleTypeId: string, sourceIds: string[]) => {
    const nextName = (sampleTypes ?? []).find((item) => item.id === sampleTypeId)?.name ?? '';
    const nextKey = productKeyForSampleType(nextName);
    const nextSpec = nextKey ? PRODUCT_ANALYSIS_MAP[nextKey] : null;
    if (!nextSpec) return [];
    const allowed = new Set(
      (analysisTypes ?? [])
        .filter((item) => nextSpec.codes.includes(String(item.code ?? '').trim()))
        .map((item) => item.id),
    );
    return sourceIds.filter((id) => allowed.has(id));
  };

  const onSampleTypeChange = (value: string) => {
    if (readOnly) return;
    const number = form.quoteNumber.trim();
    if (number && !/^n\/?a$/i.test(number)) {
      const source = quoteAssayIds.current ?? selectedIds;
      onChange({
        ...form,
        sampleTypeId: value,
        analysisTypeIds: assaysForMatrix(value, source),
      });
      void applyQuoteNumber(number, value);
      return;
    }
    onChange({
      ...form,
      sampleTypeId: value,
      analysisTypeIds: assaysForMatrix(value, selectedIds),
    });
  };

  const applyQuoteNumber = async (raw: string, sampleTypeId?: string) => {
    if (readOnly) return;
    const number = raw.trim();
    typedQuote.current = number;
    if (!number || /^n\/?a$/i.test(number)) {
      quoteAssayIds.current = null;
      setQuoteHint('');
      setQuoteHintOk(false);
      return;
    }
    const current = formRef.current;
    const typeId = sampleTypeId || current.sampleTypeId;
    if (!current.clientId) {
      quoteAssayIds.current = null;
      setQuoteHintOk(false);
      setQuoteHint('Elija primero el cliente. La proforma tiene que ser de ese mismo cliente.');
      return;
    }
    if (!typeId) {
      quoteAssayIds.current = null;
      setQuoteHintOk(false);
      setQuoteHint('Elija el tipo de muestra antes de la proforma. Los ensayos se cargan solo si aplican a esa matriz.');
      return;
    }
    const ticket = ++quoteRequest.current;
    setQuoteBusy(true);
    try {
      const res = await fetch(`/api/quotes/lookup?number=${encodeURIComponent(number)}`);
      const data = await res.json().catch(() => ({}));
      if (ticket !== quoteRequest.current) return;
      const latest = formRef.current;
      if (typedQuote.current.trim().toUpperCase() !== number.toUpperCase()) return;
      if (!res.ok) {
        quoteAssayIds.current = null;
        setQuoteHintOk(false);
        setQuoteHint(data?.error ?? 'No se encontró esa proforma.');
        return;
      }
      if (data.clientId !== latest.clientId) {
        quoteAssayIds.current = null;
        onChange({ ...latest, sampleTypeId: typeId, analysisTypeIds: [] });
        setQuoteHintOk(false);
        setQuoteHint('Esa proforma no pertenece a este cliente. No se cargaron los parámetros.');
        return;
      }
      const loaded: string[] = Array.isArray(data.analysisTypeIds) ? data.analysisTypeIds : [];
      quoteAssayIds.current = loaded;
      typedQuote.current = data.quoteNumber;
      const applicable = assaysForMatrix(typeId, loaded);
      onChange({
        ...latest,
        sampleTypeId: typeId,
        quoteNumber: data.quoteNumber,
        analysisTypeIds: applicable,
        hasCustomAnalyses: false,
      });
      setQuoteHintOk(true);
      setQuoteHint('Carga exitosa. Revise los parámetros.');
    } catch {
      setQuoteHintOk(false);
      setQuoteHint('No se pudo consultar la proforma.');
    } finally {
      if (ticket === quoteRequest.current) setQuoteBusy(false);
    }
  };

  const toggleStorage = (code: string) => {
    if (readOnly) return;
    const current = new Set(storageConditionCodes(form.storageCondition));
    if (current.has(code)) current.delete(code);
    else current.add(code);
    onChange({ ...form, storageCondition: joinStorageConditions([...current]) });
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

  // Manejadores para la tabla dinámica de análisis especiales
  const addCustomAnalysis = () => {
    if (readOnly) return;
    const current = form.customAnalyses ?? [];
    onChange({
      ...form,
      customAnalyses: [...current, { analysis: '', technique: '' }],
    });
  };

  const updateCustomAnalysis = (index: number, key: 'analysis' | 'technique', value: string) => {
    if (readOnly) return;
    const current = [...(form.customAnalyses ?? [])];
    if (!current[index]) current[index] = { analysis: '', technique: '' };
    current[index] = { ...current[index], [key]: value };
    onChange({ ...form, customAnalyses: current });
  };

  const removeCustomAnalysis = (index: number) => {
    if (readOnly) return;
    const current = (form.customAnalyses ?? []).filter((_, i) => i !== index);
    onChange({
      ...form,
      customAnalyses: current.length ? current : [{ analysis: '', technique: '' }],
    });
  };

  const reason = (field: string) => issues.find((issue) => issue.field === field)?.message ?? '';
  const invalid = (field: string) => Boolean(reason(field));

  useEffect(() => {
    if (!scrollToken) return;
    const first = issues.find((issue) => issue.field !== 'form');
    if (!first) return;
    document.querySelector(`[data-intake-field="${first.field}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollToken]);

  const requiredBox = (field: string, className?: string) => cn(
    className,
    invalid(field) && 'rounded-xl border-2 border-red-500 bg-red-50 p-2',
  );

  return (
    <div className="space-y-5">
      {issues.length > 0 && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-bold">No se puede guardar. Esto es lo que está fallando:</p>
          <ul className="mt-2 space-y-1">
            {issues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>
                <span className="font-semibold">{issue.label}.</span> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────
          FASE 1: DATOS DEL CLIENTE Y RECEPCIÓN
      ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center text-[#005F9E]">
            <span className="font-bold text-xs">1</span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-[#005F9E]">Datos del Cliente y Recepción</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div data-intake-field="clientId" className={requiredBox('clientId')}>
            <IntakeLabel
              text="Cliente"
              required
              help="Seleccione la empresa o persona natural registrada como titular del análisis."
            />
            <Select value={form.clientId || undefined} disabled={readOnly} onValueChange={onClientSelect}>
              <SelectTrigger className="h-11 sm:h-10 text-sm">
                <SelectValue placeholder="Seleccionar cliente registrado" />
              </SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {invalid('clientId') && <p className="mt-1 text-xs font-semibold text-red-600">{reason('clientId')}</p>}
          </div>

          <div data-intake-field="sampleTypeId" className={requiredBox('sampleTypeId')}>
            <IntakeLabel
              text="Tipo de Muestra / Matriz"
              required
              help="Categoría técnica que determina las normas aplicables (ej: Lácteos, Aguas, Cárnicos)."
            />
            <Select value={form.sampleTypeId || undefined} disabled={readOnly} onValueChange={onSampleTypeChange}>
              <SelectTrigger className="h-11 sm:h-10 text-sm">
                <SelectValue placeholder="Seleccionar matriz técnica" />
              </SelectTrigger>
              <SelectContent>
                {(sampleTypes ?? []).map((sampleType) => (
                  <SelectItem key={sampleType.id} value={sampleType.id}>
                    {sampleType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {invalid('sampleTypeId') && <p className="mt-1 text-xs font-semibold text-red-600">{reason('sampleTypeId')}</p>}
          </div>

          <div>
            <IntakeLabel
              text="Email para envío de factura"
              help="Correo electrónico donde se enviará el comprobante electrónico / factura."
            />
            <Input
              type="email"
              placeholder="facturacion@empresa.com"
              disabled={readOnly}
              value={form.invoiceEmail}
              onChange={(e) => onChange({ ...form, invoiceEmail: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div>
            <IntakeLabel
              text="Email para envío de informe"
              help="Correo electrónico oficial del responsable técnico donde se notificará el informe final firmado."
            />
            <Input
              type="email"
              placeholder="calidad@empresa.com"
              disabled={readOnly}
              value={form.reportEmail}
              onChange={(e) => onChange({ ...form, reportEmail: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div>
            <IntakeLabel
              text="Nombre de responsable"
              help="Persona que entrega la muestra o contacto técnico responsable."
            />
            <Input
              placeholder="Ing. Carlos Pérez"
              disabled={readOnly}
              value={form.responsibleName}
              onChange={(e) => onChange({ ...form, responsibleName: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div data-intake-field="receptionDate" className={requiredBox('receptionDate')}>
            <IntakeLabel
              text="Fecha de recepción de la muestra"
              required
              help="Fecha en que la muestra ingresa formalmente a las instalaciones del laboratorio."
            />
            <Input
              type="date"
              disabled={readOnly}
              value={form.receptionDate}
              onChange={(e) => onChange({ ...form, receptionDate: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
            {invalid('receptionDate') && <p className="mt-1 text-xs font-semibold text-red-600">{reason('receptionDate')}</p>}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          FASE 2: INFORMACIÓN DEL PRODUCTO
      ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center text-[#005F9E]">
            <span className="font-bold text-xs">2</span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-[#005F9E]">Información del Producto</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div data-intake-field="productName" className={requiredBox('productName', 'sm:col-span-2')}>
            <IntakeLabel
              text="Nombre del producto"
              required
              help="Debe ir especificado qué es la muestra (ej: Queso fresco, Agua de pozo). La marca es obligatoria para notificación sanitaria."
            />
            <Input
              placeholder="Queso fresco pasteurizado"
              disabled={readOnly}
              value={form.productName}
              onChange={(e) => onChange({ ...form, productName: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
            {invalid('productName') && <p className="mt-1 text-xs font-semibold text-red-600">{reason('productName')}</p>}
          </div>

          <div>
            <IntakeLabel
              text="Marca del producto"
              help="Marca comercial del producto. Obligatoria para trámites de Notificación Sanitaria ante ARCSA."
            />
            <Input
              placeholder="Lácteos El Prado"
              disabled={readOnly}
              value={form.brand}
              onChange={(e) => onChange({ ...form, brand: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div data-intake-field="lot" className={requiredBox('lot')}>
            <IntakeLabel
              text="Lote"
              required
              help="Código de lote de fabricación indicado en el envase del producto."
            />
            <Input
              placeholder="L-2026-01"
              disabled={readOnly}
              value={form.lot}
              onChange={(e) => onChange({ ...form, lot: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
            {invalid('lot') && <p className="mt-1 text-xs font-semibold text-red-600">{reason('lot')}</p>}
          </div>

          <div data-intake-field="sampleCount" className={requiredBox('sampleCount')}>
            <IntakeLabel
              text="Número de muestras"
              required
              help="Cantidad de frascos o recipientes entregados para el plan de muestreo."
            />
            <Input
              type="number"
              min="1"
              disabled={readOnly}
              value={form.sampleCount}
              onChange={(e) => onChange({ ...form, sampleCount: e.target.value })}
              className="h-11 sm:h-10 text-sm font-semibold"
            />
            {invalid('sampleCount') && <p className="mt-1 text-xs font-semibold text-red-600">{reason('sampleCount')}</p>}
          </div>

          <div>
            <IntakeLabel
              text="Envase y contenido"
              help="Tipo de recipiente (PET, polietileno, vidrio) y contenido neto (g, ml, kg). Si se deja vacío, se guarda como N/A."
            />
            <Input
              placeholder="Botella PET 500 ml"
              disabled={readOnly}
              value={form.packaging}
              onChange={(e) => onChange({ ...form, packaging: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div>
            <IntakeLabel
              text="Fecha de elaboración de la muestra"
              help="Fecha de producción o elaboración señalada en el producto (formato dd/mm/aaaa)."
            />
            <Input
              type="date"
              disabled={readOnly}
              value={form.elaborationDate}
              onChange={(e) => onChange({ ...form, elaborationDate: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div>
            <IntakeLabel
              text="Fecha de toma de la muestra"
              help="Fecha en que se recolectó la muestra en campo o planta (formato dd/mm/aaaa)."
            />
            <Input
              type="date"
              disabled={readOnly}
              value={form.samplingDate}
              onChange={(e) => onChange({ ...form, samplingDate: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div>
            <IntakeLabel
              text="Fecha de vencimiento de la muestra"
              help="Fecha límite de caducidad indicada en el producto (formato dd/mm/aaaa)."
            />
            <Input
              type="date"
              disabled={readOnly}
              value={form.expirationDate}
              onChange={(e) => onChange({ ...form, expirationDate: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div>
            <IntakeLabel
              text="Localización"
              help="Punto o zona de extracción específica. Solo aplica para aguas, suelos, superficies o ambientes."
            />
            <Input
              placeholder="Cisterna principal / Pozo 1"
              disabled={readOnly}
              value={form.location}
              onChange={(e) => onChange({ ...form, location: e.target.value })}
              className="h-11 sm:h-10 text-sm"
            />
          </div>

          <div data-intake-field="storageCondition" className={requiredBox('storageCondition', 'sm:col-span-2')}>
            <div className="flex flex-col items-center text-center">
              <IntakeLabel
                text="Conservación de la muestra"
                required
                help="Puede marcar más de una condición cuando el producto se conserva, por ejemplo, a ambiente y en refrigeración."
              />
              {(() => {
                const storageMissing = storageConditionCodes(form.storageCondition).length === 0 || invalid('storageCondition');
                return (
                  <>
                    <div className={cn('mt-1 flex flex-wrap items-center justify-center gap-3 rounded-xl p-2', storageMissing && storageConditionCodes(form.storageCondition).length === 0 ? 'ring-1 ring-red-500' : '')}>
                      {[
                        { id: 'AMBIENTE', label: 'Ambiente (18-27°C)' },
                        { id: 'REFRIGERACION', label: 'Refrigeración (2-8°C)' },
                        { id: 'CONGELACION', label: 'Congelación (-18°C)' },
                      ].map((item) => {
                        const checked = storageConditionCodes(form.storageCondition).includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={readOnly}
                            onClick={() => toggleStorage(item.id)}
                            className={cn(
                              'flex h-11 items-center gap-2 rounded-xl border px-3 text-xs sm:text-sm font-semibold select-none',
                              checked ? 'border-[#005F9E] bg-[#00AEEF]/10 text-[#005F9E]' : 'border-gray-200 bg-white text-gray-700',
                              !checked && storageConditionCodes(form.storageCondition).length === 0 && 'border-red-400',
                              readOnly ? 'opacity-70' : 'cursor-pointer',
                            )}
                          >
                            <Checkbox checked={checked} tabIndex={-1} className="h-5 w-5 pointer-events-none" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    {(storageConditionCodes(form.storageCondition).length === 0 || invalid('storageCondition')) && (
                      <p className="mt-1 text-xs font-semibold text-red-600">{reason('storageCondition') || 'No hay ninguna condición marcada. Elija ambiente, refrigeración, congelación o más de una.'}</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div data-intake-field="quoteNumber" className={requiredBox('quoteNumber', 'sm:col-span-2 pt-2 border-t border-gray-100')}>
            <IntakeLabel
              text="No. de proforma"
              help="Número de una proforma anterior del mismo cliente. Al salir del campo, o con Enter, se marcan sus ensayos si corresponden a este tipo de muestra."
            />
            <Input
              placeholder="COT-2026-0042"
              disabled={readOnly}
              value={form.quoteNumber}
              onChange={(e) => {
                typedQuote.current = e.target.value;
                quoteAssayIds.current = null;
                setQuoteHint('');
                setQuoteHintOk(false);
                onChange({ ...form, quoteNumber: e.target.value });
              }}
              onBlur={(e) => { void applyQuoteNumber(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void applyQuoteNumber((e.target as HTMLInputElement).value);
                }
              }}
              className="h-11 sm:h-10 text-sm font-mono"
            />
            {quoteBusy && <p className="mt-1 text-xs text-muted-foreground">Consultando la proforma...</p>}
            {!quoteBusy && quoteHint && (
              <p className={cn('mt-1 text-xs font-medium', quoteHintOk ? 'text-emerald-700' : 'text-red-600')}>{quoteHint}</p>
            )}
            {invalid('quoteNumber') && <p className="mt-1 text-xs font-semibold text-red-600">{reason('quoteNumber')}</p>}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          FASE 3: NOTIFICACIÓN SANITARIA, ESTABILIDAD O NUTRICIONAL
      ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center text-[#005F9E] shrink-0">
            <span className="font-bold text-xs">3</span>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
              ¿Esta muestra requiere trámite de Notificación Sanitaria ARCSA, Estudio de Estabilidad o Información Nutricional?
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Si su muestra es de rutina o no aplica, <strong>déjelo tal cual está (NO)</strong>.
            </p>
          </div>
        </div>

        {/* Interruptor de 2 opciones táctiles con círculo de selección */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange({ ...form, isSanitaryNotification: false })}
            className={cn(
              'p-3.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 cursor-pointer',
              !form.isSanitaryNotification
                ? 'border-[#005F9E] bg-[#00AEEF]/10 text-[#005F9E] ring-1 ring-[#005F9E]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                !form.isSanitaryNotification ? 'border-[#005F9E] bg-white' : 'border-gray-300 bg-white'
              )}
            >
              {!form.isSanitaryNotification && <div className="w-2.5 h-2.5 rounded-full bg-[#005F9E] animate-in zoom-in-75 duration-150" />}
            </div>
            <div>
              <span className="font-bold block text-sm">NO (Muestra de Rutina)</span>
              <span className="text-xs text-muted-foreground font-normal">Opción por defecto · No requiere datos adicionales</span>
            </div>
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange({ ...form, isSanitaryNotification: true })}
            className={cn(
              'p-3.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 cursor-pointer',
              form.isSanitaryNotification
                ? 'border-[#005F9E] bg-[#00AEEF]/10 text-[#005F9E] ring-1 ring-[#005F9E]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                form.isSanitaryNotification ? 'border-[#005F9E] bg-white' : 'border-gray-300 bg-white'
              )}
            >
              {form.isSanitaryNotification && <div className="w-2.5 h-2.5 rounded-full bg-[#005F9E] animate-in zoom-in-75 duration-150" />}
            </div>
            <div>
              <span className="font-bold block text-sm">SÍ (Trámite ARCSA / Nutricional)</span>
              <span className="text-xs text-muted-foreground font-normal">Despliega los 5 campos exigidos por la norma</span>
            </div>
          </button>
        </div>

        {/* Despliegue de los 5 campos oficiales en caso de SÍ (recuadros destacados con el color del despliegue) */}
        {form.isSanitaryNotification && (
          <div className="mt-4 p-4 rounded-2xl bg-[#00AEEF]/5 border-2 border-[#00AEEF]/40 space-y-3.5 animate-in fade-in duration-200">
            <div className="rounded-xl bg-white p-2.5 border border-[#00AEEF]/40 text-xs text-[#005F9E] font-medium leading-relaxed">
              📝 Complete solo los datos que apliquen a su producto; los vacíos se guardarán como N/A de forma automática.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <IntakeLabel
                  text="Material de empaque y/o envase"
                  help="Especificar el material primario en contacto con el producto (ej: PET, polietileno con tapa rosca). Para ARCSA debe adjuntar certificado de envase emitido por el proveedor."
                />
                <Input
                  placeholder="Polietileno de alta densidad / Botella PET con tapa rosca"
                  disabled={readOnly}
                  value={form.packagingMaterial}
                  onChange={(e) => onChange({ ...form, packagingMaterial: e.target.value })}
                  className="h-11 sm:h-10 text-sm bg-white border-2 border-[#00AEEF]/40 focus:border-[#005F9E] focus:ring-2 focus:ring-[#00AEEF]/20"
                />
              </div>

              <div>
                <IntakeLabel
                  text="Contenido en peso o volumen"
                  help="Contenido neto nominal declarado en la etiqueta del producto (l, ml, g, kg)."
                />
                <Input
                  placeholder="500 ml o 250 g"
                  disabled={readOnly}
                  value={form.contentAmount}
                  onChange={(e) => onChange({ ...form, contentAmount: e.target.value })}
                  className="h-11 sm:h-10 text-sm bg-white border-2 border-[#00AEEF]/40 focus:border-[#005F9E] focus:ring-2 focus:ring-[#00AEEF]/20"
                />
              </div>

              <div>
                <IntakeLabel
                  text="Porción de consumo"
                  help="Porción típica consumida por una persona (en gramos o mililitros), indispensable para el cálculo de la información nutricional."
                />
                <Input
                  placeholder="30 g o 200 ml"
                  disabled={readOnly}
                  value={form.servingSize}
                  onChange={(e) => onChange({ ...form, servingSize: e.target.value })}
                  className="h-11 sm:h-10 text-sm bg-white border-2 border-[#00AEEF]/40 focus:border-[#005F9E] focus:ring-2 focus:ring-[#00AEEF]/20"
                />
              </div>

              <div>
                <IntakeLabel
                  text="Dilución (para desinfectantes, detergentes, etc)"
                  help="Proporción recomendada de dilución para su uso. Solo aplica para productos concentrados o químicos."
                />
                <Input
                  placeholder="1:10 en agua limpia"
                  disabled={readOnly}
                  value={form.dilution}
                  onChange={(e) => onChange({ ...form, dilution: e.target.value })}
                  className="h-11 sm:h-10 text-sm bg-white border-2 border-[#00AEEF]/40 focus:border-[#005F9E] focus:ring-2 focus:ring-[#00AEEF]/20"
                />
              </div>

              <div>
                <IntakeLabel
                  text="Tiempo de vida útil"
                  help="Periodo estimado de conservación del producto bajo condiciones normales de almacenamiento."
                />
                <Input
                  placeholder="6 meses a temperatura ambiente"
                  disabled={readOnly}
                  value={form.shelfLife}
                  onChange={(e) => onChange({ ...form, shelfLife: e.target.value })}
                  className="h-11 sm:h-10 text-sm bg-white border-2 border-[#00AEEF]/40 focus:border-[#005F9E] focus:ring-2 focus:ring-[#00AEEF]/20"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
          FASE 4: PLAN DE ENSAYOS / ANÁLISIS A REALIZAR
      ──────────────────────────────────────────────────────────── */}
      <div data-intake-field="analysisTypeIds" className={cn('bg-white rounded-2xl border p-4 sm:p-5 shadow-sm', invalid('analysisTypeIds') ? 'border-2 border-red-500' : 'border-gray-200')}>
        <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center text-[#005F9E] shrink-0">
            <span className="font-bold text-xs">4</span>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
              ¿Desea aplicar los análisis habituales de la norma / proforma, o solicita exámenes diferentes o sin proforma?
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Si se mantienen los análisis normales o cotizados, <strong>déjelo tal cual está</strong>.
            </p>
          </div>
        </div>

        {/* Selector de modo de análisis con círculo de selección */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange({ ...form, hasCustomAnalyses: false })}
            className={cn(
              'p-3.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 cursor-pointer',
              !form.hasCustomAnalyses
                ? 'border-[#005F9E] bg-[#00AEEF]/10 text-[#005F9E] ring-1 ring-[#005F9E]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                !form.hasCustomAnalyses ? 'border-[#005F9E] bg-white' : 'border-gray-300 bg-white'
              )}
            >
              {!form.hasCustomAnalyses && <div className="w-2.5 h-2.5 rounded-full bg-[#005F9E] animate-in zoom-in-75 duration-150" />}
            </div>
            <div>
              <span className="font-bold block text-sm">Análisis de Norma / Proforma</span>
              <span className="text-xs text-muted-foreground font-normal">Opción por defecto · Según norma INEN o proforma previa vinculada</span>
            </div>
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange({ ...form, hasCustomAnalyses: true })}
            className={cn(
              'p-3.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 cursor-pointer',
              form.hasCustomAnalyses
                ? 'border-[#005F9E] bg-[#00AEEF]/10 text-[#005F9E] ring-1 ring-[#005F9E]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                form.hasCustomAnalyses ? 'border-[#005F9E] bg-white' : 'border-gray-300 bg-white'
              )}
            >
              {form.hasCustomAnalyses && <div className="w-2.5 h-2.5 rounded-full bg-[#005F9E] animate-in zoom-in-75 duration-150" />}
            </div>
            <div>
              <span className="font-bold block text-sm">Análisis Diferentes o Sin Proforma</span>
              <span className="text-xs text-muted-foreground font-normal">Activar si no tiene proforma o pide análisis diferentes/adicionales</span>
            </div>
          </button>
        </div>

        {/* Modo B: Análisis dinámicos desplegados (recuadros destacados con el color del despliegue) */}
        {form.hasCustomAnalyses ? (
          <div className="p-4 rounded-2xl bg-[#00AEEF]/5 border-2 border-[#00AEEF]/40 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs text-[#005F9E] font-medium bg-white p-2.5 rounded-xl border border-[#00AEEF]/40">
              <span>✍️ Ingrese los análisis que necesita (específicos, adicionales o diferentes a la proforma):</span>
            </div>

            <div className="space-y-2.5">
              {(form.customAnalyses ?? []).map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-white p-3.5 rounded-xl border-2 border-[#00AEEF]/30 shadow-xs"
                >
                  <div className="flex-1">
                    <IntakeLabel
                      text="Análisis a realizar"
                      help="Nombre del ensayo solicitado cuando no cuenta con proforma o requiere análisis específicos."
                    />
                    <Input
                      placeholder="Acidez titulable, Grasa, Recuento de mohos..."
                      disabled={readOnly}
                      value={item.analysis}
                      onChange={(e) => updateCustomAnalysis(index, 'analysis', e.target.value)}
                      className="h-10 text-sm bg-white border-2 border-[#00AEEF]/40 focus:border-[#005F9E] focus:ring-2 focus:ring-[#00AEEF]/20"
                    />
                  </div>

                  <div className="flex-1">
                    <IntakeLabel
                      text="Técnica analítica"
                      help="Método o norma técnica (AOAC, INEN). Si no la conoce, el personal técnico del laboratorio la asignará."
                    />
                    <Input
                      placeholder="AOAC 942.15 / NTE INEN 1528"
                      disabled={readOnly}
                      value={item.technique}
                      onChange={(e) => updateCustomAnalysis(index, 'technique', e.target.value)}
                      className="h-10 text-sm bg-white border-2 border-[#00AEEF]/40 focus:border-[#005F9E] focus:ring-2 focus:ring-[#00AEEF]/20"
                    />
                  </div>

                  {!readOnly && (form.customAnalyses ?? []).length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomAnalysis(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0 sm:mt-5 self-end sm:self-center shrink-0 cursor-pointer"
                      title="Eliminar este análisis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={addCustomAnalysis}
                className="w-full sm:w-auto h-11 text-xs sm:text-sm font-bold border-2 border-[#005F9E] text-[#005F9E] bg-white hover:bg-[#00AEEF]/10 flex items-center justify-center gap-2 rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#005F9E]" />
                <span>Agregar otro análisis</span>
              </Button>
            )}
            {invalid('analysisTypeIds') && <p className="text-xs text-red-600 font-semibold">{reason('analysisTypeIds')}</p>}
          </div>
        ) : (
          /* Modo A: Catálogo Normativo oficial */
          <div>
            <div className="mb-3 space-y-2">
              {spec ? (
                <div className="rounded-xl border border-[#00AEEF]/30 bg-[#00AEEF]/5 px-3.5 py-2.5 text-sm text-[#005F9E]">
                  Norma técnica aplicable: <span className="font-bold">{spec.norma}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{spec.label}</span>
                </div>
              ) : form.sampleTypeId ? (
                <p className="text-sm text-muted-foreground">Este tipo de muestra no tiene parámetros normativos cargados.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Seleccione el tipo de muestra en el Paso 1 para ver los parámetros de la norma aplicable.</p>
              )}
              {spec && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={readOnly || visible.length === 0} onClick={selectAll} className="h-9">
                    Seleccionar todo
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={readOnly || selectedVisible.length === 0} onClick={clearSelection} className="h-9">
                    Limpiar selección
                  </Button>
                </div>
              )}
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[8%] sm:w-[6%]" />
                  <col className="w-[30%] sm:w-[22%]" />
                  <col className="w-[14%] sm:w-[10%]" />
                  <col className="w-[14%] sm:w-[12%]" />
                  <col className="w-[20%] sm:w-[26%]" />
                  <col className="w-[14%] sm:w-[12%]" />
                  <col className="w-[14%] sm:w-[12%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-[#005F9E]">
                    <th className="bg-[#e7f6fc] p-2.5 font-semibold"></th>
                    <th className="bg-[#e7f6fc] p-2.5 font-semibold">Parámetro</th>
                    <th className="bg-[#e7f6fc] p-2.5 font-semibold">Área</th>
                    <th className="bg-[#e7f6fc] p-2.5 font-semibold">Unidad</th>
                    <th className="bg-[#e7f6fc] p-2.5 font-semibold">Método</th>
                    <th className="bg-[#e7f6fc] p-2.5 font-semibold">Rango</th>
                    <th className="bg-[#e7f6fc] p-2.5 text-right font-semibold">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-sm text-muted-foreground text-center">
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
                      <tr
                        key={item.id}
                        className={cn(
                          'transition-colors',
                          readOnly ? '' : 'cursor-pointer hover:bg-muted/50',
                          checked ? 'bg-[#00AEEF]/10' : ''
                        )}
                        onClick={() => toggleAnalysis(item.id)}
                      >
                        <td className="border-t p-2.5 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={checked} disabled={readOnly} onCheckedChange={() => toggleAnalysis(item.id)} />
                        </td>
                        <td className="border-t p-2.5 align-middle break-words font-semibold text-gray-900">{item.name ?? '—'}</td>
                        <td className="border-t p-2.5 align-middle break-words text-xs font-medium">
                          {item.area === 'FISICOQUIMICA' ? <span className="text-blue-700">FQ</span> : item.area === 'MICROBIOLOGIA' ? <span className="text-emerald-700">MICA</span> : '—'}
                        </td>
                        <td className="border-t p-2.5 align-middle break-words text-xs text-gray-600">{item.unit ?? '—'}</td>
                        <td className="border-t p-2.5 align-middle break-words text-xs leading-snug text-gray-600">{item.method ?? '—'}</td>
                        <td className="border-t p-2.5 align-middle break-words text-xs text-gray-600">{range}</td>
                        <td className="border-t p-2.5 align-middle break-words text-right text-xs font-semibold text-[#005F9E]">
                          {item.basePrice != null ? `$${Number(item.basePrice).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={cn('mt-2.5 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm', invalid('analysisTypeIds') ? 'border-2 border-red-500 bg-red-50' : 'bg-[#00AEEF]/5')}>
              <span className="text-muted-foreground font-medium">{selectedVisible.length} parámetro(s) seleccionado(s)</span>
              <span className="font-bold text-[#005F9E] text-base">Total ${selectionTotal.toFixed(2)}</span>
            </div>
            {invalid('analysisTypeIds') && <p className="text-xs text-red-600 mt-1 font-semibold">{reason('analysisTypeIds')}</p>}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
          FASE 5: OBSERVACIONES Y CONFIRMACIÓN
      ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <IntakeLabel
            text="Observaciones generales"
            help="Detalles sobre el estado del producto o instrucciones para el informe. Si se deja vacío, se guarda como N/A."
          />
          <Textarea
            placeholder="Observaciones sobre la muestra o instrucciones particulares..."
            disabled={readOnly}
            value={form.observations}
            onChange={(e) => onChange({ ...form, observations: e.target.value })}
            className="min-h-[90px] text-sm"
          />
        </div>

        {onSubmit && submitLabel && (
          <Button
            onClick={onSubmit}
            className="w-full h-12 text-base font-bold bg-[#00AEEF] hover:bg-[#005F9E] text-white shadow-md rounded-xl transition-all"
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
