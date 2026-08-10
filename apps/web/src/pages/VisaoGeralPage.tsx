import { useNavigate } from 'react-router-dom';
import { FormGrid, FormGridItem, Icon, MetricCard, ProgressRow, SectionCard } from '@/design-system';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { AREAS_NEGOCIO_LIST, STATUS_PROJETO_LIST } from '@/entities/projeto/projeto.types';
import { useDashboardResumo } from '@/entities/dashboard/dashboard.api';

export function VisaoGeralPage() {
  const navigate = useNavigate();
  const { data } = projetoHooks.useList({ page: 1, pageSize: 100 });
  const { data: resumo } = useDashboardResumo();
  const projetos = data?.data ?? [];
  const total = projetos.length;

  const porStatus = STATUS_PROJETO_LIST.map((status) => ({ label: status, value: projetos.filter((projeto) => projeto.status === status).length }));
  const porArea = AREAS_NEGOCIO_LIST.map((area) => ({ label: area, value: projetos.filter((projeto) => projeto.areaNegocio === area).length })).filter((item) => item.value > 0);

  const readiness = [
    { label: 'Produtos', value: resumo?.prontidao.produtos ?? 0 },
    { label: 'Regras', value: resumo?.prontidao.regras ?? 0 },
    { label: 'Integrações', value: resumo?.prontidao.integracoes ?? 0 },
    { label: 'Documentos', value: resumo?.prontidao.documentos ?? 0 },
  ];

  return (
    <div className="main-pad renault-overview-page">
      <SetupPageHeader
        breadcrumb={['Setup', 'Visão Geral']}
        title="Visão Geral do Setup"
        subtitle="Acompanhe a cobertura do ecossistema e identifique onde a base de conhecimento ainda precisa evoluir."
        back={{ label: 'Voltar para Home', onClick: () => navigate('/') }}
      />

      <FormGrid columns={{ base: 1, sm: 2, md: 4 }} gap={12}>
        <FormGridItem>
          <MetricCard label="Projetos" value={resumo?.projetos.total ?? total} icon={<Icon name="folder" size={20} />} legend={[{ label: 'Ativos', value: resumo?.projetos.ativos ?? 0, dotColor: '#31a64a' }]} onClick={() => navigate('/projetos')} minWidth={0} />
        </FormGridItem>
        <FormGridItem>
          <MetricCard label="Times" value={resumo?.times.total ?? 0} icon={<Icon name="users" size={20} />} legend={[{ label: 'Ativos', value: resumo?.times.ativos ?? 0, dotColor: '#31a64a' }]} onClick={() => navigate('/projetos')} minWidth={0} />
        </FormGridItem>
        <FormGridItem>
          <MetricCard label="Pessoas" value={resumo?.pessoas.total ?? 0} icon={<Icon name="user" size={20} />} legend={[{ label: 'Ativas', value: resumo?.pessoas.ativos ?? 0, dotColor: '#31a64a' }]} onClick={() => navigate('/projetos')} minWidth={0} />
        </FormGridItem>
        <FormGridItem>
          <MetricCard label="Produtos" value={resumo?.produtos.total ?? 0} icon={<Icon name="box" size={20} />} legend={[{ label: 'Ativos', value: resumo?.produtos.ativos ?? 0, dotColor: '#31a64a' }]} onClick={() => navigate('/projetos')} minWidth={0} />
        </FormGridItem>
      </FormGrid>

      <FormGrid columns={2} gap={14}>
        <FormGridItem>
          <SectionCard title="Projetos por status" subtitle="Distribuição atual do portfólio" icon="chart">
            <div className="renault-overview-bars">
              {porStatus.map((item) => (
                <ProgressRow key={item.label} label={item.label} percent={total ? (item.value / total) * 100 : 0} valueLabel={item.value} color="#ffcc00" />
              ))}
            </div>
          </SectionCard>
        </FormGridItem>

        <FormGridItem>
          <SectionCard title="Projetos por área de negócio" subtitle="Onde o conhecimento está concentrado" icon="folder">
            <div className="renault-overview-bars">
              {porArea.length === 0 ? (
                <span className="dbc-text-2" style={{ fontSize: 13 }}>Nenhum projeto cadastrado ainda.</span>
              ) : (
                porArea.map((item) => <ProgressRow key={item.label} label={item.label} percent={total ? (item.value / total) * 100 : 0} valueLabel={item.value} color="#ffcc00" />)
              )}
            </div>
          </SectionCard>
        </FormGridItem>
      </FormGrid>

      <SectionCard title="Prontidão da base" subtitle="Cobertura mínima necessária para uma base confiável" icon="clipboardCheck">
        <div className="renault-overview-readiness">
          {readiness.map((item) => <ProgressRow key={item.label} label={item.label} percent={item.value} valueLabel={`${item.value}%`} color="#ffcc00" labelWidth={120} />)}
        </div>
      </SectionCard>
    </div>
  );
}
