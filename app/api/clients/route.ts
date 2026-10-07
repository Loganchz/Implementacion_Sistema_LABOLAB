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
    const search = searchParams.get('search') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ruc: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({ clients, total, page, limit });
  } catch (error: any) {
    console.error('Clients GET error:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { name, ruc, email, phone, address, city, clientType, contactName, contactPhone, contactEmail, notes } = body ?? {};

    if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

    const client = await prisma.client.create({
      data: {
        name,
        ruc: ruc || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        clientType: clientType || 'EMPRESA',
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        notes: notes || null,
      },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'CREATE',
      entity: 'CLIENT',
      entityId: client.id,
      details: `Cliente creado: ${name}`,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error('Clients POST error:', error);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
