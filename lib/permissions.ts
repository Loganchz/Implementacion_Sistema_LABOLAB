import { UserRole } from '@prisma/client';

export type Permission =
  | 'dashboard.view'
  | 'clients.view' | 'clients.create' | 'clients.edit'
  | 'requests.view' | 'requests.create' | 'requests.edit'
  | 'quotes.view' | 'quotes.create' | 'quotes.edit' | 'quotes.send'
  | 'workorders.view' | 'workorders.create' | 'workorders.edit'
  | 'samples.view' | 'samples.create' | 'samples.edit'
  | 'results.view' | 'results.create' | 'results.edit' | 'results.verify'
  | 'reports.view' | 'reports.create' | 'reports.edit' | 'reports.send'
  | 'labels.print'
  | 'audit.view'
  | 'config.view' | 'config.edit'
  | 'users.view' | 'users.create' | 'users.edit';

const rolePermissions: Record<string, Permission[]> = {
  ADMIN: [
    'dashboard.view',
    'clients.view', 'clients.create', 'clients.edit',
    'requests.view', 'requests.create', 'requests.edit',
    'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.send',
    'workorders.view', 'workorders.create', 'workorders.edit',
    'samples.view', 'samples.create', 'samples.edit',
    'results.view', 'results.create', 'results.edit', 'results.verify',
    'reports.view', 'reports.create', 'reports.edit', 'reports.send',
    'labels.print',
    'audit.view',
    'config.view', 'config.edit',
    'users.view', 'users.create', 'users.edit',
  ],
  SECRETARIA: [
    'dashboard.view',
    'clients.view', 'clients.create', 'clients.edit',
    'requests.view', 'requests.create', 'requests.edit',
    'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.send',
    'workorders.view', 'workorders.create', 'workorders.edit',
    'samples.view', 'samples.create', 'samples.edit',
    'results.view',
    'reports.view', 'reports.create', 'reports.send',
    'labels.print',
  ],
  ANALISTA_FQ: [
    'dashboard.view',
    'samples.view',
    'results.view', 'results.create', 'results.edit',
    'labels.print',
    'workorders.view',
  ],
  ANALISTA_MICA: [
    'dashboard.view',
    'samples.view',
    'results.view', 'results.create', 'results.edit',
    'labels.print',
    'workorders.view',
  ],
  CLIENTE: [
    'requests.view', 'requests.create',
    'quotes.view',
    'workorders.view',
    'reports.view',
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getPermissions(role: string): Permission[] {
  return rolePermissions[role] ?? [];
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    SECRETARIA: 'Secretaria',
    ANALISTA_FQ: 'Analista Fisicoquímica',
    ANALISTA_MICA: 'Analista Microbiología',
    CLIENTE: 'Cliente',
  };
  return labels[role] ?? role;
}
