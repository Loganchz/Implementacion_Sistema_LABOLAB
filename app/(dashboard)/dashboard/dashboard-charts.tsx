'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#00AEEF', '#005F9E', '#FF9149', '#80D8C3', '#FF6363', '#A19AD3'];

export default function DashboardCharts({ stats }: { stats: any }) {
  const monthlyData = stats?.monthlyOrders ?? [];
  const areaData = stats?.areaDistribution ?? [];
  const topAnalysis = stats?.topAnalysis ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Órdenes por Mes</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" name="Órdenes" fill="#00AEEF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Distribución por Área</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={areaData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                  {(areaData ?? []).map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm lg:col-span-2">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Análisis Más Solicitados</h3>
          <div className="space-y-3">
            {(topAnalysis ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos aún</p>
            ) : (
              (topAnalysis ?? []).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8 text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{item?.name ?? '-'}</span>
                      <span className="text-xs text-muted-foreground">{item?.count ?? 0} solicitudes</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#00AEEF]" style={{ width: `${Math.min(100, ((item?.count ?? 0) / (topAnalysis?.[0]?.count ?? 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
