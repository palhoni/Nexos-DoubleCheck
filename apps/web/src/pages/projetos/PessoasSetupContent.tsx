import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import {
  Avatar,
  Badge,
  Button,
  ChipList,
  DataTableCard,
  EmptyState,
  Icon,
  Pagination,
  RightRail,
  RowActionButton,
  SearchInput,
  SectionCard,
  Toast,
  getInitials,
  type DataTableColumn,
} from '@/design-system';
import { EntityFormField, EntitySelectField } from '@/entities/crud/EntityFormFields';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { buildZodSchema } from '@/entities/crud/formSchema';
import { EntityStatusBadge, getErrorMessage, normalizeOptions } from '@/entities/crud/shared';
import { PESSOA_CONFIG } from '@/entities/pessoa/pessoa.config';
import { pessoaHooks } from '@/entities/pessoa/pessoa.hooks';
import { NIVEL_DECISAO_LIST, STATUS_PESSOA_LIST, type Pessoa } from '@/entities/pessoa/pessoa.types';
import { timeHooks } from '@/entities/time/time.hooks';

const PAGE_SIZE = 10;
const SUPPORT_PAGE_SIZE = 100;

type ToastState = { type: 'success' | 'error'; title: string; message: string } | null;

type RoleSummary = {
  papel: string;
  pessoas: Pessoa[];
  responsabilidades: string[];
};

const createDefaults: DefaultValues<FieldValues> = {
  nome: '',
  emailCorporativo: '',
  status: 'Ativo',
  papel: '',
  cargo: '',
  timeId: '',
  nivelDecisao: '',
  pessoaReferencia: false,
  observacoes: '',
};

function cleanLabel(value: string | null | undefined, fallback = 'Não informado') {
  const text = value?.trim();
  return text || fallback;
}

function MetricLine({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="setup-rail-metric">
      <div>
        <div className="setup-rail-metric__label">{label}</div>
        {hint && <div className="setup-rail-metric__hint">{hint}</div>}
      </div>
      <div className="setup-rail-metric__value">{value}</div>
    </div>
  );
}

function InsightRow({ tone, title, detail }: { tone: 'info' | 'warning' | 'success'; title: string; detail: string }) {
  const preset = tone === 'warning' ? 'pendente' : tone === 'success' ? 'sucesso' : 'info';
  const icon = tone === 'warning' ? 'warning' : tone === 'success' ? 'check' : 'info';

  return (
    <div className={`setup-people-insight setup-people-insight--${tone}`}>
      <span className="setup-people-insight__icon">
        <Icon name={icon} size={15} />
      </span>
      <span className="setup-people-insight__copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <Badge preset={preset} dot={false} style={{ paddingInline: 8 }}>
        {tone === 'warning' ? 'Atenção' : tone === 'success' ? 'OK' : 'Info'}
      </Badge>
    </div>
  );
}

