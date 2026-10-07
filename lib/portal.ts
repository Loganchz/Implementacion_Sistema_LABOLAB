import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

/**
 * Devuelve la sesión actual y, si el usuario es CLIENTE, su cuenta de Cliente
 * vinculada (Client.userId). Para roles internos, client es null.
 */
export async function getSessionClient() {
  const session = await getServerSession(authOptions);
  if (!session) return { session: null, role: null, userId: null, client: null };

  const userId = (session.user as any)?.id ?? null;
  const role = (session.user as any)?.role ?? null;

  let client = null;
  if (role === 'CLIENTE' && userId) {
    client = await prisma.client.findUnique({ where: { userId } });
  }

  return { session, role, userId, client };
}
