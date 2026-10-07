'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { ClipboardList } from 'lucide-react';

export default function OrdenesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/work-orders');
      if (res.ok) { const d = await res.json(); setOrders(d?.orders ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const columns: Column<any>[] = [
    { key: 'orderNumber', label: 'N° OT', render: (o: any) => <span className="font-mono text-xs font-bold">{o?.orderNumber ?? ''}</span> },
    { key: 'client', label: 'Cliente', render: (o: any) => o?.client?.name ?? '-' },
    { key: 'quote', label: 'Cotización', render: (o: any) => <span className="font-mono text-xs">{o?.quote?.quoteNumber ?? '-'}</span> },
    { key: 'samples', label: 'Muestras', render: (o: any) => o?._count?.samples ?? 0 },
    { key: 'status', label: 'Estado', render: (o: any) => <StatusBadge status={o?.status ?? ''} /> },
    { key: 'estimatedDelivery', label: 'Entrega Est.', render: (o: any) => o?.estimatedDelivery ? new Date(o.estimatedDelivery).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
    { key: 'createdAt', label: 'Creada', render: (o: any) => o?.createdAt ? new Date(o.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
  ];

  return (
    <div>
      <PageHeader title="Órdenes de Trabajo" description="Seguimiento de órdenes activas" icon={ClipboardList} />
      <DataTable columns={columns} data={orders} loading={loading} emptyMessage="No hay órdenes de trabajo" onRowClick={(o: any) => router.push(`/ordenes/${o?.id}`)} />
    </div>
  );
}
