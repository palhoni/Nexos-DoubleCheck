import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTableCard,
  EmptyState,
  MetricCard,
  RightRail,
  SectionCard,
  type DataTableColumn,
} from '@/design-system';
import { useGovernanceSummary } from '@/entities/governanca/governanca.api';
import type { GovernanceIssue, GovernanceProjectSummary, GovernanceSeverity } from '@/entities/governanca/governanca.types';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const SEVERITY_LABEL: Record<GovernanceSeverity, string> = {
  critical: 'Crítico',
  warning: 'Atenção',
  info: 'Informativo',
};

const CATEGORY_LABEL: Record<string, string> = {
  evidence: 'Evidência',
  ownership: 'Responsabilidade',
  freshness: 'Atualidade',
  publication: 'Publicação',
  consistency: 'Consistência',
};

function scoreTone(score: number) {
  if (score >= 85) return 'ativo' as const;
  if (score >= 65) return 'pendente' as const;
  return 'erro' as const;
}

function severityTone(severity: GovernanceSeverity) {
  if (severity === 'critical') return 'erro' as const;
  if (severity === 'warning') return 'pendente' as const;
  return 'info' as const;
}

function CoverageBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="governance-coverage">
      <div className="governance-coverage__header">
        <div>
          <div className="governance-coverage__label">{label}</div>
          <div className="governance-coverage__detail">{detail}</div>
        </div>
        <strong>{value}%</strong>
      </div>
      <div className="governance-coverage__track" aria-label={`${label}: ${value}%`}>
        <span className="governance-coverage__value" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function GovernancaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('projeto');
  const [severity, setSeverity] = useState<'all' | GovernanceSeverity>('all');
  const [category, setCategory] = useState('all');
  const { data: projectsData } = projetoHooks.useList({ page: 1, pageSize: 100 });
  const projects = projectsData?.data ?? [];
  const { data, isLoading, isError, refetch } = useGovernanceSummary(selectedProjectId);

  const issues = useMemo(() => {
    const list = data?.issues ?? [];
    return list.filter((issue) => (severity === 'all' || issue.severity === severity) && (category === 'all' || issue.category === category));
  }, [data?.issues, severity, category]);

  const projectColumns: DataTableColumn<GovernanceProjectSummary>[] = [
    {
      key: 'project',
      header: 'Projeto',
      render: (project) => (
        <div className="governance-project-cell">
          <strong>{project.nome}</strong>
          <span>{project.codigo}</span>
        </div>
      ),
    },
    { key: 'score', header: 'Qualidade', width: 120, render: (project) => <Badge preset={scoreTone(project.score)}>{project.score}%</Badge> },
    { key: 'issues', header: 'Pendências', width: 110, render: (project) => project.issues },
    { key: 'critical', header: 'Críticas', width: 90, render: (project) => project.criticalIssues || '—' },
    { key: 'evidence', header: 'Sem evidência', width: 120, render: (project) => project.withoutEvidence || '—' },
    { key: 'external', header: 'Cross-project', width: 120, render: (project) => project.externalDependencies || '—' },
  ];

  const issueColumns: DataTableColumn<GovernanceIssue>[] = [
    { key: 'severity', header: 'Severidade', width: 110, render: (issue) => <Badge preset={severityTone(issue.severity)}>{SEVERITY_LABEL[issue.severity]}</Badge> },
    { key: 'category', header: 'Categoria', width: 135, render: (issue) => CATEGORY_LABEL[issue.category] ?? issue.category },
    {
      key: 'issue',
      header: 'Pendência',
      render: (issue) => (
        <div className="governance-issue-cell">
          <strong>{issue.title}</strong>
          <span>{issue.description}</span>
        </div>
      ),
    },
    { key: 'entity', header: 'Entidade', width: 130, render: (issue) => issue.entityType },
  ];

  const rail = data ? (
    <RightRail>
      <SectionCard title="Leitura do indicador">
        <div className="governance-score-card">
          <div className={`governance-score governance-score--${data.summary.overallScore >= 85 ? 'good' : data.summary.overallScore >= 65 ? 'attention' : 'risk'}`}>
            {data.summary.overallScore}%
          </div>
          <div>
            <strong>Qualidade estrutural da base</strong>
            <p>Composição objetiva de evidência, responsabilidade, atualização de fontes e publicação de documentos.</p>
          </div>
        </div>
        <Alert type="info">Este índice não é “maturidade de IA”. Ele mede apenas condições verificáveis da base atual.</Alert>
      </SectionCard>

      <SectionCard title="Dependências externas">
        <div className="governance-rail-stat">
          <strong>{data.summary.externalDependencies}</strong>
          <span>relações cross-project documentadas</span>
        </div>
        <Button variant="secondary" block onClick={() => navigate('/conhecimento')}>Abrir mapa do conhecimento</Button>
      </SectionCard>

      <SectionCard title="Princípio de governança">
        <p className="governance-principle">O Nexus deve evidenciar lacunas e inconsistências; não deve “corrigir” conhecimento silenciosamente. A decisão e a validação continuam humanas.</p>
      </SectionCard>
    </RightRail>
  ) : undefined;

  return (
    <SetupPage
      stepper={false}
      header={(
        <SetupPageHeader
          title="Governança do Conhecimento"
          subtitle="Acompanhe qualidade, evidências, responsabilidades, atualização e publicação da base que sustenta o ecossistema Nexus."
          actions={<Button variant="secondary" onClick={() => refetch()}>Atualizar análise</Button>}
        />
      )}
      rail={rail}
    >
      <div className="governance-page">
        <SectionCard>
          <div className="governance-scopebar">
            <div>
              <strong>Escopo da análise</strong>
              <span>{selectedProjectId ? 'Visualizando somente um Projeto e seu conhecimento.' : 'Visualizando o ecossistema corporativo completo.'}</span>
            </div>
            <label>
              <span>Projeto</span>
              <select
                value={selectedProjectId ?? ''}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value) next.set('projeto', event.target.value);
                  else next.delete('projeto');
                  setSearchParams(next);
                }}
              >
                <option value="">Todos os projetos</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.nome}</option>)}
              </select>
            </label>
          </div>
        </SectionCard>

        {isError && <Alert type="error">Não foi possível carregar a análise de governança.</Alert>}

        <div className="governance-metrics">
          <MetricCard label="Qualidade estrutural" value={isLoading ? '…' : `${data?.summary.overallScore ?? 0}%`} hint="4 dimensões objetivas" />
          <MetricCard label="Entidades avaliadas" value={isLoading ? '…' : data?.summary.knowledgeEntities ?? 0} hint="conhecimento estruturado" />
          <MetricCard label="Pendências críticas" value={isLoading ? '…' : data?.summary.criticalIssues ?? 0} hint="exigem atenção" />
          <MetricCard label="Cross-project" value={isLoading ? '…' : data?.summary.externalDependencies ?? 0} hint="dependências documentadas" />
        </div>

        {data && (
          <SectionCard title="Cobertura da base" subtitle="Indicadores calculados somente sobre dados efetivamente cadastrados.">
            <div className="governance-coverage-grid">
              <CoverageBar label="Evidências" value={data.coverage.evidence.percent} detail={`${data.coverage.evidence.ok} de ${data.coverage.evidence.total} entidades com Fonte/Documento`} />
              <CoverageBar label="Responsabilidade" value={data.coverage.ownership.percent} detail={`${data.coverage.ownership.ok} de ${data.coverage.ownership.total} entidades com responsável`} />
              <CoverageBar label="Atualidade das fontes" value={data.coverage.sources.percent} detail={`${data.coverage.sources.ok} de ${data.coverage.sources.total} fontes ativas verificadas nos últimos 90 dias`} />
              <CoverageBar label="Documentos publicados" value={data.coverage.documents.percent} detail={`${data.coverage.documents.ok} de ${data.coverage.documents.total} documentos não arquivados publicados`} />
            </div>
          </SectionCard>
        )}

        {!selectedProjectId && data && (
          <DataTableCard
            title="Qualidade por Projeto"
            subtitle="Ordenado pelos Projetos que mais precisam de atenção estrutural."
            columns={projectColumns}
            data={data.projects}
            rowKey={(project) => project.id}
            onRowClick={(project) => {
              const next = new URLSearchParams(searchParams);
              next.set('projeto', project.id);
              setSearchParams(next);
            }}
            empty={<EmptyState title="Nenhum Projeto encontrado" description="Cadastre Projetos para iniciar a análise de governança." />}
          />
        )}

        <SectionCard title="Pendências objetivas" subtitle="A lista aponta lacunas verificáveis; nenhuma alteração é executada automaticamente.">
          <div className="governance-filters">
            <label>
              <span>Severidade</span>
              <select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}>
                <option value="all">Todas</option>
                <option value="critical">Críticas</option>
                <option value="warning">Atenção</option>
                <option value="info">Informativas</option>
              </select>
            </label>
            <label>
              <span>Categoria</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">Todas</option>
                <option value="evidence">Evidência</option>
                <option value="ownership">Responsabilidade</option>
                <option value="freshness">Atualidade</option>
                <option value="publication">Publicação</option>
                <option value="consistency">Consistência</option>
              </select>
            </label>
            <span className="governance-filter-count">{issues.length} pendência(s)</span>
          </div>
          <DataTableCard
            columns={issueColumns}
            data={issues}
            rowKey={(issue) => issue.id}
            onRowClick={(issue) => navigate(issue.route)}
            empty={<EmptyState title="Nenhuma pendência neste filtro" description="A base não possui lacunas desse tipo no escopo selecionado." />}
          />
        </SectionCard>
      </div>
    </SetupPage>
  );
}
