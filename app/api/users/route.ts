export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, lastLogin: true, createdAt: true, phone: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const body = await request.json();
    const { email, password, name, role, phone } = body ?? {};

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'El email ya existe' }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'CLIENTE', phone: phone || null },
      select: { id: true, email: true, name: true, role: true },
    });

    await createAuditLog({
      userId: (session.user as any)?.id,
      action: 'CREATE',
      entity: 'USER',
      entityId: user.id,
      details: `Usuario creado: ${name} (${role})`,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
