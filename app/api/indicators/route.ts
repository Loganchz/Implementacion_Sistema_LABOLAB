export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Delivered orders for TAT (tiempo de entrega) calculations
    const deliveredOrders = await prisma.workOrder.findMany({
      where: { status: { in: ['COMPLETADA', 'ENTREGADA'] }, deliveredAt: { not: null } },
      select: { receivedAt: true, deliveredAt: true, estimatedDelivery: true },
    });

    const tatValues = (deliveredOrders ?? [])
      .filter((o: any) => o?.receivedAt && o?.deliveredAt)
      .map((o: any) => (new Date(o.deliveredAt).getTime() - new Date(o.receivedAt).getTime()) / MS_PER_DAY)
      .filter((d: number) => d >= 0);

    const totalDelivered = tatValues.length;
    const avgTat = totalDelivered > 0 ? tatValues.reduce((a: number, b: number) => a + b, 0) / totalDelivered : 0;
    const minTat = totalDelivered > 0 ? Math.min(...tatValues) : 0;
    const maxTat = totalDelivered > 0 ? Math.max(...tatValues) : 0;

    const onTimeCount = (deliveredOrders ?? []).filter((o: any) =>
      o?.estimatedDelivery && o?.deliveredAt && new Date(o.deliveredAt) <= new Date(o.estimatedDelivery)
    ).length;
    const withEstimate = (deliveredOrders ?? []).filter((o: any) => o?.estimatedDelivery && o?.deliveredAt).length;
    const onTimePercent = withEstimate > 0 ? Math.round((onTimeCount / withEstimate) * 100) : 0;

    // Orders by status
    const statusList = ['ABIERTA', 'EN_PROCESO', 'COMPLETADA', 'ENTREGADA'];
    const statusLabels: Record<string, string> = {
      ABIERTA: 'Abierta', EN_PROCESO: 'En Proceso', COMPLETADA: 'Completada', ENTREGADA: 'Entregada',
    };
    const statusCounts = await Promise.all(
      statusList.map((s) => prisma.workOrder.count({ where: { status: s as any } }))
    );
    const ordersByStatus = statusList.map((s, i) => ({ name: statusLabels[s], value: statusCounts[i] ?? 0 }));

    // Result quality: out of range vs in range (of results with numeric value)
    const [totalNumericResults, outOfRangeResults, samplesThisMonth, activeSamples, pendingReports, totalReportsIssued] =
      await Promise.all([
        prisma.analysisResult.count({ where: { numericValue: { not: null } } }),
        prisma.analysisResult.count({ where: { outOfRange: true } }),
        prisma.sample.count({ where: { receivedAt: { gte: startOfMonth } } }),
        prisma.sample.count({ where: { status: { in: ['RECIBIDA', 'EN_ANALISIS'] } } }),
        prisma.report.count({ where: { status: 'BORRADOR' } }),
        prisma.report.count({ where: { status: { in: ['EMITIDO', 'ENVIADO'] } } }),
      ]);
    const inRangeResults = Math.max(0, totalNumericResults - outOfRangeResults);
    const outOfRangePercent = totalNumericResults > 0 ? Math.round((outOfRangeResults / totalNumericResults) * 100) : 0;

    // Area distribution (samples)
    const [fqCount, micaCount] = await Promise.all([
      prisma.sample.count({ where: { area: 'FISICOQUIMICA' } }),
      prisma.sample.count({ where: { area: 'MICROBIOLOGIA' } }),
    ]);
    const areaDistribution = [
      { name: 'Fisicoquímica', value: fqCount },
      { name: 'Microbiología', value: micaCount },
    ];

    // Monthly trend: samples received + average TAT per month (last 6 months)
    const monthlyTrend: { month: string; muestras: number; tat: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const samplesCount = await prisma.sample.count({ where: { receivedAt: { gte: d, lt: end } } });
      const delivered = await prisma.workOrder.findMany({
        where: { deliveredAt: { gte: d, lt: end } },
        select: { receivedAt: true, deliveredAt: true },
      });
      const tats = (delivered ?? [])
        .filter((o: any) => o?.receivedAt && o?.deliveredAt)
        .map((o: any) => (new Date(o.deliveredAt).getTime() - new Date(o.receivedAt).getTime()) / MS_PER_DAY)
        .filter((x: number) => x >= 0);
      const monthTat = tats.length > 0 ? tats.reduce((a: number, b: number) => a + b, 0) / tats.length : 0;
      monthlyTrend.push({
        month: months[d.getMonth()] ?? '',
        muestras: samplesCount,
        tat: Math.round(monthTat * 10) / 10,
      });
    }

    // TAT by area (average days from sample received to analyzedAt)
    const analyzedSamples = await prisma.sample.findMany({
      where: { analyzedAt: { not: null } },
      select: { area: true, receivedAt: true, analyzedAt: true },
    });
    const areaTat: Record<string, number[]> = { FISICOQUIMICA: [], MICROBIOLOGIA: [] };
    (analyzedSamples ?? []).forEach((s: any) => {
      if (s?.receivedAt && s?.analyzedAt && areaTat[s.area]) {
        const days = (new Date(s.analyzedAt).getTime() - new Date(s.receivedAt).getTime()) / MS_PER_DAY;
        if (days >= 0) areaTat[s.area].push(days);
      }
    });
    const avg = (arr: number[]) => (arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);
    const tatByArea = [
      { name: 'Fisicoquímica', dias: avg(areaTat.FISICOQUIMICA) },
      { name: 'Microbiología', dias: avg(areaTat.MICROBIOLOGIA) },
    ];

    return NextResponse.json({
      avgTat: Math.round(avgTat * 10) / 10,
      minTat: Math.round(minTat * 10) / 10,
      maxTat: Math.round(maxTat * 10) / 10,
      totalDelivered,
      onTimePercent,
      onTimeCount,
      withEstimate,
      samplesThisMonth,
      activeSamples,
      pendingReports,
      totalReportsIssued,
      totalNumericResults,
      outOfRangeResults,
      inRangeResults,
      outOfRangePercent,
      ordersByStatus,
      areaDistribution,
      monthlyTrend,
      tatByArea,
    });
  } catch (error: any) {
    console.error('Indicators error:', error);
    return NextResponse.json({ error: 'Error al cargar indicadores' }, { status: 500 });
  }
}
