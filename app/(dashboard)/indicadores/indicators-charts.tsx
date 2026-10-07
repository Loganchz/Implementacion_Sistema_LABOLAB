'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';

const COLORS = ['#00AEEF', '#005F9E', '#FF9149', '#80D8C3', '#FF6363', '#A19AD3'];
const STATUS_COLORS: Record<string, string> = {
  Abierta: '#00AEEF',
  'En Proceso': '#FF9149',
  Completada: '#80D8C3',
  Entregada: '#005F9E',
};

export default function IndicatorsCharts({ data }: { data: any }) {
  const monthlyTrend = data?.monthlyTrend ?? [];
  const ordersByStatus = data?.ordersByStatus ?? [];
  const areaDistribution = data?.areaDistribution ?? [];
  const tatByArea = data?.tatByArea ?? [];
  const qualityData = [
    { name: 'En rango', value: data?.inRangeResults ?? 0 },
    { name: 'Fuera de rango', value: data?.outOfRangeResults ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tendencia mensual TAT */}
      <Card className="border-none shadow-sm lg:col-span-2">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Tendencia Mensual: Muestras y TAT Promedio</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="muestras" name="Muestras recibidas" stroke="#00AEEF" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="tat" name="TAT promedio (días)" stroke="#FF9149" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ordenes por estado */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Órdenes por Estado</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersByStatus} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} interval={0} />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" name="Órdenes" radius={[4, 4, 0, 0]}>
                  {(ordersByStatus ?? []).map((entry: any, index: number) => (
                    <Cell key={index} fill={STATUS_COLORS[entry?.name] ?? COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Calidad de resultados */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Calidad de Resultados</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qualityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                  <Cell fill="#059669" />
                  <Cell fill="#DC2626" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribucion por area */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Muestras por Área</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={areaDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                  {(areaDistribution ?? []).map((_: any, index: number) => (
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

      {/* TAT por area */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">TAT Promedio por Área (días)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tatByArea} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tickLine={false} tick={{ fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="dias" name="Días promedio" fill="#005F9E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
