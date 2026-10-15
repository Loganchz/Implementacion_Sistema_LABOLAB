'use client';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LaboLabLoader } from '@/components/labolab-loader';

export interface Column<T> {
  key: string;
  label: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  compact?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  compact = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 py-10">
        <LaboLabLoader
          size="sm"
          message="Consultando registros analíticos..."
          submessage=""
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <Table className={compact ? 'table-fixed' : undefined}>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            {(columns ?? []).map((col: Column<T>) => (
              <TableHead key={col.key} className={cn(compact ? 'h-9 px-2.5 py-1.5 text-[13px] font-semibold tracking-normal text-gray-600' : 'text-xs font-semibold text-gray-600 uppercase tracking-wider', col.className)}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={(columns ?? []).length} className="text-center py-12 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            (data ?? []).map((item: T, idx: number) => (
              <TableRow
                key={(item as any)?.id ?? idx}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-[#00AEEF]/5'
                )}
              >
                {(columns ?? []).map((col: Column<T>) => (
                  <TableCell key={col.key} className={cn(compact ? 'px-2.5 py-2 text-sm' : 'text-sm', col.className)}>
                    {col.render ? col.render(item) : (item as any)?.[col.key] ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
