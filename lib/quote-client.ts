import { prisma } from '@/lib/db';

export async function quoteClientMismatch(quoteNumber: unknown, clientId?: string | null) {
  const number = String(quoteNumber ?? '').trim();
  if (!number || /^n\/?a$/i.test(number) || !clientId) return null;

  const quote = await prisma.quote.findUnique({
    where: { quoteNumber: number },
    select: { quoteNumber: true, clientId: true, client: { select: { name: true } } },
  });
  if (!quote || quote.clientId === clientId) return null;
  return `La proforma ${quote.quoteNumber} pertenece a ${quote.client.name}. Debe ser del mismo cliente de la solicitud.`;
}
