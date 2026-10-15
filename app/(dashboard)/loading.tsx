import { LaboLabLoader } from '@/components/labolab-loader';

export default function DashboardLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <LaboLabLoader
        message="Cargando módulo de laboratorio..."
        submessage="Sincronizando registros analíticos y estación de trabajo"
      />
    </div>
  );
}
