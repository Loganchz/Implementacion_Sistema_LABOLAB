import { prisma } from '@/lib/db';

export async function getNextNumber(key: string, prefix?: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const defaultPrefixes: Record<string, string> = {
    SOL: 'SOL',
    COT: 'COT',
    OT: 'OT',
    MUE: 'MUE',
    REP: 'REP',
  };
  const pfx = prefix ?? defaultPrefixes[key] ?? key;

  // Find existing counter
  const existing = await prisma.counter.findUnique({ where: { key } });

  if (!existing) {
    // Create new counter starting at 1
    const created = await prisma.counter.create({
      data: { key, prefix: pfx, year: currentYear, sequence: 1 },
    });
    return `${pfx}-${currentYear}-${String(created.sequence).padStart(4, '0')}`;
  }

  // If year changed, reset sequence
  if (existing.year !== currentYear) {
    const updated = await prisma.counter.update({
      where: { key },
      data: { year: currentYear, sequence: 1, prefix: pfx },
    });
    return `${pfx}-${currentYear}-${String(updated.sequence).padStart(4, '0')}`;
  }

  // Increment sequence
  const updated = await prisma.counter.update({
    where: { key },
    data: { sequence: { increment: 1 } },
  });

  return `${pfx}-${currentYear}-${String(updated.sequence).padStart(4, '0')}`;
}
