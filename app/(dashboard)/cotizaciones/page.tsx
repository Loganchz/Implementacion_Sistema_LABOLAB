'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Calculator, CheckCircle, XCircle, Send, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function CotizacionesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes');
      if (res.ok) { const d = await res.json(); setQuotes(d?.quotes ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (res.ok) {
        toast.success(`Cotización ${status === 'ACEPTADA' ? 'aceptada' : status === 'ENVIADA' ? 'enviada' : 'rechazada'}`);
        loadData();
      }
    } catch { toast.error('Error'); }
  };

  const downloadPdf = async (quote: any) => {
    const quoteId = quote?.id;
    try {
      toast.info('Generando proforma PDF...');
      const res = await fetch(`/api/quotes/${quoteId}/pdf`, { method: 'POST' });
      if (!res.ok) { toast.error('Error al generar PDF'); return; }
      const { request_id } = await res.json();
      // Poll for PDF
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch('/api/generate-pdf/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id }) });
        if (!statusRes.ok) continue;
        const data = await statusRes.json();
        if (data?.status === 'SUCCESS' && data?.pdf_base64) {
          const byteChars = atob(data.pdf_base64);
          const byteArr = new Uint8Array(byteChars.length);
          for (let j = 0; j < byteChars.length; j++) byteArr[j] = byteChars.charCodeAt(j);
          const blob = new Blob([byteArr], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `${quote?.quoteNumber ?? 'Proforma'}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
          toast.success('Proforma descargada');
          return;
        } else if (data?.status === 'FAILED') { toast.error('Error al generar PDF'); return; }
      }
      toast.error('Tiempo de espera agotado');
    } catch { toast.error('Error al descargar PDF'); }
  };

  const columns: Column<any>[] = [
    { key: 'quoteNumber', label: 'N°', render: (q: any) => <span className="font-mono text-xs">{q?.quoteNumber ?? ''}</span> },
    { key: 'client', label: 'Cliente', render: (q: any) => q?.client?.name ?? '-' },
    { key: 'request', label: 'Solicitud', render: (q: any) => <span className="font-mono text-xs">{q?.request?.requestNumber ?? '-'}</span> },
    { key: 'items', label: 'Ítems', render: (q: any) => q?.items?.length ?? 0 },
    { key: 'total', label: 'Total', render: (q: any) => `$${(q?.total ?? 0).toFixed(2)}` },
    { key: 'status', label: 'Estado', render: (q: any) => <StatusBadge status={q?.status ?? ''} /> },
    { key: 'createdAt', label: 'Fecha', render: (q: any) => q?.createdAt ? new Date(q.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
    {
      key: 'actions', label: 'Acciones', render: (q: any) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" title="Descargar PDF" onClick={(e: any) => { e.stopPropagation(); downloadPdf(q); }}><Download className="w-3 h-3" /></Button>
          {q?.status === 'BORRADOR' && <Button size="sm" variant="outline" onClick={(e: any) => { e.stopPropagation(); updateStatus(q.id, 'ENVIADA'); }}><Send className="w-3 h-3" /></Button>}
          {q?.status === 'ENVIADA' && (
            <>
              <Button size="sm" variant="outline" className="text-green-600" onClick={(e: any) => { e.stopPropagation(); updateStatus(q.id, 'ACEPTADA'); }}><CheckCircle className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={(e: any) => { e.stopPropagation(); updateStatus(q.id, 'RECHAZADA'); }}><XCircle className="w-3 h-3" /></Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Cotizaciones" description="Gestión de cotizaciones" icon={Calculator} />
      <DataTable columns={columns} data={quotes} loading={loading} emptyMessage="No hay cotizaciones" />
    </div>
  );
}
