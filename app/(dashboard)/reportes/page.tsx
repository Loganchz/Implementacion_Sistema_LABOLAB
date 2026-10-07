'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { FileBarChart, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportesPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) { const d = await res.json(); setReports(d?.reports ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const generatePdf = async (reportId: string) => {
    setGenerating(reportId);
    try {
      const createRes = await fetch(`/api/reports/${reportId}/pdf`, { method: 'POST' });
      if (!createRes.ok) { toast.error('Error al iniciar generación de PDF'); return; }
      const { request_id } = await createRes.json();

      // Poll for status
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
          a.download = `reporte_${reportId}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('PDF generado exitosamente');
          loadData();
        } else if (result?.status === 'FAILED') {
          toast.error('Error al generar PDF');
        } else if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
          return;
        } else {
          toast.error('Tiempo de espera agotado');
        }
        setGenerating(null);
      };
      await poll();
    } catch {
      toast.error('Error');
      setGenerating(null);
    }
  };

  const columns: Column<any>[] = [
    { key: 'reportNumber', label: 'N° Reporte', render: (r: any) => <span className="font-mono text-xs font-bold">{r?.reportNumber ?? ''}</span> },
    { key: 'workOrder', label: 'OT', render: (r: any) => <span className="font-mono text-xs">{r?.workOrder?.orderNumber ?? '-'}</span> },
    { key: 'client', label: 'Cliente', render: (r: any) => r?.workOrder?.client?.name ?? '-' },
    { key: 'status', label: 'Estado', render: (r: any) => <StatusBadge status={r?.status ?? ''} /> },
    { key: 'createdAt', label: 'Creado', render: (r: any) => r?.createdAt ? new Date(r.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
    { key: 'actions', label: 'Acciones', render: (r: any) => (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={(e: any) => { e.stopPropagation(); router.push(`/reportes/${r.id}`); }}>
          <FileBarChart className="w-3 h-3 mr-1" /> Abrir
        </Button>
        <Button size="sm" variant="outline" onClick={(e: any) => { e.stopPropagation(); generatePdf(r.id); }} disabled={generating === r.id}>
          {generating === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
          {generating === r.id ? 'Generando...' : 'PDF'}
        </Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Reportes" description="Informes de resultados" icon={FileBarChart} />
      <DataTable columns={columns} data={reports} loading={loading} emptyMessage="No hay reportes" onRowClick={(r: any) => router.push(`/reportes/${r.id}`)} />
    </div>
  );
}
