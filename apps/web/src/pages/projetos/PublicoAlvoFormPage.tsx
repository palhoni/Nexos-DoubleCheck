import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch, type DefaultValues, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge, Button, EmptyState, FORM_GRID_PAGE, FormGrid, FormGridItem, Icon, PageActions, SectionCard, Toast, type FormGridSpan } from '@/design-system';
import { EntityFormField } from '@/entities/crud/EntityFormFields';
import { buildZodSchema } from '@/entities/crud/formSchema';
import { getErrorMessage } from '@/entities/crud/shared';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { PUBLICO_ALVO_CONFIG } from '@/entities/publico-alvo/publico-alvo.config';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { publicoAlvoHooks } from '@/entities/publico-alvo/publico-alvo.hooks';
import type { PublicoAlvo } from '@/entities/publico-alvo/publico-alvo.types';
import { timeHooks } from '@/entities/time/time.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';
import { ProductWorkspaceHeader, type ProductWorkspaceTabKey } from './ProductWorkspaceHeader';

type Mode = 'create' | 'edit';

const DEFAULTS: Partial<PublicoAlvo> = { status: 'Ativo', canaisUtilizados: [], paisesOndeSeAplica: [] };
const SPANS: Record<string, FormGridSpan> = {
  nome: 8,
  status: 4,
  tipoUsuario: 4,
  frequenciaUso: 4,
  perfil: 8,
  descricao: 'full',
  canaisUtilizados: 6,
  paisesOndeSeAplica: 6,
  observacoes: 'full',
};
const COMPLETION = [
  ['nome', 'Nome do público'],
  ['tipoUsuario', 'Tipo de usuário'],
  ['perfil', 'Perfil'],
  ['descricao', 'Descrição'],
  ['frequenciaUso', 'Frequência de uso'],
  ['canaisUtilizados', 'Canais utilizados'],
  ['paisesOndeSeAplica', 'Países'],
] as const;

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null;
}

