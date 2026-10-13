'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Calculator, Eye, Pencil, Trash2, ClipboardList, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { buildQuoteLines, QuotePresentationMode } from '@/lib/quote-build';
import { deletionBlockReason } from '@/lib/sample-deletion';
import { IntakeForm, IntakeValues, emptyIntake, productKeyForSampleType, PRODUCT_ANALYSIS_MAP } from '@/components/intake-form';
import { checkIntake } from '@/lib/intake-rules';

export default function SolicitudesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [analysisTypes, setAnalysisTypes] = useState<any[]>([]);
  const [sampleTypes, setSampleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<IntakeValues>(emptyIntake());
  const [createIssues, setCreateIssues] = useState<string[]>([]);
  const [editIssues, setEditIssues] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewing, setViewing] = useState<any | null>(null);
  const [sheetEditing, setSheetEditing] = useState(false);
  const [sheetForm, setSheetForm] = useState<IntakeValues>(emptyIntake());
  const [savingEdit, setSavingEdit] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [presentation, setPresentation] = useState<QuotePresentationMode>('DETALLADA');
  const [quotingGroup, setQuotingGroup] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, cliRes, atRes, stRes] = await Promise.all([
        fetch('/api/requests?limit=200'),
        fetch('/api/clients?limit=100'),
        fetch('/api/analysis-types?active=true'),
        fetch('/api/sample-types'),
      ]);
      if (reqRes.ok) { const d = await reqRes.json(); setRequests(d?.requests ?? []); }
      if (cliRes.ok) { const d = await cliRes.json(); setClients(d?.clients ?? []); }
      if (atRes.ok) { const d = await atRes.json(); setAnalysisTypes(d ?? []); }
      if (stRes.ok) { const d = await stRes.json(); setSampleTypes(d ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    const check = checkIntake(form);
    setCreateIssues(check.fields);
    if (!check.ok) { toast.error(check.messages[0]); return; }
    try {
      const res = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, sampleCount: check.sampleCount }) });
      if (res.ok) {
        toast.success('Solicitud creada');
        setDialogOpen(false);
        setForm(emptyIntake());
        setCreateIssues([]);
        loadData();
      } else { const err = await res.json(); toast.error(err?.error ?? 'Error'); }
    } catch { toast.error('Error'); }
  };

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => requests.some((row) => row.id === id)));
  }, [requests]);

  const [generating, setGenerating] = useState<string | null>(null);

  const generateQuote = async (requestId: string) => {
    setGenerating(requestId);
    try {
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) });
      if (res.ok) {
        toast.success('Cotización generada. Redirigiendo a Cotizaciones...');
        setTimeout(() => router.push('/cotizaciones'), 800);
      } else { const err = await res.json(); toast.error(err?.error ?? 'Error al generar cotización'); }
    } catch { toast.error('Error al generar cotización'); }
    finally { setGenerating(null); }
  };

  const toDateInput = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(date);
  };

  const sampleTitle = (row: any) => row?.productName || row?.description || row?.sampleType?.name || 'Muestra';
  const isQuotable = (row: any) => (row?.status === 'BORRADOR' || row?.status === 'ENVIADA') && !row?.quote && !(row?.quoteLinks?.length);
  const selectedRows = requests.filter((row) => selectedIds.includes(row.id));
  const sameClient = new Set(selectedRows.map((row) => row.clientId)).size <= 1;
  const showGroupQuote = selectedRows.length >= 2 && sameClient && selectedRows.every(isQuotable);
  const quoteLines = buildQuoteLines(selectedRows, presentation);
  const quoteSubtotal = quoteLines.reduce((sum, line) => sum + line.totalPrice, 0);
  const quoteTax = quoteSubtotal * 0.15;
  const quoteTotal = quoteSubtotal + quoteTax;
  const deletePlan = selectedRows.map((row) => ({ row, reason: deletionBlockReason(row) }));
  const deletableRows = deletePlan.filter((item) => !item.reason);
  const blockedRows = deletePlan.filter((item) => item.reason);
  const allVisibleSelected = requests.length > 0 && requests.every((row) => selectedIds.includes(row.id));

  const intakeFromRow = (row: any): IntakeValues => ({
    clientId: row?.clientId ?? '',
    sampleTypeId: row?.sampleTypeId ?? '',
    description: row?.description ?? '',
    observations: row?.observations ?? '',
    urgent: !!row?.urgent,
    analysisTypeIds: (row?.items ?? []).map((item: any) => item.analysisTypeId).filter(Boolean),
    productName: row?.productName ?? '',
    brand: row?.brand ?? '',
    lot: row?.lot ?? '',
    elaborationDate: toDateInput(row?.elaborationDate),
    expirationDate: toDateInput(row?.expirationDate),
    samplingDate: toDateInput(row?.samplingDate),
    receptionDate: toDateInput(row?.receptionDate),
    packaging: row?.packaging ?? '',
    contentAmount: row?.contentAmount ?? '',
    location: row?.location ?? '',
    sampleCount: row?.sampleCount != null ? String(row.sampleCount) : '',
    storageCondition: row?.storageCondition ?? '',
    samplingBy: row?.samplingBy ?? '',
    responsibleName: row?.responsibleName ?? '',
    invoiceEmail: row?.invoiceEmail ?? '',
    reportEmail: row?.reportEmail ?? '',
  });

  const openSheet = (row: any) => {
    const next = intakeFromRow(row);
    setViewing(row);
    setSheetForm(next);
    setSheetEditing(false);
    setEditIssues([]);
  };

  const closeSheet = () => {
    setViewing(null);
    setSheetEditing(false);
    setEditIssues([]);
  };

  const canEditSheet = viewing?.status === 'BORRADOR';

  const beginEdit = () => {
    if (!viewing || viewing.status !== 'BORRADOR') return;
    setSheetForm(intakeFromRow(viewing));
    setSheetEditing(true);
  };

  const cancelEdit = () => {
    if (viewing) {
      setSheetForm(intakeFromRow(viewing));
    }
    setSheetEditing(false);
    setEditIssues([]);
  };

  const saveEdit = async () => {
    if (!viewing?.id || viewing.status !== 'BORRADOR') return;
    const check = checkIntake(sheetForm);
    setEditIssues(check.fields);
    if (!check.ok) { toast.error(check.messages[0]); return; }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/requests/${viewing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sheetForm, sampleCount: check.sampleCount }),
      });
      if (res.ok) {
        const updated = await res.json();
        toast.success('Muestra actualizada');
        setViewing(updated);
        setSheetForm(intakeFromRow(updated));
        setEditIssues([]);
        setSheetEditing(false);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err?.error ?? 'No se pudo guardar');
      }
    } catch { toast.error('No se pudo guardar'); }
    finally { setSavingEdit(false); }
  };

  const submitGroupQuote = async () => {
    if (!showGroupQuote) return;
    setQuotingGroup(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestIds: selectedRows.map((row) => row.id),
          presentation,
          taxRate: 15,
        }),
      });
      if (res.ok) {
        toast.success('Proforma grupal generada. Redirigiendo a Cotizaciones...');
        setQuoteOpen(false);
        setSelectedIds([]);
        setTimeout(() => router.push('/cotizaciones'), 800);
      } else {
        const err = await res.json();
        toast.error(err?.error ?? 'Error al generar la proforma');
      }
    } catch { toast.error('Error al generar la proforma'); }
    finally { setQuotingGroup(false); }
  };

  const confirmDelete = async () => {
    if (!deletableRows.length) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/requests/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRows.map((row) => row.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'No se pudo eliminar');
        return;
      }
      const removed = data?.deleted?.length ?? 0;
      const held = data?.blocked?.length ?? 0;
      if (removed) toast.success(`${removed} muestra(s) eliminada(s)`);
      if (held) toast.warning(`${held} muestra(s) no se eliminaron por la regla de trazabilidad`);
      setDeleteOpen(false);
      setSelectedIds([]);
      loadData();
    } catch { toast.error('No se pudo eliminar'); }
    finally { setDeleting(false); }
  };

  const columns: Column<any>[] = [
    {
      key: 'select',
      label: (
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={(checked) => setSelectedIds(checked ? requests.map((row) => row.id) : [])}
          aria-label="Seleccionar todas las muestras visibles"
        />
      ),
      className: 'w-10 px-2',
      render: (row: any) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(row.id)}
            onCheckedChange={(checked) => setSelectedIds((prev) => checked ? [...new Set([...prev, row.id])] : prev.filter((id) => id !== row.id))}
            aria-label={`Seleccionar ${row.requestNumber}`}
          />
        </div>
      ),
    },
    { key: 'requestNumber', label: 'N°', className: 'w-[8.5rem] whitespace-nowrap', render: (r: any) => <span className="font-mono text-[13px]">{r?.requestNumber ?? ''}</span> },
    { key: 'client', label: 'Cliente', className: 'whitespace-normal', render: (r: any) => r?.client?.name ?? '-' },
    { key: 'sampleType', label: 'Tipo', className: 'w-36 whitespace-normal', render: (r: any) => r?.sampleType?.name ?? '-' },
    { key: 'items', label: 'Análisis', className: 'w-16 text-center', render: (r: any) => {
      const items = r?.items ?? [];
      const key = productKeyForSampleType(r?.sampleType?.name);
      const codes = key ? PRODUCT_ANALYSIS_MAP[key]?.codes : null;
      if (!codes) return items.length;
      return items.filter((item: any) => codes.includes(item?.analysisType?.code)).length;
    } },
    { key: 'status', label: 'Estado', className: 'w-32', render: (r: any) => <StatusBadge status={r?.status ?? ''} /> },
    { key: 'createdAt', label: 'Fecha', className: 'w-24 whitespace-nowrap', render: (r: any) => r?.createdAt ? new Date(r.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '-' },
    {
      key: 'actions', label: 'Acciones', className: 'w-40', render: (r: any) => (
        <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
          {isQuotable(r) && (
            <Button size="xs" className="bg-[#00AEEF] hover:bg-[#005F9E] text-white" disabled={generating === r.id} onClick={(e: any) => { e.stopPropagation(); generateQuote(r.id); }}>
              <Calculator className="w-3 h-3 mr-1" /> {generating === r.id ? '...' : 'Cotizar'}
            </Button>
          )}
          {r?.status && !['BORRADOR', 'ENVIADA', 'CANCELADA'].includes(r.status) && (
            <Button size="xs" variant="outline" onClick={(e: any) => { e.stopPropagation(); router.push('/cotizaciones'); }}>
              <Eye className="w-3 h-3 mr-1" /> Ver
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Ingreso de Muestras"
        description="Registro de solicitudes y datos del producto"
        icon={FileText}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {showGroupQuote && (
              <Button variant="outline" className="border-[#00AEEF] text-[#005F9E]" onClick={() => { setPresentation('DETALLADA'); setQuoteOpen(true); }}>
                <ClipboardList className="w-4 h-4 mr-2" /> Cotizar Selección ({selectedRows.length})
              </Button>
            )}
            {selectedRows.length >= 2 && !showGroupQuote && (
              <span className="text-xs text-amber-700 max-w-[220px] leading-tight">
                {sameClient ? 'Solo muestras nuevas, sin proforma, del mismo cliente' : 'Seleccione muestras del mismo cliente'}
              </span>
            )}
            {selectedRows.length >= 1 && (
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar ({selectedRows.length})
              </Button>
            )}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setCreateIssues([]); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white"><Plus className="w-4 h-4 mr-2" /> Nuevo Ingreso</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nuevo Ingreso de Muestra</DialogTitle></DialogHeader>
              <IntakeForm
                form={form}
                onChange={setForm}
                clients={clients}
                sampleTypes={sampleTypes}
                analysisTypes={analysisTypes}
                issues={createIssues}
                onSubmit={handleCreate}
                submitLabel="Registrar Ingreso"
              />
            </DialogContent>
          </Dialog>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        emptyMessage="No hay solicitudes"
        compact
        onRowClick={openSheet}
      />

      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.requestNumber ?? "Muestra"}</DialogTitle>
            <DialogDescription>
              {sheetEditing
                ? "Corrija los datos y guarde. El formulario ya trae la información de esta muestra."
                : canEditSheet
                  ? "Previsualización del ingreso. Pulse Editar para modificar los campos."
                  : "Esta solicitud ya no está en borrador. Se puede consultar, no modificar."}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <IntakeForm
              form={sheetForm}
              onChange={setSheetForm}
              clients={clients}
              sampleTypes={sampleTypes}
              analysisTypes={analysisTypes}
              issues={sheetEditing ? editIssues : []}
              readOnly={!sheetEditing}
            />
          )}
          <DialogFooter>
            {sheetEditing ? (
              <>
                <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
                <Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white" disabled={savingEdit} onClick={saveEdit}>{savingEdit ? "Guardando..." : "Guardar"}</Button>
              </>
            ) : canEditSheet ? (
              <Button variant="outline" onClick={beginEdit}>
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cotización grupal</DialogTitle>
            <DialogDescription>
              {selectedRows[0]?.client?.name ?? 'Cliente'} · {selectedRows.length} muestras
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={`rounded-lg border p-3 text-left text-sm ${presentation === 'DETALLADA' ? 'border-[#00AEEF] bg-[#00AEEF]/5' : ''}`} onClick={() => setPresentation('DETALLADA')}>
                <span className="font-medium text-[#005F9E]">Detallada por muestra</span>
                <p className="text-xs text-muted-foreground mt-1">La proforma lista cada producto con sus ensayos.</p>
              </button>
              <button type="button" className={`rounded-lg border p-3 text-left text-sm ${presentation === 'CONSOLIDADA' ? 'border-[#00AEEF] bg-[#00AEEF]/5' : ''}`} onClick={() => setPresentation('CONSOLIDADA')}>
                <span className="font-medium text-[#005F9E]">Paquete consolidado</span>
                <p className="text-xs text-muted-foreground mt-1">Los ensayos iguales se agrupan y se suma la cantidad.</p>
              </button>
            </div>

            {presentation === 'DETALLADA' ? selectedRows.map((row) => (
              <div key={row.id} className="border rounded-lg overflow-hidden">
                <div className="bg-[#00AEEF]/10 px-3 py-2 text-sm font-medium text-[#005F9E]">
                  {row.requestNumber} · {sampleTitle(row)}{row.lot ? ` · Lote ${row.lot}` : ''}
                </div>
                <AssayTable lines={quoteLines.filter((line) => line.requestId === row.id)} />
              </div>
            )) : (
              <div className="space-y-2">
                <ul className="text-sm list-disc pl-5">
                  {selectedRows.map((row) => <li key={row.id}>{row.requestNumber} · {sampleTitle(row)}</li>)}
                </ul>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-[#00AEEF]/10 px-3 py-2 text-sm font-medium text-[#005F9E]">Paquete consolidado</div>
                  <AssayTable lines={quoteLines} />
                </div>
              </div>
            )}

            <div className="ml-auto w-64 text-sm space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>${quoteSubtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>IVA 15%</span><span>${quoteTax.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold text-[#005F9E] border-t pt-1"><span>Total</span><span>${quoteTotal.toFixed(2)}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>Cancelar</Button>
            <Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white" disabled={quotingGroup || quoteLines.length === 0} onClick={submitGroupQuote}>
              {quotingGroup ? 'Generando...' : 'Emitir proforma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" /> Eliminar muestras</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Confirme que los registros son erróneos antes de borrarlos.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {deletePlan.map(({ row, reason }) => (
              <li key={row.id} className={`rounded-lg border p-3 ${reason ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="font-medium">{row.requestNumber} · {sampleTitle(row)}</div>
                <div className="text-xs text-muted-foreground">{row.client?.name ?? 'Cliente'} · {row.status}</div>
                {reason && <p className="text-xs text-red-700 mt-1">{reason}</p>}
              </li>
            ))}
          </ul>
          {blockedRows.length > 0 && (
            <p className="text-xs text-red-700">
              Las muestras aprobadas y en análisis quedan bloqueadas por ISO 17025. Solo se eliminarán las que no tienen ese bloqueo.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleting || deletableRows.length === 0} onClick={confirmDelete}>
              {deletableRows.length === 0 ? 'Eliminación bloqueada' : deleting ? 'Eliminando...' : `Eliminar (${deletableRows.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssayTable({ lines }: { lines: { analysisTypeId: string; name: string; quantity: number; unitPrice: number; totalPrice: number }[] }) {
  if (!lines.length) return <p className="p-3 text-xs text-muted-foreground">Sin ensayos</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {lines.map((line) => (
          <tr key={`${line.analysisTypeId}-${line.name}`} className="border-t">
            <td className="p-2">{line.name}</td>
            <td className="p-2 text-right text-xs text-muted-foreground">{line.quantity} × ${line.unitPrice.toFixed(2)}</td>
            <td className="p-2 text-right">${line.totalPrice.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
