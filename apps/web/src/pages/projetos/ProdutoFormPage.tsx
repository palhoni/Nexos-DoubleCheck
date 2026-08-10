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
  type FormGridSpan,
  Icon,
  PageActions,
  SectionCard,
  Toast,
} from '@/design-system';
import { EntityFormField } from '@/entities/crud/EntityFormFields';
import { buildZodSchema } from '@/entities/crud/formSchema';
import { getErrorMessage } from '@/entities/crud/shared';
import { PRODUTO_CONFIG } from '@/entities/produto/produto.config';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import type { Produto } from '@/entities/produto/produto.types';
import { timeHooks } from '@/entities/time/time.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const SUPPORT_PAGE_SIZE = 100;

type ProductFormMode = 'create' | 'edit';
type ToastState = { type: 'success' | 'error'; title: string; message: string } | null;

const CREATE_DEFAULTS: Partial<Produto> = {
  status: 'Planejamento',
  areasBeneficiadas: [],
  ambientes: [],
  estabilidadeStatus: 'Em Desenvolvimento',
};

const PAGE_SPANS: Record<string, FormGridSpan> = {
  nome: 5,
  nomeCurto: 3,
  codigo: 2,
  status: 2,
  descricao: 6,
  objetivo: 6,
  problemaResolve: 6,
  usuariosPrincipais: 6,
  areaNegocio: 4,
  areasBeneficiadas: 8,
  timeResponsavelId: 6,
  responsavelPrincipal: 6,
  ambientes: 'full',
  estabilidadeStatus: 4,
  estabilidadeObservacao: 8,
  observacoes: 'full',
};

const COMPLETION_FIELDS = [
  { key: 'nome', label: 'Nome do produto' },
  { key: 'codigo', label: 'Código' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'objetivo', label: 'Objetivo' },
  { key: 'areaNegocio', label: 'Área de negócio' },
  { key: 'timeResponsavelId', label: 'Time responsável' },
  { key: 'ambientes', label: 'Ambientes' },
  { key: 'responsavelPrincipal', label: 'Responsável principal' },
] as const;

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null;
}

