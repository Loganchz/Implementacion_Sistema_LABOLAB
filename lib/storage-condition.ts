export const STORAGE_CONDITIONS = [
  { value: 'AMBIENTE', label: 'Ambiente (18-27°C)' },
  { value: 'REFRIGERACION', label: 'Refrigeración (2-8°C)' },
  { value: 'CONGELACION', label: 'Congelación (-18°C)' },
] as const;

export function storageConditionLabel(value?: string | null) {
  if (!value) return '';
  return STORAGE_CONDITIONS.find((item) => item.value === value)?.label ?? value;
}
