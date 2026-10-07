import { Sidebar } from '@/components/sidebar';
import { DashboardShell } from '@/components/dashboard-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
