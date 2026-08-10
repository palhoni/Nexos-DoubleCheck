import { useNavigate, useParams } from 'react-router-dom';
import { EntityListPage } from '@/entities/crud/EntityListPage';
import { PESSOA_CONFIG } from '@/entities/pessoa/pessoa.config';
import { pessoaHooks } from '@/entities/pessoa/pessoa.hooks';
import { timeHooks } from '@/entities/time/time.hooks';

/** Aba "Pessoas do Time" — reaproveita a lista genérica de Pessoas, escopada ao projeto
 *  e filtrada (fixedQuery) pelo Time atual. Recebe scopeId = id do Time (vindo do
 *  EntityDetailPage do Time via bespokeComponents), e o projetoId vem da própria rota. */
export function PessoasDoTimeTabPanel({ scopeId: timeId }: { scopeId: string }) {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();
  const { data: timesData } = timeHooks.useList({ page: 1, pageSize: 100 }, projetoId);
  const times = timesData?.data.map((t) => ({ value: t.id, label: t.nome })) ?? [];

  if (!projetoId) return null;

  return (
    <EntityListPage
      config={PESSOA_CONFIG}
      hooks={pessoaHooks}
      scopeId={projetoId}
      embedded
      fixedQuery={{ timeId }}
      extraOptions={{ times }}
      onOpenDetail={(pessoaId) => navigate(`/projetos/${projetoId}/pessoas/${pessoaId}`)}
    />
  );
}
