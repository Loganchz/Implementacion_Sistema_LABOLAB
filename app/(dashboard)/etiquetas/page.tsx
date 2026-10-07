'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tag, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

interface SampleForLabel {
  id: string;
  sampleCode: string;
  area: string;
  storageCondition: string;
  receivedAt: string;
  description: string | null;
  workOrder: { orderNumber: string } | null;
}

export default function EtiquetasPage() {
  const searchParams = useSearchParams();
  const [samples, setSamples] = useState<SampleForLabel[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState<'grande' | 'pequena'>('grande');
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const loadSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/samples?limit=100');
      if (res.ok) {
        const d = await res.json();
        const samplesList = d?.samples ?? [];
        setSamples(samplesList);

        // Auto-select if sampleId in URL
        const sampleId = searchParams?.get('sampleId');
        if (sampleId) setSelectedSamples([sampleId]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [searchParams]);

  useEffect(() => { loadSamples(); }, [loadSamples]);

  const toggleSample = (id: string) => {
    setSelectedSamples((prev: string[]) =>
      prev.includes(id) ? prev.filter((s: string) => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedSamples.length === samples.length) {
      setSelectedSamples([]);
    } else {
      setSelectedSamples(samples.map((s: SampleForLabel) => s.id));
    }
  };

  const handlePrint = () => {
    if (selectedSamples.length === 0) { toast.error('Seleccione al menos una muestra'); return; }
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Permita ventanas emergentes para imprimir'); return; }

    const isGrande = labelSize === 'grande';
    const w = isGrande ? '80mm' : '57mm';
    const h = isGrande ? '40mm' : '27mm';

    printWindow.document.write(`
      <!DOCTYPE html><html><head><style>
        @page { size: ${w} ${h}; margin: 0; }
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .label { width: ${w}; height: ${h}; box-sizing: border-box; padding: 2mm; page-break-after: always; position: relative; }
        .label:last-child { page-break-after: avoid; }
        .logo { font-size: ${isGrande ? '10px' : '7px'}; font-weight: bold; color: #005F9E; }
        .logo span { color: #00AEEF; }
        .sample-code { font-size: ${isGrande ? '14px' : '10px'}; font-weight: bold; margin: ${isGrande ? '2mm' : '1mm'} 0; }
        .field { font-size: ${isGrande ? '7px' : '5.5px'}; margin: 0.5mm 0; }
        .field-label { font-weight: bold; color: #005F9E; text-transform: uppercase; }
        .section { border: 0.3mm solid #00AEEF; border-radius: 1mm; padding: 1mm; margin: 0.5mm 0; }
        .section-title { font-size: ${isGrande ? '6px' : '5px'}; font-weight: bold; color: #005F9E; text-transform: uppercase; margin-bottom: 0.5mm; }
        .checkbox { display: inline-block; width: ${isGrande ? '2.5mm' : '2mm'}; height: ${isGrande ? '2.5mm' : '2mm'}; border: 0.3mm solid #333; margin-right: 1mm; vertical-align: middle; text-align: center; font-size: ${isGrande ? '5px' : '4px'}; line-height: ${isGrande ? '2.5mm' : '2mm'}; }
        .checkbox.checked { background: #00AEEF; color: white; }
        .option { font-size: ${isGrande ? '6px' : '5px'}; margin: 0.3mm 0; }
        .ref { position: absolute; bottom: 1mm; right: 2mm; font-size: 5px; color: #999; }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const selectedData = samples.filter((s: SampleForLabel) => selectedSamples.includes(s.id));

  return (
    <div>
      <PageHeader
        title="Etiquetas"
        description="Generación e impresión de etiquetas para muestras"
        icon={Tag}
        actions={
          <div className="flex items-center gap-3">
            <Select value={labelSize} onValueChange={(v: string) => setLabelSize(v as 'grande' | 'pequena')}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grande">Grande (8.0 x 4.0 cm)</SelectItem>
                <SelectItem value="pequena">Pequeña (5.7 x 2.7 cm)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePrint} className="bg-[#00AEEF] hover:bg-[#005F9E] text-white">
              <Printer className="w-4 h-4 mr-2" /> Imprimir ({selectedSamples.length})
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sample Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Seleccionar Muestras</h3>
            <Button size="sm" variant="outline" onClick={selectAll}>
              {selectedSamples.length === samples.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
            </Button>
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
            ) : samples.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay muestras disponibles</p>
            ) : (
              samples.map((s: SampleForLabel) => (
                <div
                  key={s.id}
                  onClick={() => toggleSample(s.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSamples.includes(s.id) ? 'bg-[#00AEEF]/10 border border-[#00AEEF]/30' : 'bg-white hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                    selectedSamples.includes(s.id) ? 'bg-[#00AEEF] border-[#00AEEF] text-white' : 'border-gray-300'
                  }`}>
                    {selectedSamples.includes(s.id) && '\u2713'}
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-sm font-bold">{s.sampleCode}</p>
                    <p className="text-xs text-muted-foreground">{s.description ?? '-'} | OT: {s.workOrder?.orderNumber ?? '-'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{s.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA'}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview */}
        <div>
          <h3 className="font-semibold text-sm mb-3">Vista Previa</h3>
          <div className="space-y-4">
            {selectedData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 bg-white rounded-xl">Seleccione muestras para ver la vista previa</p>
            ) : (
              selectedData.map((s: SampleForLabel) => (
                <LabelPreview key={s.id} sample={s} size={labelSize} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Hidden print content */}
      <div ref={printRef} style={{ display: 'none' }}>
        {selectedData.map((s: SampleForLabel) => (
          <LabelPrintContent key={s.id} sample={s} size={labelSize} />
        ))}
      </div>
    </div>
  );
}

function LabelPreview({ sample, size }: { sample: SampleForLabel; size: 'grande' | 'pequena' }) {
  const isGrande = size === 'grande';
  const date = sample?.receivedAt ? new Date(sample.receivedAt) : new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  if (!isGrande) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-3" style={{ width: '228px', height: '108px' }}>
        <div className="flex justify-between items-start">
          <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#005F9E' }}>LAB<span style={{ color: '#00AEEF' }}>O</span>LAB</span>
        </div>
        <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0' }}>N° {sample?.sampleCode ?? ''}</p>
        <p style={{ fontSize: '7px', color: '#666' }}>{dd}/{mm}/{yyyy} | {sample?.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA'}</p>
        <p style={{ fontSize: '7px', color: '#666' }}>
          {sample?.storageCondition === 'REFRIGERACION' ? '\u2744\ufe0f Refrig.' : sample?.storageCondition === 'CONGELACION' ? '\u2744\ufe0f Congel.' : '\ud83c\udf21\ufe0f Amb.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4" style={{ width: '320px', height: '160px' }}>
      <div className="flex justify-between items-start mb-1">
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#005F9E' }}>LAB<span style={{ color: '#00AEEF' }}>O</span>LAB</span>
        <span style={{ fontSize: '6px', color: '#999' }}>Análisis de Alimentos, Aguas y Afines</span>
      </div>
      <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '3px 0' }}>N° MUESTRA: <span style={{ fontSize: '14px' }}>{sample?.sampleCode ?? ''}</span></p>
      <p style={{ fontSize: '8px', color: '#333' }}>FECHA DE INGRESO: {dd} / {mm} / {yyyy}</p>

      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        <div style={{ flex: 1, border: '1px solid #00AEEF', borderRadius: '3px', padding: '3px', fontSize: '7px' }}>
          <div style={{ fontWeight: 'bold', color: '#005F9E', fontSize: '6px', marginBottom: '2px' }}>\u2192 ÁREA CORRESPONDIENTE</div>
          <div>{'\u2610'} Fisicoquímica {sample?.area === 'FISICOQUIMICA' ? '\u2713' : ''}</div>
          <div>{'\u2610'} Microbiología {sample?.area === 'MICROBIOLOGIA' ? '\u2713' : ''}</div>
        </div>
        <div style={{ flex: 1, border: '1px solid #00AEEF', borderRadius: '3px', padding: '3px', fontSize: '7px' }}>
          <div style={{ fontWeight: 'bold', color: '#005F9E', fontSize: '6px', marginBottom: '2px' }}>\ud83c\udf21 CONDICIONES ALMACENAMIENTO</div>
          <div>{'\u2610'} Refrigeración (2-8°C) {sample?.storageCondition === 'REFRIGERACION' ? '\u2713' : ''}</div>
          <div>{'\u2610'} Congelación (-18°C) {sample?.storageCondition === 'CONGELACION' ? '\u2713' : ''}</div>
          <div>{'\u2610'} Ambiente (18-27°C) {sample?.storageCondition === 'AMBIENTE' ? '\u2713' : ''}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '4px', right: '8px', fontSize: '5px', color: '#999' }}>{sample?.workOrder?.orderNumber ?? ''}</div>
    </div>
  );
}

function LabelPrintContent({ sample, size }: { sample: SampleForLabel; size: 'grande' | 'pequena' }) {
  const isGrande = size === 'grande';
  const date = sample?.receivedAt ? new Date(sample.receivedAt) : new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  if (!isGrande) {
    return (
      <div className="label">
        <div style={{ fontWeight: 'bold', color: '#005F9E', fontSize: '7px' }}>LAB<span style={{ color: '#00AEEF' }}>O</span>LAB</div>
        <div style={{ fontSize: '12px', fontWeight: 'bold', margin: '1mm 0' }}>N° {sample?.sampleCode ?? ''}</div>
        <div style={{ fontSize: '6px' }}>{dd}/{mm}/{yyyy} | {sample?.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA'}</div>
        <div style={{ fontSize: '6px' }}>
          {sample?.storageCondition === 'REFRIGERACION' ? 'Refrig. 2-8°C' : sample?.storageCondition === 'CONGELACION' ? 'Congel. -18°C' : 'Amb. 18-27°C'}
        </div>
      </div>
    );
  }

  return (
    <div className="label">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 'bold', color: '#005F9E', fontSize: '10px' }}>LAB<span style={{ color: '#00AEEF' }}>O</span>LAB</div>
        <div style={{ fontSize: '5px', color: '#999' }}>Análisis de Alimentos, Aguas y Afines</div>
      </div>
      <div className="sample-code">N° MUESTRA: {sample?.sampleCode ?? ''}</div>
      <div className="field">FECHA DE INGRESO: {dd} / {mm} / {yyyy}</div>
      <div style={{ display: 'flex', gap: '2mm', marginTop: '1mm' }}>
        <div className="section" style={{ flex: 1 }}>
          <div className="section-title">ÁREA CORRESPONDIENTE</div>
          <div className="option"><span className={`checkbox ${sample?.area === 'FISICOQUIMICA' ? 'checked' : ''}`}>{sample?.area === 'FISICOQUIMICA' ? '\u2713' : ''}</span> Fisicoquímica</div>
          <div className="option"><span className={`checkbox ${sample?.area === 'MICROBIOLOGIA' ? 'checked' : ''}`}>{sample?.area === 'MICROBIOLOGIA' ? '\u2713' : ''}</span> Microbiología</div>
        </div>
        <div className="section" style={{ flex: 1 }}>
          <div className="section-title">CONDICIONES ALMACENAMIENTO</div>
          <div className="option"><span className={`checkbox ${sample?.storageCondition === 'REFRIGERACION' ? 'checked' : ''}`}>{sample?.storageCondition === 'REFRIGERACION' ? '\u2713' : ''}</span> Refrigeración (2-8°C)</div>
          <div className="option"><span className={`checkbox ${sample?.storageCondition === 'CONGELACION' ? 'checked' : ''}`}>{sample?.storageCondition === 'CONGELACION' ? '\u2713' : ''}</span> Congelación (-18°C)</div>
          <div className="option"><span className={`checkbox ${sample?.storageCondition === 'AMBIENTE' ? 'checked' : ''}`}>{sample?.storageCondition === 'AMBIENTE' ? '\u2713' : ''}</span> Ambiente (18-27°C)</div>
        </div>
      </div>
      <div className="ref">{sample?.workOrder?.orderNumber ?? ''}</div>
    </div>
  );
}
