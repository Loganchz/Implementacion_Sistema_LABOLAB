import { LaboLabLoader } from '@/components/labolab-loader';

export default function RootLoading() {
  return (
    <LaboLabLoader
      fullscreen
      size="lg"
      message="Iniciando LaboLab LIMS..."
      submessage="Conectando con la base de datos y servicios de laboratorio"
    />
  );
}