export function PublicoAlvoFormPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const { projetoId, produtoId, publicoAlvoId } = useParams<{ projetoId: string; produtoId: string; publicoAlvoId: string }>();
  const edit = mode === 'edit';
  const produtoQuery = produtoHooks.useDetail(produtoId, projetoId);
  const publicoQuery = publicoAlvoHooks.useDetail(edit ? publicoAlvoId : undefined, produtoId);
  const projetoQuery = projetoHooks.useDetail(projetoId);
  const timesQuery = timeHooks.useList({ page: 1, pageSize: 100 }, projetoId);
  const createMutation = publicoAlvoHooks.useCreate(produtoId);
  const updateMutation = publicoAlvoHooks.useUpdate(produtoId);
  const toggleMutation = publicoAlvoHooks.useToggleStatus(produtoId);
  const historyQuery = publicoAlvoHooks.useHistorico(edit ? publicoAlvoId : undefined, 1, 4, produtoId);

  const schema = useMemo(() => buildZodSchema(PUBLICO_ALVO_CONFIG.form.sections), []);
  const { control, handleSubmit, reset, formState } = useForm<FieldValues>({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: DEFAULTS as DefaultValues<FieldValues> });
  const values = useWatch({ control }) as FieldValues;

  useEffect(() => {
    if (edit && publicoQuery.data) reset(publicoQuery.data as unknown as DefaultValues<FieldValues>);
    if (!edit) reset(DEFAULTS as DefaultValues<FieldValues>);
  }, [edit, publicoQuery.data, reset]);

  const countryScope = useMemo(() => {
    const saved = edit ? (publicoQuery.data?.paisesOndeSeAplica ?? []) : [];
    const productCountries = produtoQuery.data?.paises ?? [];
    const projectCountries = projetoQuery.data?.paisesDisponiveis ?? [];
    return Array.from(new Set([...(productCountries.length ? productCountries : projectCountries), ...saved]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((country) => ({ value: country, label: country }));
  }, [edit, publicoQuery.data?.paisesOndeSeAplica, produtoQuery.data?.paises, projetoQuery.data?.paisesDisponiveis]);

  if (!projetoId || !produtoId) return null;
  if (produtoQuery.isLoading || (edit && publicoQuery.isLoading)) return <div className="main-pad"><span className="dbc-text-2">Carregando formulário...</span></div>;
  const produto = produtoQuery.data;
  const item = publicoQuery.data;
  if (!produto || (edit && !item)) return <div className="main-pad"><EmptyState title={edit ? 'Público não encontrado' : 'Produto não encontrado'} actionLabel="Voltar" onAction={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}?tab=publicoAlvo`)} /></div>;

  const timeName = (timesQuery.data?.data ?? []).find((x) => x.id === produto.timeResponsavelId)?.nome;
  const countryScopeSource = produto.paises.length ? 'produto' : projetoQuery.data?.paisesDisponiveis?.length ? 'projeto' : 'vazio';
  const completed = COMPLETION.filter(([key]) => hasValue(values?.[key])).length;
  const percentage = Math.round((completed / COMPLETION.length) * 100);
  const history = historyQuery.data?.data ?? [];
  const back = () => navigate(edit && item ? `/projetos/${projetoId}/produtos/${produtoId}/publico-alvo/${item.id}` : `/projetos/${projetoId}/produtos/${produtoId}?tab=publicoAlvo`);
  const navigateTab = (tab: ProductWorkspaceTabKey) => navigate(`/projetos/${projetoId}/produtos/${produtoId}${tab === 'overview' ? '' : `?tab=${tab}`}`);

  function submit(data: FieldValues) {
    const dto = data as Partial<PublicoAlvo>;
    if (edit && item) updateMutation.mutate({ id: item.id, dto }, { onSuccess: () => navigate(`/projetos/${projetoId}/produtos/${produtoId}/publico-alvo/${item.id}`) });
    else createMutation.mutate(dto, { onSuccess: (created) => navigate(`/projetos/${projetoId}/produtos/${produtoId}/publico-alvo/${created.id}`) });
  }

  const error = createMutation.error ?? updateMutation.error ?? toggleMutation.error;
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <SetupPage
      header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', 'Produtos', produto.nome, 'Público-alvo']} title={edit ? 'Editar Público' : 'Novo Público'} subtitle={edit ? 'Atualize o perfil sem perder o contexto de uso já documentado.' : 'Cadastre um público para organizar necessidades, dores, objetivos e contexto de uso.'} back={{ label: edit ? 'Voltar ao público' : 'Voltar para públicos', onClick: back }} badges={edit && item ? <Badge kind="status" preset={item.status === 'Ativo' ? 'ativo' : 'inativo'}>{item.status}</Badge> : undefined} />}
      afterStepper={<ProductWorkspaceHeader item={produto} timeName={timeName} activeTab="publicoAlvo" onTabChange={navigateTab} />}
      rail={<div className="audience-form-rail">
        <SectionCard title={edit ? 'Resumo atual' : 'Resumo do cadastro'} subtitle="Completude dos dados de perfil" icon="clipboardCheck" padding="compact">
          <div className="audience-form-progress"><div><strong>{percentage}%</strong><span>{completed} de {COMPLETION.length} itens de contexto</span></div><div><span style={{ width: `${percentage}%` }} /></div></div>
          <div className="audience-form-checklist">{COMPLETION.map(([key, label]) => { const done = hasValue(values?.[key]); return <div key={key} className={done ? 'is-done' : ''}><span><Icon name={done ? 'check' : 'clock'} size={12} /></span><span>{label}</span></div>; })}</div>
        </SectionCard>
        <SectionCard title="Contexto de aplicação" icon="box" padding="compact"><div className="audience-scope-note"><strong>{countryScopeSource === 'produto' ? 'Escopo do Produto' : countryScopeSource === 'projeto' ? 'Escopo do Projeto' : 'Escopo ainda não definido'}</strong><p>{countryScopeSource === 'produto' ? `Os países disponíveis para este público vêm dos ${produto.paises.length} países documentados no Produto.` : countryScopeSource === 'projeto' ? 'O Produto ainda não possui países próprios; por isso o cadastro usa temporariamente os países disponíveis no Projeto.' : 'Cadastre países no Produto ou no Projeto antes de definir o alcance geográfico deste público.'}</p></div></SectionCard>
        <SectionCard title="Próximo passo" icon="info" padding="compact"><p className="audience-form-guidance">Depois de criar o público, abra o detalhe para documentar <strong>necessidades, dores e objetivos</strong>. Esses itens possuem endpoints próprios e não fazem parte do POST/PATCH principal.</p></SectionCard>
        {edit && <SectionCard title="Histórico recente" icon="clock" padding="compact">{historyQuery.isLoading ? <span className="dbc-text-2">Carregando...</span> : history.length ? <div className="audience-history">{history.map((entry, i) => <div key={`${entry.ts}-${i}`}><span /><div><strong>{entry.label}</strong><small>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.ts))}</small></div></div>)}</div> : <span className="dbc-text-3">Nenhuma alteração registrada.</span>}</SectionCard>}
      </div>}
    >
      <form className="audience-form-page" onSubmit={handleSubmit(submit)}>
        {PUBLICO_ALVO_CONFIG.form.sections.map((section, index) => (
          <SectionCard key={section.title} title={section.title} subtitle={index === 0 ? 'Campos marcados com * são obrigatórios.' : undefined} icon={index === 0 ? 'users' : index === 1 ? 'user' : 'info'}>
            <FormGrid columns={FORM_GRID_PAGE} rowGap={20}>
              {section.fields.map((field) => <FormGridItem key={field.key} span={{ base: 'full', sm: SPANS[field.key] ?? 'full' }}><EntityFormField field={field} control={control} error={formState.errors[field.key]?.message as string | undefined} extraOptions={{ countryScope }} /></FormGridItem>)}
            </FormGrid>
          </SectionCard>
        ))}
        <PageActions sticky>
          <Button variant="default" size="lg" onClick={back} disabled={saving}>Cancelar</Button>
          {edit && item?.status === 'Ativo' && <Button variant="danger" size="lg" loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate(item.id, { onSuccess: back })}>Inativar público</Button>}
          {edit && item?.status === 'Inativo' && <Button variant="default" size="lg" loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate(item.id, { onSuccess: back })}>Ativar público</Button>}
          <Button variant="primary" size="lg" loading={saving} onClick={handleSubmit(submit)}>{edit ? 'Salvar alterações' : 'Criar público'}</Button>
        </PageActions>
      </form>
      {error && <Toast open type="error" title="Não foi possível salvar o público" message={getErrorMessage(error)} onClose={() => { createMutation.reset(); updateMutation.reset(); toggleMutation.reset(); }} />}
    </SetupPage>
  );
}
