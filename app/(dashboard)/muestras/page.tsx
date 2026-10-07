'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TestTubes, FileText, FlaskConical } from 'lucide-react';

export default function MuestrasPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (areaFilter) params.set('area', areaFilter);
      const res = await fetch(`/api/samples?${params.toString()}`);
      if (res.ok) { const d = await res.json(); setSamples(d?.samples ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, areaFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const columns: Column<any>[] = [
    { key: 'sampleCode', label: 'Código', render: (s: any) => <span className="font-mono text-xs font-bold">{s?.sampleCode ?? ''}</span> },
    { key: 'workOrder', label: 'OT', render: (s: any) => <span className="font-mono text-xs">{s?.workOrder?.orderNumber ?? '-'}</span> },
    { key: 'client', label: 'Cliente', render: (s: any) => s?.workOrder?.client?.name ?? '-' },
    { key: 'description', label: 'Descripción', render: (s: any) => s?.description ?? s?.sampleType?.name ?? '-' },
    { key: 'area', label: 'Área', render: (s: any) => s?.area === 'FISICOQUIMICA' ? 'FQ' : 'MICA' },
    { key: 'storageCondition', label: 'Almacenamiento', render: (s: any) => {
      const map: Record<string, string> = { REFRIGERACION: '\u2744\ufe0f 2-8°C', CONGELACION: '\u2744\ufe0f -18°C', AMBIENTE: '\ud83c\udf21\ufe0f 18-27°C' };
      return map[s?.storageCondition ?? ''] ?? '-';
    }},
    { key: 'analyst', label: 'Analista', render: (s: any) => s?.analyst?.name ?? '-' },
    { key: 'status', label: 'Estado', render: (s: any) => <StatusBadge status={s?.status ?? ''} /> },
    { key: 'receivedAt', label: 'Recepción', render: (s: any) => s?.receivedAt ? new Date(s.receivedAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
    { key: 'actions', label: 'Acciones', render: (s: any) => (
      <div className="flex items-center gap-1">
        {s?.status !== 'ANALIZADA' && s?.status !== 'DESCARTADA' && (
          <Button size="sm" variant="outline" className="h-8 text-[#00AEEF] border-[#00AEEF] px-2" onClick={(e: any) => { e.stopPropagation(); router.push('/resultados'); }}>
            <FlaskConical className="w-3 h-3 mr-1" /> Resultado
          </Button>
        )}
        {s?.workOrder?.id && (
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={(e: any) => { e.stopPropagation(); router.push(`/ordenes/${s.workOrder.id}`); }}>
            <FileText className="w-3 h-3 mr-1" /> Ver OT
          </Button>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Muestras" description="Gestión y seguimiento de muestras" icon={TestTubes} />
      <div className="flex gap-3 mb-4">
        <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="RECIBIDA">Recibida</SelectItem>
            <SelectItem value="EN_ANALISIS">En Análisis</SelectItem>
            <SelectItem value="ANALIZADA">Analizada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={(v: string) => setAreaFilter(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todas las áreas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="FISICOQUIMICA">Fisicoquímica</SelectItem>
            <SelectItem value="MICROBIOLOGIA">Microbiología</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={samples} loading={loading} emptyMessage="No hay muestras" />
    </div>
  );
}
