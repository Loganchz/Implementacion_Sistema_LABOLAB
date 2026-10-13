'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import {
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  ClipboardList,
  TestTubes,
  FlaskConical,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Shield,
  FileBarChart,
  UserCircle,
} from 'lucide-react';
import { getRoleLabel } from '@/lib/permissions';

import { useSidebar } from '@/components/sidebar-context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Clientes', href: '/clientes', icon: Users, permission: 'clients.view' },
  { label: 'Ingreso de Muestras', href: '/solicitudes', icon: FileText, permission: 'requests.view' },
  { label: 'Cotizaciones', href: '/cotizaciones', icon: Calculator, permission: 'quotes.view' },
  { label: 'Órdenes de Trabajo', href: '/ordenes', icon: ClipboardList, permission: 'workorders.view' },
  { label: 'Muestras', href: '/muestras', icon: TestTubes, permission: 'samples.view' },
  { label: 'Resultados', href: '/resultados', icon: FlaskConical, permission: 'results.view' },
  { label: 'Reportes', href: '/reportes', icon: FileBarChart, permission: 'reports.view' },
  { label: 'Indicadores', href: '/indicadores', icon: BarChart3, permission: 'dashboard.view' },
  { label: 'Etiquetas', href: '/etiquetas', icon: Tag, permission: 'labels.print' },
  { label: 'Auditoría', href: '/auditoria', icon: Shield, permission: 'audit.view' },
  { label: 'Configuración', href: '/configuracion', icon: Settings, permission: 'config.view' },
  { label: 'Usuarios', href: '/usuarios', icon: UserCircle, permission: 'users.view' },
];

const clientNavItems: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mis Solicitudes', href: '/mis-solicitudes', icon: FileText },
  { label: 'Mis Resultados', href: '/mis-resultados', icon: FlaskConical },
];

export function Sidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession() || {};
  const userRole = (session?.user as any)?.role ?? 'CLIENTE';

  const items = userRole === 'CLIENTE'
    ? clientNavItems
    : navItems.filter((item: NavItem) =>
        !item.permission || hasPermission(userRole, item.permission as any)
      );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md text-[#005F9E]"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col transition-all duration-300 shadow-sm',
          collapsed ? 'w-[68px]' : 'w-[250px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-gray-100">
          {!collapsed ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden pl-1">
                <FlaskConical className="w-7 h-7 text-[#00AEEF] shrink-0" />
                <span className="font-display font-bold text-lg text-[#005F9E] tracking-tight">
                  LABOLAB
                </span>
              </Link>
              <button
                onClick={toggleCollapsed}
                className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-[#005F9E] hover:bg-gray-100 transition-colors"
                title="Contraer menú lateral"
                aria-label="Contraer menú"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center">
              <button
                onClick={toggleCollapsed}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#005F9E] hover:bg-gray-100 transition-colors"
                title="Expandir menú lateral"
                aria-label="Expandir menú"
              >
                <FlaskConical className="w-7 h-7 text-[#00AEEF]" />
              </button>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {items.map((item: NavItem) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-[#00AEEF]/10 text-[#005F9E]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-[#00AEEF]' : 'text-gray-500 group-hover:text-gray-700')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-gray-100 p-3">
          {!collapsed && session?.user && (
            <div className="mb-2 px-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.name ?? 'Usuario'}
              </p>
              <p className="text-xs text-gray-500">
                {getRoleLabel(userRole)}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors',
              collapsed && 'justify-center px-0'
            )}
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>

        {/* Collapse toggle (desktop only at bottom) */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex items-center justify-center h-10 border-t border-gray-100 text-gray-400 hover:text-[#005F9E] hover:bg-gray-50 transition-colors"
          title={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}
