'use client';

import { useSidebar } from '@/components/sidebar-context';
import { cn } from '@/lib/utils';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={cn(
        'min-h-screen transition-all duration-300',
        collapsed ? 'lg:ml-[68px]' : 'lg:ml-[250px]'
      )}
    >
      <div className="p-4 lg:p-6 pt-16 lg:pt-6">
        {children}
      </div>
    </main>
  );
}
