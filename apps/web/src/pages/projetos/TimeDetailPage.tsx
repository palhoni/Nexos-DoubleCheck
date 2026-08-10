import { useNavigate, useParams } from 'react-router-dom';
import { EntityDetailPage } from '@/entities/crud/EntityDetailPage';
import { TIME_CONFIG } from '@/entities/time/time.config';
import { timeHooks } from '@/entities/time/time.hooks';
import { PessoasDoTimeTabPanel } from './PessoasDoTimeTabPanel';

export function TimeDetailPage() {
  const navigate = useNavigate();
  const { projetoId, timeId } = useParams<{ projetoId: string; timeId: string }>();

  if (!projetoId || !timeId) return null;

  return (
    <EntityDetailPage
      config={TIME_CONFIG}
      hooks={timeHooks}
      id={timeId}
      scopeId={projetoId}
      breadcrumbBase={['Setup', 'Projetos', 'Times']}
      onBack={() => navigate(`/projetos/${projetoId}/times`)}
      bespokeComponents={{ PessoasDoTimeTab: PessoasDoTimeTabPanel }}
    />
  );
}
