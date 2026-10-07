export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const at = await prisma.analysisType.findUnique({ where: { id: params.id } });
    if (!at) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(at);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const data: any = {};
    // Campos permitidos para edición (parámetros y límites normativos)
    if (body.name !== undefined) data.name = body.name;
    if (body.area !== undefined) data.area = body.area;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.method !== undefined) data.method = body.method || null;
    if (body.unit !== undefined) data.unit = body.unit || null;
    if (body.detectionLimit !== undefined) data.detectionLimit = body.detectionLimit || null;
    if (body.basePrice !== undefined) data.basePrice = parseFloat(String(body.basePrice)) || 0;
    if (body.estimatedDays !== undefined) data.estimatedDays = parseInt(String(body.estimatedDays)) || 5;
    if (body.minValue !== undefined) data.minValue = body.minValue === '' || body.minValue === null ? null : parseFloat(String(body.minValue));
    if (body.maxValue !== undefined) data.maxValue = body.maxValue === '' || body.maxValue === null ? null : parseFloat(String(body.maxValue));
    if (body.active !== undefined) data.active = !!body.active;

    const at = await prisma.analysisType.update({ where: { id: params.id }, data });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'UPDATE',
      entity: 'ANALYSIS_TYPE',
      entityId: at.id,
      details: `Parámetro/límites actualizados: ${at.name} (rango: ${at.minValue ?? '-'} a ${at.maxValue ?? '-'} ${at.unit ?? ''})`,
    });

    return NextResponse.json(at);
  } catch (error: any) {
    console.error('AnalysisType PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
