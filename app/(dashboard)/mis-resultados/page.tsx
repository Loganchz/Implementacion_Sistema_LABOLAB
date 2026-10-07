'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { FileCheck, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function MisResultadosPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/me/reports');
      if (res.ok) { const d = await res.json(); setReports(d?.reports ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const downloadPdf = async (report: any) => {
    setDownloading(report.id);
    try {
      const createRes = await fetch(`/api/reports/${report.id}/pdf`, { method: 'POST' });
      if (!createRes.ok) { toast.error('No se pudo iniciar la descarga'); setDownloading(null); return; }
      const { request_id } = await createRes.json();
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
          a.download = `${report?.reportNumber ?? 'reporte'}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Informe descargado');
          setDownloading(null);
        } else if (result?.status === 'FAILED') {
          toast.error('Error al generar el informe'); setDownloading(null);
        } else if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          toast.error('Tiempo de espera agotado'); setDownloading(null);
        }
      };
      await poll();
    } catch { toast.error('Error al descargar el informe'); setDownloading(null); }
  };

  const columns: Column<any>[] = [
    { key: 'reportNumber', label: 'N° Informe', render: (r: any) => <span className="font-mono text-xs">{r?.reportNumber ?? ''}</span> },
    { key: 'orderNumber', label: 'Orden', render: (r: any) => <span className="font-mono text-xs">{r?.workOrder?.orderNumber ?? '-'}</span> },
    { key: 'samples', label: 'Muestras', render: (r: any) => (r?.workOrder?._count?.samples ?? 0) },
    { key: 'status', label: 'Estado', render: (r: any) => <StatusBadge status={r?.status ?? ''} /> },
    { key: 'emittedAt', label: 'Emitido', render: (r: any) => r?.emittedAt ? new Date(r.emittedAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
    {
      key: 'actions', label: 'Acciones', render: (r: any) => (
        <Button size="sm" className="bg-[#00AEEF] hover:bg-[#005F9E] text-white h-8" disabled={downloading === r.id} onClick={() => downloadPdf(r)}>
          <Download className="w-3 h-3 mr-1" /> {downloading === r.id ? 'Generando...' : 'Descargar PDF'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Mis Resultados" description="Informes de análisis emitidos por el laboratorio" icon={FileCheck} />
      <DataTable columns={columns} data={reports} loading={loading} emptyMessage="Aún no hay informes disponibles. Podrá descargarlos aquí cuando el laboratorio los emita." />
    </div>
  );
}
