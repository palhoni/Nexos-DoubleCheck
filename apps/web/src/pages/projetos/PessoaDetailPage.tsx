import { useNavigate, useParams } from 'react-router-dom';
import { EntityDetailPage } from '@/entities/crud/EntityDetailPage';
import { PESSOA_CONFIG } from '@/entities/pessoa/pessoa.config';
import { pessoaHooks } from '@/entities/pessoa/pessoa.hooks';
import { timeHooks } from '@/entities/time/time.hooks';

export function PessoaDetailPage() {
  const navigate = useNavigate();
  const { projetoId, pessoaId } = useParams<{ projetoId: string; pessoaId: string }>();
  const { data: timesData } = timeHooks.useList({ page: 1, pageSize: 100 }, projetoId);
  const times = timesData?.data.map((t) => ({ value: t.id, label: t.nome })) ?? [];

  if (!projetoId || !pessoaId) return null;

  return (
    <EntityDetailPage
      config={PESSOA_CONFIG}
      hooks={pessoaHooks}
      id={pessoaId}
      scopeId={projetoId}
      extraOptions={{ times }}
      breadcrumbBase={['Setup', 'Projetos', 'Pessoas']}
      onBack={() => navigate(`/projetos/${projetoId}/pessoas`)}
    />
  );
}
