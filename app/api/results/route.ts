export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sampleId = searchParams.get('sampleId');
    const status = searchParams.get('status');
    const analystId = searchParams.get('analystId');

    const where: any = {};
    if (sampleId) where.sampleId = sampleId;
    if (status) where.status = status;
    if (analystId) where.analystId = analystId;

    const results = await prisma.analysisResult.findMany({
      where,
      include: {
        sample: { select: { sampleCode: true, workOrder: { select: { orderNumber: true } } } },
        analysisType: true,
        analyst: { select: { name: true } },
        verifiedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { sampleId, analysisTypeId, value, numericValue, unit, method, observations } = body ?? {};

    if (!sampleId || !analysisTypeId) {
      return NextResponse.json({ error: 'Muestra y tipo de análisis requeridos' }, { status: 400 });
    }

    // Check if result is out of range
    const analysisType = await prisma.analysisType.findUnique({ where: { id: analysisTypeId } });
    let outOfRange = false;
    if (analysisType && numericValue != null) {
      if (analysisType.minValue != null && numericValue < analysisType.minValue) outOfRange = true;
      if (analysisType.maxValue != null && numericValue > analysisType.maxValue) outOfRange = true;
    }

    const result = await prisma.analysisResult.upsert({
      where: {
        sampleId_analysisTypeId: { sampleId, analysisTypeId },
      },
      update: {
        value: value || null,
        numericValue: numericValue ?? null,
        unit: unit || analysisType?.unit || null,
        method: method || analysisType?.method || null,
        observations: observations || null,
        outOfRange,
        status: 'COMPLETADO',
        analystId: (session.user as any)?.id,
        analyzedAt: new Date(),
      },
      create: {
        sampleId,
        analysisTypeId,
        value: value || null,
        numericValue: numericValue ?? null,
        unit: unit || analysisType?.unit || null,
        method: method || analysisType?.method || null,
        observations: observations || null,
        outOfRange,
        status: 'COMPLETADO',
        analystId: (session.user as any)?.id,
        analyzedAt: new Date(),
      },
    });

    // Update sample status
    await prisma.sample.updateMany({
      where: { id: sampleId, status: 'RECIBIDA' },
      data: { status: 'EN_ANALISIS' },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'CREATE',
      entity: 'RESULT',
      entityId: result.id,
      details: `Resultado registrado: ${analysisType?.name ?? ''} = ${value ?? numericValue ?? ''}${outOfRange ? ' (FUERA DE RANGO)' : ''}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Results POST error:', error);
    return NextResponse.json({ error: 'Error al registrar resultado' }, { status: 500 });
  }
}