function RoleCard({ summary }: { summary: RoleSummary }) {
  const names = summary.pessoas.slice(0, 3).map((pessoa) => pessoa.nome);
  const extra = summary.pessoas.length - names.length;

  return (
    <article className="setup-role-card">
      <div className="setup-role-card__header">
        <span className="setup-role-card__icon"><Icon name="users" size={16} /></span>
        <div>
          <h3>{summary.papel}</h3>
          <p>{summary.pessoas.length} {summary.pessoas.length === 1 ? 'pessoa' : 'pessoas'}</p>
        </div>
      </div>

      <div className="setup-role-card__people">
        {names.map((nome) => (
          <span key={nome}>{nome}</span>
        ))}
        {extra > 0 && <span>+{extra}</span>}
      </div>

      <div className="setup-role-card__body">
        <strong>Responsabilidades documentadas</strong>
        {summary.responsabilidades.length > 0 ? (
          <ul>
            {summary.responsabilidades.slice(0, 3).map((responsabilidade) => (
              <li key={responsabilidade}>{responsabilidade}</li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma responsabilidade registrada para pessoas deste papel.</p>
        )}
      </div>
    </article>
  );
}

export function PessoasSetupContent({ projetoId }: { projetoId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [status, setStatus] = useState('');
  const [timeDraft, setTimeDraft] = useState('');
  const [timeId, setTimeId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Pessoa | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const schema = useMemo(() => buildZodSchema(PESSOA_CONFIG.form.sections), []);
  const createForm = useForm<FieldValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: createDefaults,
  });

  const listQuery = {
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
    ...(search ? { nome: search } : {}),
    ...(status ? { status } : {}),
    ...(timeId ? { timeId } : {}),
  };

  const { data: pessoasData, isLoading } = pessoaHooks.useList(listQuery, projetoId);
  const { data: allPessoasData } = pessoaHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' }, projetoId);
  const { data: timesData } = timeHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' }, projetoId);

  const createMutation = pessoaHooks.useCreate(projetoId);
  const updateMutation = pessoaHooks.useUpdate(projetoId);
  const toggleMutation = pessoaHooks.useToggleStatus(projetoId);

  const pessoas = pessoasData?.data ?? [];
  const allPessoas = allPessoasData?.data ?? [];
  const times = timesData?.data ?? [];
  const meta = pessoasData?.meta;
  const timesById = useMemo(() => new Map(times.map((time) => [time.id, time])), [times]);
  const timeOptions = useMemo(() => times.map((time) => ({ value: time.id, label: time.nome })), [times]);
  const extraOptions = useMemo(() => ({ times: timeOptions }), [timeOptions]);

  const roleSummaries = useMemo<RoleSummary[]>(() => {
    const groups = new Map<string, Pessoa[]>();
    for (const pessoa of allPessoas) {
      const papel = pessoa.papel?.trim();
      if (!papel) continue;
      groups.set(papel, [...(groups.get(papel) ?? []), pessoa]);
    }

    return [...groups.entries()]
      .map(([papel, pessoasDoPapel]) => ({
        papel,
        pessoas: pessoasDoPapel,
        responsabilidades: [...new Set(pessoasDoPapel.flatMap((pessoa) => pessoa.responsabilidades ?? []).filter(Boolean))],
      }))
      .sort((a, b) => b.pessoas.length - a.pessoas.length || a.papel.localeCompare(b.papel, 'pt-BR'));
  }, [allPessoas]);

  const activePeople = allPessoas.filter((pessoa) => pessoa.status === 'Ativo').length;
  const referencePeople = allPessoas.filter((pessoa) => pessoa.pessoaReferencia).length;
  const withoutTeam = allPessoas.filter((pessoa) => !pessoa.timeId).length;
  const withoutRole = allPessoas.filter((pessoa) => !pessoa.papel?.trim()).length;
  const withoutResponsibilities = allPessoas.filter((pessoa) => (pessoa.responsabilidades?.length ?? 0) === 0).length;
  const supportDataMayBePartial = (allPessoasData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE || (timesData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE;

  function applyFilters() {
    setSearch(searchDraft.trim());
    setStatus(statusDraft);
    setTimeId(timeDraft);
    setPage(1);
  }

  function clearFilters() {
    setSearchDraft('');
    setSearch('');
    setStatusDraft('');
    setStatus('');
    setTimeDraft('');
    setTimeId('');
    setPage(1);
  }

  function handleSort(key: string) {
    if (sortBy === key) setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function openEdit(row: Pessoa) {
    setEditingItem(row);
    setEditOpen(true);
  }

  function saveEdit(data: Partial<Pessoa>) {
    if (!editingItem) return;
    updateMutation.mutate(
      { id: editingItem.id, dto: data },
      {
        onSuccess: () => {
          setEditOpen(false);
          setEditingItem(null);
          setToast({ type: 'success', title: 'Pessoa atualizada', message: 'As alterações foram salvas com sucesso.' });
        },
        onError: (error) => setToast({ type: 'error', title: 'Não foi possível salvar', message: getErrorMessage(error) }),
      },
    );
  }

  function createPerson(data: FieldValues) {
    const dto = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== '' && value !== undefined),
    ) as Partial<Pessoa>;

    createMutation.mutate(dto, {
      onSuccess: () => {
        createForm.reset(createDefaults);
        setToast({ type: 'success', title: 'Pessoa adicionada', message: 'A pessoa foi vinculada ao projeto com sucesso.' });
      },
      onError: (error) => setToast({ type: 'error', title: 'Não foi possível adicionar', message: getErrorMessage(error) }),
    });
  }

  const columns: DataTableColumn<Pessoa>[] = [
    {
      key: 'nome',
      label: 'Pessoa',
      primary: true,
      minWidth: 230,
      render: (row) => (
        <div className="setup-person-cell">
          <Avatar size={34} initials={getInitials(row.nome)} />
          <div>
            <strong>{row.nome}</strong>
            <span>{cleanLabel(row.emailCorporativo, 'E-mail não informado')}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'papel',
      label: 'Papel',
      minWidth: 150,
      render: (row) => row.papel ? <Badge preset="info" dot={false}>{row.papel}</Badge> : <span className="setup-muted-value">Não definido</span>,
    },
    {
      key: 'timeId',
      label: 'Time',
      minWidth: 160,
      sortable: false,
      render: (row) => cleanLabel(row.timeId ? timesById.get(row.timeId)?.nome : undefined, 'Sem time'),
    },
    {
      key: 'produtos',
      label: 'Produtos',
      minWidth: 190,
      sortable: false,
      render: (row) => row.produtos?.length ? <div className="setup-chip-clamp"><ChipList values={row.produtos.slice(0, 2)} />{row.produtos.length > 2 && <span className="setup-chip-more">+{row.produtos.length - 2}</span>}</div> : <span className="setup-muted-value">Nenhum</span>,
    },
    {
      key: 'responsabilidades',
      label: 'Responsabilidades',
      minWidth: 220,
      sortable: false,
      render: (row) => <span className="setup-table-clamp">{row.responsabilidades?.[0] ?? 'Não documentadas'}</span>,
    },
    {
      key: 'nivelDecisao',
      label: 'Decisão',
      minWidth: 130,
      sortable: false,
      render: (row) => (
        <div className="setup-decision-cell">
          <span>{cleanLabel(row.nivelDecisao, 'Não definido')}</span>
          {row.pessoaReferencia && <Badge preset="analise" dot={false}>Referência</Badge>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 110,
      stopRowClick: true,
      render: (row) => <EntityStatusBadge config={PESSOA_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} />,
    },
  ];

  const firstItem = meta ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const lastItem = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
  const hasFilters = Boolean(search || status || timeId);
  const appliedFilterCount = [status, timeId].filter(Boolean).length;

  return (
    <>
      <div className="setup-people-layout">
        <div className="setup-people-main">
          <DataTableCard
            columns={columns}
            rows={pessoas}
            rowKey={(row) => row.id}
            density="default"
            loading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={(row) => navigate(`/projetos/${projetoId}/pessoas/${row.id}`)}
            rowActions={(row) => (
              <RowActionButton title={`Editar ${row.nome}`} onClick={() => openEdit(row)}>
                <Icon name="edit" size={15} />
              </RowActionButton>
            )}
            toolbar={
              <div className="setup-table-toolbar">
                <div className="setup-table-toolbar__copy">
                  <h2>Pessoas do projeto</h2>
                  <p>Participantes, papéis, times e escopos de atuação cadastrados.</p>
                </div>
                <div className="setup-table-toolbar__actions">
                  <SearchInput
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
                    placeholder="Buscar pessoa..."
                    wrapStyle={{ width: 240 }}
                  />
                  <Button variant={filtersOpen || appliedFilterCount > 0 ? 'default' : 'ghost'} icon="chevronDown" onClick={() => setFiltersOpen((value) => !value)}>
                    Filtros{appliedFilterCount > 0 ? ` · ${appliedFilterCount}` : ''}
                  </Button>
                  <Button variant="primary" icon="plus" onClick={() => document.getElementById('setup-add-person')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    Adicionar pessoa
                  </Button>
                </div>
                {filtersOpen && (
                  <div className="setup-table-filterbar setup-table-filterbar--people">
                    <div className="setup-table-filterbar__field">
                      <label>Status</label>
                      <EntitySelectField value={statusDraft} onChange={setStatusDraft} options={normalizeOptions([...STATUS_PESSOA_LIST])} />
                    </div>
                    <div className="setup-table-filterbar__field setup-table-filterbar__field--wide">
                      <label>Time</label>
                      <EntitySelectField value={timeDraft} onChange={setTimeDraft} options={timeOptions} />
                    </div>
                    <div className="setup-table-filterbar__buttons">
                      {hasFilters && <Button variant="ghost" onClick={clearFilters}>Limpar</Button>}
                      <Button variant="default" icon="search" onClick={applyFilters}>Aplicar filtros</Button>
                    </div>
                  </div>
                )}
              </div>
            }
            empty={
              <EmptyState
                title={hasFilters ? 'Nenhuma pessoa encontrada' : 'Nenhuma pessoa cadastrada'}
                message={hasFilters ? 'Revise os filtros aplicados ou limpe a busca.' : 'Adicione as pessoas que participam do projeto e documente seus papéis.'}
                actionLabel={hasFilters ? 'Limpar filtros' : 'Adicionar pessoa'}
                onAction={hasFilters ? clearFilters : () => document.getElementById('setup-add-person')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
            }
            footer={
              meta && meta.total > 0 ? (
                <div className="setup-table-footer">
                  <span>Mostrando {firstItem}–{lastItem} de {meta.total}</span>
                  {meta.totalPages > 1 && <Pagination page={page} total={meta.totalPages} onChange={setPage} />}
                </div>
              ) : undefined
            }
          />

          <SectionCard title="Papéis e responsabilidades" subtitle="Agrupamento calculado a partir dos papéis e responsabilidades realmente documentados nas pessoas do projeto.">
            {roleSummaries.length > 0 ? (
              <div className="setup-role-grid">
                {roleSummaries.slice(0, 8).map((summary) => <RoleCard key={summary.papel} summary={summary} />)}
              </div>
            ) : (
              <div className="setup-section-empty">
                <Icon name="users" size={20} />
                <div><strong>Nenhum papel documentado</strong><span>Edite as pessoas para registrar seus papéis e responsabilidades.</span></div>
              </div>
            )}
            {roleSummaries.length > 8 && <div className="setup-data-note">Exibindo os 8 papéis com mais pessoas. Existem {roleSummaries.length} papéis distintos cadastrados.</div>}
          </SectionCard>
        </div>

        <RightRail>
          <SectionCard title="Adicionar pessoa" subtitle="Cadastre os dados principais. Produtos e responsabilidades detalhadas podem ser complementados no detalhe da pessoa." className="setup-add-person-card">
            <form id="setup-add-person" className="setup-person-form" onSubmit={createForm.handleSubmit(createPerson)} noValidate>
              {PESSOA_CONFIG.form.sections.map((section) => (
                <div className="setup-person-form__section" key={section.title}>
                  <div className="setup-person-form__section-title">{section.title}</div>
                  <div className="setup-person-form__grid">
                    {section.fields.map((field) => (
                      <div className={field.colSpan === 2 ? 'setup-person-form__field setup-person-form__field--full' : 'setup-person-form__field'} key={field.key}>
                        <EntityFormField
                          field={field as never}
                          control={createForm.control}
                          error={createForm.formState.errors[field.key]?.message as string | undefined}
                          extraOptions={extraOptions}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="setup-person-form__actions">
                <Button type="button" variant="ghost" onClick={() => createForm.reset(createDefaults)} disabled={createMutation.isPending}>Limpar</Button>
                <Button type="submit" variant="primary" icon="plus" loading={createMutation.isPending}>Salvar pessoa</Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Insights de pessoas" subtitle="Sinais calculados apenas com os dados cadastrados no projeto.">
            <div className="setup-rail-metrics setup-people-metrics">
              <MetricLine label="Pessoas ativas" value={`${activePeople}/${allPessoasData?.meta.total ?? allPessoas.length}`} />
              <MetricLine label="Papéis distintos" value={roleSummaries.length} />
              <MetricLine label="Pessoas de referência" value={referencePeople} />
            </div>
            <div className="setup-people-insights-list">
              {withoutTeam > 0 && <InsightRow tone="warning" title={`${withoutTeam} sem time`} detail="Revise a alocação para evitar participantes sem contexto de equipe." />}
              {withoutRole > 0 && <InsightRow tone="warning" title={`${withoutRole} sem papel`} detail="Defina o papel para deixar responsabilidades e decisões mais claras." />}
              {withoutResponsibilities > 0 && <InsightRow tone="info" title={`${withoutResponsibilities} sem responsabilidades`} detail="O cadastro existe, mas ainda não possui responsabilidades documentadas." />}
              {withoutTeam === 0 && withoutRole === 0 && withoutResponsibilities === 0 && allPessoas.length > 0 && (
                <InsightRow tone="success" title="Cadastros consistentes" detail="Todas as pessoas possuem time, papel e pelo menos uma responsabilidade registrada." />
              )}
            </div>
            {supportDataMayBePartial && <div className="setup-data-note">Os indicadores de apoio consideram até 100 pessoas e 100 times por projeto devido ao limite atual da API.</div>}
          </SectionCard>

          <SectionCard title="Níveis de decisão" subtitle="Distribuição informada nos cadastros.">
            <div className="setup-decision-distribution">
              {NIVEL_DECISAO_LIST.map((nivel) => {
                const count = allPessoas.filter((pessoa) => pessoa.nivelDecisao === nivel).length;
                return <MetricLine key={nivel} label={nivel} value={count} />;
              })}
            </div>
          </SectionCard>
        </RightRail>
      </div>

      <EntityFormModal
        config={PESSOA_CONFIG}
        open={editOpen}
        item={editingItem}
        onClose={() => { setEditOpen(false); setEditingItem(null); }}
        onSave={saveEdit}
        saving={updateMutation.isPending}
        extraOptions={extraOptions}
      />

      <Toast open={Boolean(toast)} type={toast?.type} title={toast?.title} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
