import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch, type DefaultValues, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  EmptyState,
  FORM_GRID_PAGE,
  FormGrid,
  FormGridItem,
  Icon,
  PageActions,
  SectionCard,
  Stepper,
  Toast,
  type FormGridSpan,
  type StepperStep,
} from '@/design-system';
import { EntityFormField } from '@/entities/crud/EntityFormFields';
import { buildZodSchema } from '@/entities/crud/formSchema';
import { getErrorMessage } from '@/entities/crud/shared';
import { PROJETO_CONFIG } from '@/entities/projeto/projeto.config';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import type { Projeto } from '@/entities/projeto/projeto.types';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

type ProjectFormMode = 'create' | 'edit';
type ToastState = { type: 'error'; title: string; message: string } | null;

const CREATE_DEFAULTS: Partial<Projeto> = { status: 'Planejamento', idiomas: ['Português'] };
const SPANS: Record<string, FormGridSpan> = {
  nome: 6,
  codigo: 3,
  status: 3,
  descricao: 6,
  objetivo: 6,
  areaNegocio: 4,
  idiomas: 8,
  dataInicio: 4,
  responsavelPrincipal: 8,
  jiraRef: 6,
  confluenceRef: 6,
  observacoes: 'full',
};
const COMPLETION_FIELDS = [
  ['nome', 'Nome do projeto'],
  ['codigo', 'Código'],
  ['objetivo', 'Objetivo'],
  ['areaNegocio', 'Área de negócio'],
  ['responsavelPrincipal', 'Responsável principal'],
  ['idiomas', 'Idiomas'],
  ['confluenceRef', 'Fonte de referência'],
] as const;

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null;
}

function ProjectStepIndicator() {
  const steps: StepperStep[] = [
    { key: 'projeto', label: 'Projeto', icon: 'folder', state: 'current' },
    { key: 'time', label: 'Time', icon: 'users', state: 'upcoming' },
    { key: 'pessoas', label: 'Pessoas', icon: 'user', state: 'upcoming' },
    { key: 'produtos', label: 'Produtos', icon: 'box', state: 'upcoming' },
    { key: 'regras', label: 'Regras', icon: 'clipboardCheck', state: 'upcoming' },
    { key: 'documentos', label: 'Documentos', icon: 'folder', state: 'upcoming' },
    { key: 'agentes', label: 'Agentes', icon: 'zap', state: 'upcoming' },
  ];
  return <div className="setup-stepper-shell"><Stepper steps={steps} /></div>;
}

function ProjectFormRail({ values, mode, id }: { values: FieldValues; mode: ProjectFormMode; id?: string }) {
  const completed = COMPLETION_FIELDS.filter(([key]) => hasValue(values[key])).length;
  const percentage = Math.round((completed / COMPLETION_FIELDS.length) * 100);
  const historyQuery = projetoHooks.useHistorico(mode === 'edit' ? id : undefined, 1, 4);
  const history = historyQuery.data?.data ?? [];

  return (
    <div className="project-form-rail">
      <SectionCard title={mode === 'create' ? 'Resumo do cadastro' : 'Qualidade do contexto'} subtitle="Completude dos dados essenciais" icon="clipboardCheck" padding="compact">
        <div className="project-form-progress">
          <div><strong>{percentage}%</strong><span>{completed} de {COMPLETION_FIELDS.length} itens essenciais</span></div>
          <div className="project-form-progress__track"><span style={{ width: `${percentage}%` }} /></div>
        </div>
        <div className="project-form-checklist">
          {COMPLETION_FIELDS.map(([key, label]) => {
            const done = hasValue(values[key]);
            return <div key={key} className={done ? 'is-done' : ''}><Icon name={done ? 'check' : 'clock'} size={13} /><span>{label}</span></div>;
          })}
        </div>
      </SectionCard>

      <SectionCard title="Princípio de cadastro" subtitle="Projeto é contexto, não uma ilha" icon="network" padding="compact">
        <ul className="project-form-guidance">
          <li>Descreva o objetivo de forma que qualquer time entenda por que o projeto existe.</li>
          <li>Defina claramente o responsável e uma fonte oficial de referência.</li>
          <li>Relacionamentos entre projetos, produtos e integrações serão tratados como conhecimento compartilhado, sem duplicar informação.</li>
        </ul>
      </SectionCard>

      {mode === 'edit' && (
        <SectionCard title="Histórico recente" subtitle="Últimas alterações registradas" icon="clock" padding="compact">
          {historyQuery.isLoading ? <span className="dbc-text-2">Carregando histórico...</span> : history.length ? (
            <div className="project-form-history">
              {history.map((entry, index) => (
                <div key={`${entry.ts}-${index}`}><span /><div><strong>{entry.label}</strong><small>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.ts))}</small></div></div>
              ))}
            </div>
          ) : <span className="dbc-text-3">Nenhuma alteração registrada ainda.</span>}
        </SectionCard>
      )}
    </div>
  );
}

function sanitizeProjectDto(data: FieldValues): Partial<Projeto> {
  const allowed = ['nome', 'codigo', 'status', 'descricao', 'objetivo', 'areaNegocio', 'idiomas', 'dataInicio', 'responsavelPrincipal', 'confluenceRef', 'observacoes'];
  return Object.fromEntries(allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]])) as Partial<Projeto>;
}