function ProductFormRail({ values, mode, produtoId, projetoId }: { values: FieldValues; mode: ProductFormMode; produtoId?: string; projetoId: string }) {
  const completed = COMPLETION_FIELDS.filter((field) => hasValue(values[field.key])).length;
  const percentage = Math.round((completed / COMPLETION_FIELDS.length) * 100);
  const missing = COMPLETION_FIELDS.filter((field) => !hasValue(values[field.key]));
  const historyQuery = produtoHooks.useHistorico(mode === 'edit' ? produtoId : undefined, 1, 4, projetoId);
  const history = historyQuery.data?.data ?? [];

  return (
    <div className="product-form-rail">
      <SectionCard title={mode === 'create' ? 'Resumo do cadastro' : 'Resumo atual'} subtitle="Completude dos dados essenciais" icon="clipboardCheck" padding="compact">
        <div className="product-form-progress">
          <div className="product-form-progress__head">
            <strong>{percentage}%</strong>
            <span>{completed} de {COMPLETION_FIELDS.length} itens essenciais</span>
          </div>
          <div className="product-form-progress__track" aria-label={`Completude do cadastro: ${percentage}%`}>
            <span style={{ width: `${percentage}%` }} />
          </div>
        </div>
        <div className="product-form-checklist">
          {COMPLETION_FIELDS.map((field) => {
            const done = hasValue(values[field.key]);
            return (
              <div key={field.key} className={`product-form-checklist__item${done ? ' is-done' : ''}`}>
                <span><Icon name={done ? 'check' : 'clock'} size={13} /></span>
                <span>{field.label}</span>
              </div>
            );
          })}
        </div>
        {missing.length > 0 && (
          <div className="product-form-rail__note">
            <Icon name="info" size={14} />
            <span>Próximo foco recomendado: {missing.slice(0, 2).map((item) => item.label).join(' e ')}.</span>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Boas práticas" subtitle="Para um cadastro fácil de manter" icon="info" padding="compact">
        <ul className="product-form-guidance">
          <li>Use um nome e código que identifiquem o produto sem depender de contexto externo.</li>
          <li>Descreva objetivo e problema de forma objetiva, evitando repetir a mesma informação.</li>
          <li>Defina o time responsável e os ambientes para facilitar a governança do conhecimento.</li>
        </ul>
      </SectionCard>

      {mode === 'edit' && (
        <SectionCard title="Histórico recente" subtitle="Últimas alterações registradas" icon="clock" padding="compact">
          {historyQuery.isLoading ? (
            <span className="dbc-text-2">Carregando histórico...</span>
          ) : history.length ? (
            <div className="product-form-history">
              {history.map((entry, index) => (
                <div className="product-form-history__item" key={`${entry.ts}-${index}`}>
                  <span className="product-form-history__dot" />
                  <div>
                    <strong>{entry.label}</strong>
                    <small>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.ts))}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="dbc-text-3">Nenhuma alteração registrada ainda.</span>
          )}
        </SectionCard>
      )}
    </div>
  );
}

export function ProdutoFormPage({ mode }: { mode: ProductFormMode }) {
  const navigate = useNavigate();
  const { projetoId, produtoId } = useParams<{ projetoId: string; produtoId: string }>();
  const isEdit = mode === 'edit';

  const detailQuery = produtoHooks.useDetail(isEdit ? produtoId : undefined, projetoId);
  const teamsQuery = timeHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' }, projetoId);
  const createMutation = produtoHooks.useCreate(projetoId);
  const updateMutation = produtoHooks.useUpdate(projetoId);
  const toggleMutation = produtoHooks.useToggleStatus(projetoId);

  const schema = useMemo(() => buildZodSchema(PRODUTO_CONFIG.form.sections), []);
  const teamOptions = useMemo(
    () => (teamsQuery.data?.data ?? []).map((time) => ({ value: time.id, label: time.nome })),
    [teamsQuery.data],
  );
  const extraOptions = useMemo(() => ({ times: teamOptions }), [teamOptions]);

  const { control, handleSubmit, reset, formState } = useForm<FieldValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: CREATE_DEFAULTS as DefaultValues<FieldValues>,
  });
  const values = useWatch({ control }) as FieldValues;

  useEffect(() => {
    if (isEdit && detailQuery.data) reset(detailQuery.data as unknown as DefaultValues<FieldValues>);
    if (!isEdit) reset(CREATE_DEFAULTS as DefaultValues<FieldValues>);
  }, [detailQuery.data, isEdit, reset]);

  if (!projetoId) return null;

  const backToProducts = () => navigate(`/projetos/${projetoId}/produtos`);

  if (isEdit && detailQuery.isLoading) {
    return <div className="main-pad"><span className="dbc-text-2">Carregando produto...</span></div>;
  }

  if (isEdit && !detailQuery.data) {
    return (
      <div className="main-pad">
        <EmptyState title="Produto não encontrado" message="O registro pode ter sido removido ou não estar disponível neste projeto." actionLabel="Voltar para produtos" onAction={backToProducts} />
      </div>
    );
  }

  const item = detailQuery.data;
  const saving = createMutation.isPending || updateMutation.isPending;
  const title = isEdit ? 'Editar Produto' : 'Novo Produto';
  const subtitle = isEdit
    ? 'Atualize as informações do produto mantendo o contexto e a governança do projeto.'
    : 'Cadastre um novo produto para estruturar a base de conhecimento do projeto.';

  function submit(data: FieldValues, forcePlanning = false) {
    const dto = { ...data } as Partial<Produto>;
    if (forcePlanning) dto.status = 'Planejamento';

    if (isEdit && item) {
      updateMutation.mutate(
        { id: item.id, dto },
        {
          onSuccess: () => navigate(`/projetos/${projetoId}/produtos/${item.id}`),
        },
      );
      return;
    }

    createMutation.mutate(dto, {
      onSuccess: (created) => navigate(`/projetos/${projetoId}/produtos/${created.id}`),
    });
  }

  const mutationError = createMutation.error ?? updateMutation.error ?? toggleMutation.error;
  const mutationToast: ToastState = mutationError
    ? { type: 'error', title: 'Não foi possível salvar o produto', message: getErrorMessage(mutationError) }
    : null;

  return (
    <SetupPage
      header={
        <SetupPageHeader
          breadcrumb={['Setup', 'Projetos', 'Produtos', isEdit ? item?.nome ?? 'Editar' : 'Novo']}
          title={title}
          subtitle={subtitle}
          back={{ label: 'Voltar para produtos', onClick: backToProducts }}
          badges={isEdit && item ? <Badge kind="status" preset={item.status === 'Ativo' ? 'ativo' : item.status === 'Inativo' ? 'inativo' : 'pendente'}>{item.status}</Badge> : undefined}
        />
      }
      rail={<ProductFormRail values={values ?? {}} mode={mode} produtoId={produtoId} projetoId={projetoId} />}
    >
      <form className="product-form-page" onSubmit={handleSubmit((data) => submit(data))}>
        {PRODUTO_CONFIG.form.sections.map((section, index) => (
          <SectionCard
            key={section.title}
            title={section.title}
            subtitle={index === 0 ? 'Campos marcados com * são obrigatórios.' : undefined}
            icon={index === 0 ? 'box' : index === 1 ? 'info' : index === 2 ? 'users' : index === 3 ? 'zap' : 'clipboardCheck'}
          >
            <FormGrid columns={FORM_GRID_PAGE} rowGap={20}>
              {section.fields.map((field) => (
                <FormGridItem key={field.key} span={{ base: 'full', sm: PAGE_SPANS[field.key] ?? 'full' }}>
                  <EntityFormField
                    field={field}
                    control={control}
                    error={formState.errors[field.key]?.message as string | undefined}
                    extraOptions={extraOptions}
                  />
                </FormGridItem>
              ))}
            </FormGrid>
          </SectionCard>
        ))}

        <PageActions sticky>
          <Button variant="default" size="lg" onClick={backToProducts} disabled={saving}>Cancelar</Button>
          {!isEdit && (
            <Button
              variant="default"
              size="lg"
              loading={saving}
              onClick={handleSubmit((data) => submit(data, true))}
            >
              Salvar como planejamento
            </Button>
          )}
          {isEdit && item?.status === 'Ativo' && (
            <Button
              variant="danger"
              size="lg"
              loading={toggleMutation.isPending}
              onClick={() => toggleMutation.mutate(item.id, { onSuccess: backToProducts })}
            >
              Inativar produto
            </Button>
          )}
          {isEdit && item?.status === 'Inativo' && (
            <Button
              variant="default"
              size="lg"
              loading={toggleMutation.isPending}
              onClick={() => toggleMutation.mutate(item.id, { onSuccess: () => navigate(`/projetos/${projetoId}/produtos/${item.id}`) })}
            >
              Ativar produto
            </Button>
          )}
          <Button variant="primary" size="lg" loading={saving} onClick={handleSubmit((data) => submit(data))}>
            {isEdit ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </PageActions>
      </form>

      {mutationToast && (
        <Toast
          open
          type={mutationToast.type}
          title={mutationToast.title}
          message={mutationToast.message}
          onClose={() => { createMutation.reset(); updateMutation.reset(); toggleMutation.reset(); }}
        />
      )}
    </SetupPage>
  );
}
