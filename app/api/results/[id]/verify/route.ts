export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userRole = (session.user as any)?.role;
    if (!['ADMIN', 'ANALISTA_FQ', 'ANALISTA_MICA'].includes(userRole)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const result = await prisma.analysisResult.update({
      where: { id: params.id },
      data: {
        status: 'VERIFICADO',
        verifiedById: (session.user as any)?.id,
        verifiedAt: new Date(),
      },
      include: { analysisType: { select: { name: true } }, sample: { select: { sampleCode: true } } },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'VERIFY',
      entity: 'RESULT',
      entityId: result.id,
      details: `Resultado verificado: ${result.analysisType?.name ?? ''} en muestra ${result.sample?.sampleCode ?? ''}`,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al verificar' }, { status: 500 });
  }
}
