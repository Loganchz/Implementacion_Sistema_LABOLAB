'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  ruc: string | null;
  email: string | null;
  phone: string | null;
  clientType: string;
  city: string | null;
  active: boolean;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', ruc: '', email: '', phone: '', address: '', city: '', clientType: 'EMPRESA', contactName: '', contactPhone: '', contactEmail: '', notes: '' });

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data?.clients ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleCreate = async () => {
    if (!form.name) { toast.error('El nombre es requerido'); return; }
    try {
      const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success('Cliente creado exitosamente');
        setDialogOpen(false);
        setForm({ name: '', ruc: '', email: '', phone: '', address: '', city: '', clientType: 'EMPRESA', contactName: '', contactPhone: '', contactEmail: '', notes: '' });
        loadClients();
      } else {
        const err = await res.json();
        toast.error(err?.error ?? 'Error');
      }
    } catch { toast.error('Error al crear'); }
  };

  const columns: Column<Client>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'ruc', label: 'RUC/Cédula', render: (c: Client) => c?.ruc ?? '-' },
    { key: 'email', label: 'Email', render: (c: Client) => c?.email ?? '-' },
    { key: 'phone', label: 'Teléfono', render: (c: Client) => c?.phone ?? '-' },
    { key: 'clientType', label: 'Tipo', render: (c: Client) => c?.clientType === 'EMPRESA' ? 'Empresa' : 'Persona' },
    { key: 'city', label: 'Ciudad', render: (c: Client) => c?.city ?? '-' },
  ];

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gestión de clientes del laboratorio"
        icon={Users}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Nombre *</Label><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>RUC/Cédula</Label><Input value={form.ruc} onChange={(e: any) => setForm({ ...form, ruc: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Dirección</Label><Input value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} /></div>
                  <div><Label>Ciudad</Label><Input value={form.city} onChange={(e: any) => setForm({ ...form, city: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Tipo de Cliente</Label>
                  <Select value={form.clientType} onValueChange={(v: string) => setForm({ ...form, clientType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPRESA">Empresa</SelectItem>
                      <SelectItem value="PERSONA">Persona Natural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Contacto Nombre</Label><Input value={form.contactName} onChange={(e: any) => setForm({ ...form, contactName: e.target.value })} /></div>
                  <div><Label>Contacto Teléfono</Label><Input value={form.contactPhone} onChange={(e: any) => setForm({ ...form, contactPhone: e.target.value })} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">Crear Cliente</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, RUC o email..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable columns={columns} data={clients} loading={loading} emptyMessage="No hay clientes registrados" />
    </div>
  );
}