export function ProjetoFormPage({ mode }: { mode: ProjectFormMode }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = mode === 'edit';
  const detailQuery = projetoHooks.useDetail(isEdit ? id : undefined);
  const createMutation = projetoHooks.useCreate();
  const updateMutation = projetoHooks.useUpdate();
  const toggleMutation = projetoHooks.useToggleStatus();
  const schema = useMemo(() => buildZodSchema(PROJETO_CONFIG.form.sections), []);
  const { control, handleSubmit, reset } = useForm<FieldValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: CREATE_DEFAULTS as DefaultValues<FieldValues>,
  });
  const values = useWatch({ control }) as FieldValues;

  useEffect(() => {
    if (isEdit && detailQuery.data) reset(detailQuery.data as unknown as DefaultValues<FieldValues>);
    if (!isEdit) reset(CREATE_DEFAULTS as DefaultValues<FieldValues>);
  }, [detailQuery.data, isEdit, reset]);

  if (isEdit && detailQuery.isLoading) return <div className="main-pad"><span className="dbc-text-2">Carregando projeto...</span></div>;
  if (isEdit && !detailQuery.data) return <div className="main-pad"><EmptyState title="Projeto não encontrado" message="O registro pode ter sido removido ou não estar disponível." actionLabel="Voltar para projetos" onAction={() => navigate('/projetos')} /></div>;

  const item = detailQuery.data;
  const saving = createMutation.isPending || updateMutation.isPending;

  function submit(data: FieldValues, forcePlanning = false) {
    const dto = sanitizeProjectDto(data);
    if (forcePlanning) dto.status = 'Planejamento';
    if (isEdit && item) {
      updateMutation.mutate({ id: item.id, dto }, { onSuccess: () => navigate(`/projetos/${item.id}`) });
    } else {
      createMutation.mutate(dto, { onSuccess: (created) => navigate(`/projetos/${created.id}`) });
    }
  }

  const mutationError = createMutation.error ?? updateMutation.error ?? toggleMutation.error;
  const toast: ToastState = mutationError ? { type: 'error', title: 'Não foi possível salvar o projeto', message: getErrorMessage(mutationError) } : null;

  return (
    <SetupPage
      stepper={<ProjectStepIndicator />}
      header={
        <SetupPageHeader
          breadcrumb={['Setup', 'Projetos', isEdit ? item?.nome ?? 'Editar' : 'Novo']}
          title={isEdit ? 'Editar Projeto' : 'Novo Projeto'}
          subtitle={isEdit ? 'Atualize o contexto do projeto sem perder rastreabilidade e origem do conhecimento.' : 'Crie o contexto que organizará times, produtos, regras e relacionamentos do ecossistema.'}
          back={{ label: 'Voltar para projetos', onClick: () => navigate('/projetos') }}
          badges={isEdit && item ? <Badge kind="status" preset={item.status === 'Ativo' ? 'ativo' : item.status === 'Inativo' ? 'inativo' : 'pendente'}>{item.status}</Badge> : undefined}
        />
      }
      rail={<ProjectFormRail values={values ?? {}} mode={mode} id={id} />}
    >
      <form className="project-form-page" onSubmit={handleSubmit((data) => submit(data))}>
        {PROJETO_CONFIG.form.sections.map((section, index) => (
          <SectionCard key={section.title} title={section.title} subtitle={index === 0 ? 'Campos marcados com * são obrigatórios.' : undefined} icon={index === 0 ? 'folder' : index === 1 ? 'info' : index === 2 ? 'network' : 'clipboardCheck'}>
            <FormGrid columns={FORM_GRID_PAGE}>
              {section.fields.map((field) => (
                <FormGridItem key={String(field.key)} span={SPANS[String(field.key)] ?? 6}>
                  <EntityFormField field={field as never} control={control} />
                </FormGridItem>
              ))}
            </FormGrid>
          </SectionCard>
        ))}

        <PageActions sticky>
          <Button variant="default" size="lg" onClick={() => navigate(isEdit && item ? `/projetos/${item.id}` : '/projetos')}>Cancelar</Button>
          {!isEdit && <Button variant="default" size="lg" loading={saving} onClick={handleSubmit((data) => submit(data, true))}>Salvar como planejamento</Button>}
          {isEdit && item?.status === 'Ativo' && <Button variant="danger" size="lg" loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate(item.id, { onSuccess: () => navigate('/projetos') })}>Inativar projeto</Button>}
          {isEdit && item?.status === 'Inativo' && <Button variant="default" size="lg" loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate(item.id, { onSuccess: () => navigate(`/projetos/${item.id}`) })}>Ativar projeto</Button>}
          <Button variant="primary" size="lg" loading={saving} onClick={handleSubmit((data) => submit(data))}>{isEdit ? 'Salvar alterações' : 'Criar projeto'}</Button>
        </PageActions>
      </form>

      {toast && <Toast open type="error" title={toast.title} message={toast.message} onClose={() => { createMutation.reset(); updateMutation.reset(); toggleMutation.reset(); }} />}
    </SetupPage>
  );
}
