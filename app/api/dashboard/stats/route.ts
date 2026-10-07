export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const [openWorkOrders, samplesInProcess, pendingAnalysis, pendingReports] = await Promise.all([
      prisma.workOrder.count({ where: { status: { in: ['ABIERTA', 'EN_PROCESO'] } } }),
      prisma.sample.count({ where: { status: 'EN_ANALISIS' } }),
      prisma.analysisResult.count({ where: { status: { in: ['PENDIENTE', 'EN_PROCESO'] } } }),
      prisma.report.count({ where: { status: 'BORRADOR' } }),
    ]);

    const deliveredOrders = await prisma.workOrder.findMany({
      where: { status: 'ENTREGADA' },
      select: { estimatedDelivery: true, deliveredAt: true },
    });
    const totalDelivered = deliveredOrders?.length ?? 0;
    const deliveredOnTime = (deliveredOrders ?? []).filter((o: any) =>
      o?.estimatedDelivery && o?.deliveredAt && new Date(o.deliveredAt) <= new Date(o.estimatedDelivery)
    ).length;

    // Monthly orders for last 6 months
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const monthlyOrders = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = await prisma.workOrder.count({
        where: { createdAt: { gte: d, lt: end } },
      });
      monthlyOrders.push({ month: months[d.getMonth()] ?? '', count });
    }

    // Area distribution
    const fqCount = await prisma.sample.count({ where: { area: 'FISICOQUIMICA' } });
    const micaCount = await prisma.sample.count({ where: { area: 'MICROBIOLOGIA' } });
    const areaDistribution = [
      { name: 'Fisicoquímica', value: fqCount },
      { name: 'Microbiología', value: micaCount },
    ];

    // Top analysis
    const topResults = await prisma.analysisResult.groupBy({
      by: ['analysisTypeId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });
    const topIds = (topResults ?? []).map((r: any) => r?.analysisTypeId).filter(Boolean);
    const topTypes = topIds.length > 0 ? await prisma.analysisType.findMany({ where: { id: { in: topIds } } }) : [];
    const topAnalysis = (topResults ?? []).map((r: any) => {
      const t = (topTypes ?? []).find((t: any) => t?.id === r?.analysisTypeId);
      return { name: t?.name ?? 'Desconocido', count: r?._count?.id ?? 0 };
    });

    // Recent activity
    const recentActivity = await prisma.auditLog.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({
      openWorkOrders,
      samplesInProcess,
      pendingAnalysis,
      pendingReports,
      deliveredOnTime,
      totalDelivered,
      monthlyOrders,
      areaDistribution,
      topAnalysis,
      recentActivity,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Error al cargar estadísticas' }, { status: 500 });
  }
}
