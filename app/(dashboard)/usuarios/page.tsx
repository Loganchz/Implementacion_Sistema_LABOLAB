'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getRoleLabel } from '@/lib/permissions';

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'SECRETARIA', phone: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.name) { toast.error('Datos incompletos'); return; }
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success('Usuario creado');
        setDialogOpen(false);
        setForm({ email: '', password: '', name: '', role: 'SECRETARIA', phone: '' });
        loadData();
      } else { const err = await res.json(); toast.error(err?.error ?? 'Error'); }
    } catch { toast.error('Error'); }
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rol', render: (u: any) => getRoleLabel(u?.role ?? '') },
    { key: 'active', label: 'Estado', render: (u: any) => <span className={u?.active ? 'text-green-600' : 'text-red-600'}>{u?.active ? 'Activo' : 'Inactivo'}</span> },
    { key: 'lastLogin', label: 'Último Acceso', render: (u: any) => u?.lastLogin ? new Date(u.lastLogin).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }) : 'Nunca' },
  ];

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios del sistema"
        icon={UserCircle}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="bg-[#00AEEF] hover:bg-[#005F9E] text-white"><Plus className="w-4 h-4 mr-2" /> Nuevo Usuario</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nombre *</Label><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Contraseña *</Label><Input type="password" value={form.password} onChange={(e: any) => setForm({ ...form, password: e.target.value })} /></div>
                <div><Label>Rol</Label>
                  <Select value={form.role} onValueChange={(v: string) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="SECRETARIA">Secretaria</SelectItem>
                      <SelectItem value="ANALISTA_FQ">Analista Fisicoquímica</SelectItem>
                      <SelectItem value="ANALISTA_MICA">Analista Microbiología</SelectItem>
                      <SelectItem value="CLIENTE">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} /></div>
                <Button onClick={handleCreate} className="w-full bg-[#00AEEF] hover:bg-[#005F9E] text-white">Crear Usuario</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable columns={columns} data={users} loading={loading} emptyMessage="No hay usuarios" />
    </div>
  );
}
