'use client';

import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  // Request statuses
  BORRADOR: 'bg-gray-100 text-gray-700',
  ENVIADA: 'bg-blue-100 text-blue-700',
  EN_COTIZACION: 'bg-amber-100 text-amber-700',
  CONFIRMADA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-red-100 text-red-700',
  // Quote statuses
  ACEPTADA: 'bg-green-100 text-green-700',
  RECHAZADA: 'bg-red-100 text-red-700',
  VENCIDA: 'bg-orange-100 text-orange-700',
  // Work Order statuses
  ABIERTA: 'bg-blue-100 text-blue-700',
  EN_PROCESO: 'bg-amber-100 text-amber-700',
  COMPLETADA: 'bg-green-100 text-green-700',
  ENTREGADA: 'bg-emerald-100 text-emerald-700',
  // Sample statuses
  RECIBIDA: 'bg-blue-100 text-blue-700',
  EN_ANALISIS: 'bg-amber-100 text-amber-700',
  ANALIZADA: 'bg-green-100 text-green-700',
  DESCARTADA: 'bg-red-100 text-red-700',
  // Result statuses
  PENDIENTE: 'bg-gray-100 text-gray-700',
  VERIFICADO: 'bg-emerald-100 text-emerald-700',
  // Report statuses
  EMITIDO: 'bg-blue-100 text-blue-700',
  ENVIADO: 'bg-green-100 text-green-700',
};

const statusLabels: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  EN_COTIZACION: 'En Cotización',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  VENCIDA: 'Vencida',
  ABIERTA: 'Abierta',
  EN_PROCESO: 'En Proceso',
  COMPLETADA: 'Completada',
  ENTREGADA: 'Entregada',
  RECIBIDA: 'Recibida',
  EN_ANALISIS: 'En Análisis',
  ANALIZADA: 'Analizada',
  DESCARTADA: 'Descartada',
  PENDIENTE: 'Pendiente',
  COMPLETADO: 'Completado',
  VERIFICADO: 'Verificado',
  EMITIDO: 'Emitido',
  ENVIADO: 'Enviado',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        statusStyles[status] ?? 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
