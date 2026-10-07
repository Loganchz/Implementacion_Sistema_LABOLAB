'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TestTubes,
  FileBarChart,
  Timer,
  Gauge,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const IndicatorsCharts = dynamic(() => import('./indicators-charts'), { ssr: false });

export function IndicatorsClient() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/indicators');
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error('Error loading indicators:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const fmt = (v: number | undefined, suffix = '') =>
    loading ? '...' : `${v ?? 0}${suffix}`;

  return (
    <div>
      <PageHeader
        title="Indicadores y Tiempos de Entrega"
        description="Panel de KPIs del laboratorio: tiempos de entrega (TAT), cumplimiento y calidad de resultados"
        icon={BarChart3}
      />

      {/* KPI principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Timer}
          label="TAT Promedio"
          value={fmt(data?.avgTat, ' días')}
          hint={loading ? '' : `Mín ${data?.minTat ?? 0} · Máx ${data?.maxTat ?? 0} días`}
          color="blue"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Entrega a Tiempo"
          value={fmt(data?.onTimePercent, '%')}
          hint={loading ? '' : `${data?.onTimeCount ?? 0} de ${data?.withEstimate ?? 0} órdenes`}
          color="green"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Resultados Fuera de Rango"
          value={fmt(data?.outOfRangeResults)}
          hint={loading ? '' : `${data?.outOfRangePercent ?? 0}% de ${data?.totalNumericResults ?? 0} numéricos`}
          color="red"
        />
        <KpiCard
          icon={TestTubes}
          label="Muestras del Mes"
          value={fmt(data?.samplesThisMonth)}
          hint={loading ? '' : `${data?.activeSamples ?? 0} activas en proceso`}
          color="amber"
        />
      </div>

      {/* KPI secundarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Gauge}
          label="Órdenes Entregadas"
          value={fmt(data?.totalDelivered)}
          hint="Total con entrega registrada"
          color="blue"
        />
        <KpiCard
          icon={FileBarChart}
          label="Informes Emitidos"
          value={fmt(data?.totalReportsIssued)}
          hint={loading ? '' : `${data?.pendingReports ?? 0} en borrador`}
          color="green"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Resultados en Rango"
          value={fmt(data?.inRangeResults)}
          hint="Dentro de límites normativos"
          color="green"
        />
        <KpiCard
          icon={Clock}
          label="TAT Máximo"
          value={fmt(data?.maxTat, ' días')}
          hint="Orden más demorada"
          color="amber"
        />
      </div>

      {!loading && data && <IndicatorsCharts data={data} />}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  hint?: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  };
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 ${c.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
