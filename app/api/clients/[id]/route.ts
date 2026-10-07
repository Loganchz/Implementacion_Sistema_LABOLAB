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

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { requests: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json(client);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: body.name,
        ruc: body.ruc || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        clientType: body.clientType || 'EMPRESA',
        contactName: body.contactName || null,
        contactPhone: body.contactPhone || null,
        contactEmail: body.contactEmail || null,
        notes: body.notes || null,
        active: body.active ?? true,
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'UPDATE',
      entity: 'CLIENT',
      entityId: client.id,
      details: `Cliente actualizado: ${client.name}`,
    });

    return NextResponse.json(client);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
