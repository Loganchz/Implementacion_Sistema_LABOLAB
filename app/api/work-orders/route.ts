export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: {
          client: { select: { name: true } },
          quote: { select: { quoteNumber: true } },
          samples: { select: { id: true, sampleCode: true, status: true, area: true } },
          items: { include: { analysisType: { select: { name: true, code: true, area: true } } } },
          _count: { select: { samples: true, reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workOrder.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
