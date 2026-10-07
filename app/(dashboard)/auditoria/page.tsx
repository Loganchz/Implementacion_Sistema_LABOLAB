'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [userFilter, setUserFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.set('entity', entityFilter);
      if (userFilter) params.set('userId', userFilter);
      const [logRes, usrRes] = await Promise.all([
        fetch(`/api/audit?${params.toString()}`),
        fetch('/api/users'),
      ]);
      if (logRes.ok) { const d = await logRes.json(); setLogs(d?.logs ?? []); }
      if (usrRes.ok) { const d = await usrRes.json(); setUsers(d ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [entityFilter, userFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const columns: Column<any>[] = [
    { key: 'createdAt', label: 'Fecha/Hora', render: (l: any) => l?.createdAt ? new Date(l.createdAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }) : '-', className: 'font-mono text-xs' },
    { key: 'user', label: 'Usuario', render: (l: any) => l?.user?.name ?? '-' },
    { key: 'action', label: 'Acción', render: (l: any) => <span className="font-mono text-xs">{l?.action ?? ''}</span> },
    { key: 'entity', label: 'Entidad', render: (l: any) => <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{l?.entity ?? ''}</span> },
    { key: 'details', label: 'Detalle', render: (l: any) => <span className="text-xs">{l?.details ?? '-'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Auditoría" description="Registro de actividad del sistema" icon={Shield} />
      <div className="flex gap-3 mb-4">
        <Select value={entityFilter} onValueChange={(v: string) => setEntityFilter(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todas las entidades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="REQUEST">Solicitudes</SelectItem>
            <SelectItem value="QUOTE">Cotizaciones</SelectItem>
            <SelectItem value="WORK_ORDER">Órdenes</SelectItem>
            <SelectItem value="SAMPLE">Muestras</SelectItem>
            <SelectItem value="RESULT">Resultados</SelectItem>
            <SelectItem value="REPORT">Reportes</SelectItem>
            <SelectItem value="CLIENT">Clientes</SelectItem>
            <SelectItem value="USER">Usuarios</SelectItem>
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={(v: string) => setUserFilter(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todos los usuarios" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            {(users ?? []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={logs} loading={loading} emptyMessage="No hay registros de auditoría" />
    </div>
  );
}
