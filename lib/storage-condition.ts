export const STORAGE_CONDITIONS = [
  { value: 'AMBIENTE', label: 'Ambiente (18-27°C)' },
  { value: 'REFRIGERACION', label: 'Refrigeración (2-8°C)' },
  { value: 'CONGELACION', label: 'Congelación (-18°C)' },
] as const;

const STORAGE_ORDER = STORAGE_CONDITIONS.map((item) => item.value);

export function storageConditionCodes(value?: string | null): string[] {
  if (!value) return [];
  const known = new Set<string>(STORAGE_ORDER);
  const found = new Set(
    String(value)
      .split(/[,|/]+/)
      .map((part) => part.trim().toUpperCase())
      .filter((part) => known.has(part)),
  );
  return STORAGE_ORDER.filter((code) => found.has(code));
}

export function joinStorageConditions(codes: string[]) {
  const known = new Set(codes);
  return STORAGE_ORDER.filter((code) => known.has(code)).join(',');
}

export function normalizeStorageCondition(value: unknown) {
  const codes = storageConditionCodes(typeof value === 'string' ? value : '');
  return codes.join(',') || 'AMBIENTE';
}

export function storageConditionLabel(value?: string | null) {
  const codes = storageConditionCodes(value);
  if (!codes.length) return '';
  return codes
    .map((code) => STORAGE_CONDITIONS.find((item) => item.value === code)?.label ?? code)
    .join(', ');
}
