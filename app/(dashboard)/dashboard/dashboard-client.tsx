'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import {
  LayoutDashboard,
  ClipboardList,
  TestTubes,
  FlaskConical,
  FileBarChart,
  Clock,
  TrendingUp,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { LaboLabLoader } from '@/components/labolab-loader';

const DashboardCharts = dynamic(() => import('./dashboard-charts'), { ssr: false });

interface DashboardStats {
  openWorkOrders: number;
  samplesInProcess: number;
  pendingAnalysis: number;
  pendingReports: number;
  deliveredOnTime: number;
  totalDelivered: number;
  recentActivity: any[];
  monthlyOrders: any[];
  areaDistribution: any[];
  topAnalysis: any[];
}

export function DashboardClient() {
  const { data: session, status } = useSession() || {};
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState<{ requests: number; activeOrders: number; availableReports: number } | null>(null);

  const isSessionLoading = status === 'loading';
  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    if (userRole !== 'CLIENTE') return;
    async function loadMe() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          if (data?.stats) setClientStats(data.stats);
        }
      } catch (error) {
        console.error('Error loading client stats:', error);
      }
    }
    loadMe();
  }, [userRole]);

  // Prevent flash: show branded pulsating loader while session or initial data is loading
  if (isSessionLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LaboLabLoader
          message="Cargando panel de control..."
          submessage="Estableciendo comunicación y verificando estación de trabajo"
        />
      </div>
    );
  }

  if (userRole === 'CLIENTE') {
    return (
      <div>
        <PageHeader
          title={`Bienvenido, ${session?.user?.name ?? 'Cliente'}`}
          description="Portal de seguimiento de análisis"
          icon={LayoutDashboard}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link href="/mis-solicitudes"><StatCard icon={FileBarChart} label="Mis Solicitudes" value={clientStats ? String(clientStats.requests) : '...'} color="blue" /></Link>
          <StatCard icon={ClipboardList} label="Órdenes Activas" value={clientStats ? String(clientStats.activeOrders) : '...'} color="amber" />
          <Link href="/mis-resultados"><StatCard icon={FlaskConical} label="Reportes Disponibles" value={clientStats ? String(clientStats.availableReports) : '...'} color="green" /></Link>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-[#005F9E] mb-2">¿Cómo funciona?</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Envíe una nueva solicitud desde <Link href="/mis-solicitudes" className="text-[#00AEEF] font-medium hover:underline">Mis Solicitudes</Link>, indicando el tipo de muestra y los análisis requeridos.</li>
            <li>El laboratorio revisa su solicitud, prepara la cotización y genera la orden de trabajo.</li>
            <li>Cuando los análisis finalizan y el informe es emitido, podrá descargarlo en <Link href="/mis-resultados" className="text-[#00AEEF] font-medium hover:underline">Mis Resultados</Link>.</li>
          </ol>
        </div>
      </div>
    );
  }

  const onTimePercent = stats && (stats.totalDelivered ?? 0) > 0
    ? Math.round(((stats.deliveredOnTime ?? 0) / (stats.totalDelivered ?? 1)) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Vista general del laboratorio"
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={ClipboardList}
          label="OTs Abiertas"
          value={loading ? '...' : String(stats?.openWorkOrders ?? 0)}
          color="blue"
        />
        <StatCard
          icon={TestTubes}
          label="Muestras en Proceso"
          value={loading ? '...' : String(stats?.samplesInProcess ?? 0)}
          color="amber"
        />
        <StatCard
          icon={FlaskConical}
          label="Análisis Pendientes"
          value={loading ? '...' : String(stats?.pendingAnalysis ?? 0)}
          color="red"
        />
        <StatCard
          icon={FileBarChart}
          label="Reportes por Emitir"
          value={loading ? '...' : String(stats?.pendingReports ?? 0)}
          color="green"
        />
      </div>

      <div className="mb-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Entrega a tiempo</p>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : `${onTimePercent}%`}</p>
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${onTimePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {!loading && stats && <DashboardCharts stats={stats} />}

      <div className="mt-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00AEEF]" />
              Actividad Reciente
            </h3>
            <div className="space-y-3">
              {(stats?.recentActivity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay actividad reciente</p>
              ) : (
                (stats?.recentActivity ?? []).slice(0, 10).map((log: any, i: number) => (
                  <div key={log?.id ?? i} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-[#00AEEF] mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">{log?.user?.name ?? 'Sistema'}</span>
                      {' '}
                      <span className="text-muted-foreground">{log?.details ?? log?.action ?? ''}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 font-mono">
                      {log?.createdAt ? new Date(log.createdAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<any>; label: string; value: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
  };
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${c.text}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
