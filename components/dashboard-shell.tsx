'use client';

import { useState } from 'react';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="lg:ml-[250px] min-h-screen transition-all duration-300">
      <div className="p-4 lg:p-6 pt-16 lg:pt-6">
        {children}
      </div>
    </main>
  );
}
