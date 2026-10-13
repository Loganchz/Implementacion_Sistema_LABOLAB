import { Sidebar } from '@/components/sidebar';
import { DashboardShell } from '@/components/dashboard-shell';
import { SidebarProvider } from '@/components/sidebar-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <DashboardShell>{children}</DashboardShell>
      </div>
    </SidebarProvider>
  );
}
