import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, FormGrid, FormGridItem, FORM_GRID_PAGE, Input, PageActions, RightRail, SectionCard, Textarea } from '@/design-system';
import { getErrorMessage } from '@/entities/crud/shared';
import { useDocumento, useDocumentoMutations } from '@/entities/documento/documento.api';
import type { DocumentoStatus } from '@/entities/documento/documento.types';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

interface DocumentoFormPageProps {
  mode: 'create' | 'edit';
}

function statusPreset(status: DocumentoStatus) {
  if (status === 'Publicado') return 'ativo' as const;
  if (status === 'Revisao') return 'pendente' as const;
  if (status === 'Arquivado') return 'inativo' as const;
  return 'info' as const;
}

function statusLabel(status: DocumentoStatus) {
  return status === 'Revisao' ? 'Em revisão' : status;
}

export function DocumentoFormPage({ mode }: DocumentoFormPageProps) {
  const navigate = useNavigate();
  const { projetoId, documentoId } = useParams<{ projetoId: string; documentoId: string }>();
  const projectQuery = projetoHooks.useDetail(projetoId);
  const documentQuery = useDocumento(mode === 'edit' ? documentoId : undefined);
  const { create, update, createVersion } = useDocumentoMutations();

  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState<DocumentoStatus>('Rascunho');
  const [resumo, setResumo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [motivoAlteracao, setMotivoAlteracao] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !documentQuery.data) return;
    const documento = documentQuery.data;
    setCodigo(documento.codigo);
    setTitulo(documento.titulo);
    setTipo(documento.tipo);
    setStatus(documento.status);
    setResumo(documento.resumo ?? '');
    setConteudo(documento.conteudo ?? '');
    setResponsavel(documento.responsavel ?? '');
  }, [documentQuery.data, mode]);

  const documento = documentQuery.data;
  const editorialChanged = mode === 'edit' && !!documento && (
    titulo.trim() !== documento.titulo ||
    resumo.trim() !== (documento.resumo ?? '') ||
    conteudo.trim() !== (documento.conteudo ?? '')
  );
  const archived = documento?.status === 'Arquivado';
  const publishing = status === 'Publicado';
  const requiredOk = !!projetoId && !!codigo.trim() && !!titulo.trim() && !!tipo.trim();
  const publicationOk = !publishing || (!!conteudo.trim() && !!responsavel.trim());
  const canSubmit = requiredOk && publicationOk && !create.isPending && !update.isPending && !createVersion.isPending;

  const completeness = useMemo(() => {
    const checks = [
      !!codigo.trim(),
      !!titulo.trim(),
      !!tipo.trim(),
      !!resumo.trim(),
      !!conteudo.trim(),
      !!responsavel.trim(),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [codigo, conteudo, responsavel, resumo, tipo, titulo]);

  async function save() {
    if (!projetoId || !canSubmit) return;
    setError(null);
    try {
      if (mode === 'create') {
        const created = await create.mutateAsync({
          projetoId,
          codigo: codigo.trim(),
          titulo: titulo.trim(),
          tipo: tipo.trim(),
          status,
          resumo: resumo.trim() || undefined,
          conteudo: conteudo.trim() || undefined,
          responsavel: responsavel.trim() || undefined,
        });
        navigate(`/projetos/${projetoId}/documentos/${created.id}`);
        return;
      }

      if (!documentoId || !documento) return;
      if (archived && editorialChanged) {
        setError('Documento arquivado não pode receber nova versão. Altere apenas o status para “Em revisão”, salve e depois edite o conteúdo.');
        return;
      }

      if (editorialChanged) {
        await createVersion.mutateAsync({
          id: documentoId,
          payload: {
            titulo: titulo.trim(),
            resumo: resumo.trim() || undefined,
            conteudo: conteudo.trim(),
            motivoAlteracao: motivoAlteracao.trim() || undefined,
          },
        });
      }

      // Uma alteração editorial sobre documento publicado entra em revisão pelo backend.
      // Não republicamos silenciosamente na mesma operação.
      const nextStatus = documento.status === 'Publicado' && editorialChanged ? undefined : status;
      const metadataChanged = tipo.trim() !== documento.tipo || responsavel.trim() !== (documento.responsavel ?? '') || (nextStatus && nextStatus !== documento.status);
      if (metadataChanged) {
        await update.mutateAsync({
          id: documentoId,
          payload: {
            tipo: tipo.trim(),
            responsavel: responsavel.trim(),
            ...(nextStatus && nextStatus !== documento.status && { status: nextStatus }),
          },
        });
      }
      navigate(`/projetos/${projetoId}/documentos/${documentoId}`);
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  }

  if (!projetoId) return null;
  if (projectQuery.isLoading || (mode === 'edit' && documentQuery.isLoading)) return <div className="main-pad">Carregando documento...</div>;
  if (!projectQuery.data || (mode === 'edit' && !documento)) return <div className="main-pad">Documento ou Projeto não encontrado.</div>;

  const projeto = projectQuery.data;
  const rail = (
    <RightRail sticky>
      <SectionCard title="Qualidade editorial" subtitle="Completude objetiva dos campos que ajudam outras pessoas a entender o documento." icon="clipboardCheck" padding="compact">
        <div className="document-form-score"><strong>{completeness}%</strong><span>completude cadastral</span></div>
        <div className="document-form-checklist">
          {[
            ['Código estável', !!codigo.trim()],
            ['Título claro', !!titulo.trim()],
            ['Tipo definido', !!tipo.trim()],
            ['Resumo executivo', !!resumo.trim()],
            ['Conteúdo documentado', !!conteudo.trim()],
            ['Responsável definido', !!responsavel.trim()],
          ].map(([label, done]) => <div key={String(label)} className={done ? 'is-done' : ''}><IconMark done={Boolean(done)} /><span>{label}</span></div>)}
        </div>
      </SectionCard>

      {mode === 'edit' && documento && (
        <SectionCard title="Governança" subtitle="Estado atual do documento e regras de versionamento." icon="info" padding="compact">
          <div className="document-governance-card">
            <div><span>Status atual</span><Badge preset={statusPreset(documento.status)}>{statusLabel(documento.status)}</Badge></div>
            <div><span>Versão atual</span><strong>v{documento.versao}</strong></div>
            <div><span>Fontes vinculadas</span><strong>{documento.fontesTotal}</strong></div>
            <div><span>Uso cross-project</span><strong>{documento.vinculosCrossProject}</strong></div>
          </div>
          {documento.status === 'Publicado' && <Alert type="info" title="Nova versão entra em revisão">Alterar título, resumo ou conteúdo preserva a versão publicada no histórico e cria uma nova versão em revisão.</Alert>}
          {archived && <Alert type="warning" title="Documento arquivado">Reabra o documento em revisão antes de criar uma nova versão editorial.</Alert>}
        </SectionCard>
      )}

      <Alert type="info" title="Fonte e Documento têm papéis diferentes">Depois de salvar, vincule as fontes que sustentam este conteúdo. O documento organiza conhecimento; a fonte registra sua origem/evidência.</Alert>
    </RightRail>
  );

  return (
    <SetupPage
      header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', projeto.nome, 'Documentos', mode === 'create' ? 'Novo' : documento!.titulo]} title={mode === 'create' ? 'Novo Documento' : 'Editar Documento'} subtitle={mode === 'create' ? 'Crie documentação curada e versionável para reduzir dependência da memória dos times.' : 'Altere metadados ou crie uma nova versão sem destruir o histórico do conhecimento.'} back={{ label: 'Voltar para documentos', onClick: () => navigate(`/projetos/${projetoId}/documentos`) }} />}
      rail={rail}
    >
      {error && <Alert type="error" title="Não foi possível salvar">{error}</Alert>}

      <SectionCard title="Identificação" subtitle="Código e propriedade formam a identidade estável do documento no ecossistema." icon="folder">
        <FormGrid columns={FORM_GRID_PAGE}>
          <FormGridItem span={{ base: 1, sm: 4 }}><label className="document-form-field"><span>Código *</span><Input value={codigo} disabled={mode === 'edit'} onChange={(event) => setCodigo(event.target.value)} placeholder="Ex.: DOC-CUST-001" /></label></FormGridItem>
          <FormGridItem span={{ base: 1, sm: 8 }}><label className="document-form-field"><span>Título *</span><Input value={titulo} disabled={archived} onChange={(event) => setTitulo(event.target.value)} placeholder="Nome claro e pesquisável do documento" /></label></FormGridItem>
          <FormGridItem span={{ base: 1, sm: 4 }}><label className="document-form-field"><span>Tipo *</span><Input list="nexus-document-types" value={tipo} onChange={(event) => setTipo(event.target.value)} placeholder="Ex.: Especificação" /><datalist id="nexus-document-types"><option value="Especificação funcional" /><option value="Decisão arquitetural" /><option value="Contrato" /><option value="Processo" /><option value="Guia operacional" /><option value="Visão de produto" /><option value="Runbook" /></datalist></label></FormGridItem>
          <FormGridItem span={{ base: 1, sm: 4 }}><label className="document-form-field"><span>Responsável</span><Input value={responsavel} onChange={(event) => setResponsavel(event.target.value)} placeholder="Pessoa, time ou área responsável" /></label></FormGridItem>
          <FormGridItem span={{ base: 1, sm: 4 }}><label className="document-form-field"><span>Status</span><select className="knowledge-document-select" value={status} onChange={(event) => setStatus(event.target.value as DocumentoStatus)}><option value="Rascunho">Rascunho</option><option value="Revisao">Em revisão</option><option value="Publicado">Publicado</option>{mode === 'edit' && <option value="Arquivado">Arquivado</option>}</select></label></FormGridItem>
        </FormGrid>
      </SectionCard>

      <SectionCard title="Conteúdo" subtitle="Escreva para humanos hoje e preserve estrutura confiável para consumo automatizado no futuro." icon="clipboardCheck">
        <div className="document-editor-grid">
          <label className="document-form-field"><span>Resumo executivo</span><Textarea rows={4} value={resumo} disabled={archived} onChange={(event) => setResumo(event.target.value)} placeholder="Explique em poucas linhas o propósito, escopo e principal decisão deste documento." /></label>
          <label className="document-form-field"><span>Conteúdo {publishing ? '*' : ''}</span><Textarea rows={18} value={conteudo} disabled={archived} onChange={(event) => setConteudo(event.target.value)} placeholder="Documente contexto, comportamento, decisões, premissas, fluxos e referências relevantes. Use texto objetivo e verificável." /></label>
          {mode === 'edit' && editorialChanged && !archived && <label className="document-form-field"><span>Motivo da nova versão</span><Textarea rows={3} value={motivoAlteracao} onChange={(event) => setMotivoAlteracao(event.target.value)} placeholder="O que mudou e por quê? Essa informação ficará registrada junto da versão." /></label>}
        </div>
        {publishing && !publicationOk && <Alert type="warning" title="Requisitos para publicar">Informe conteúdo e responsável antes de publicar o documento.</Alert>}
      </SectionCard>

      <PageActions sticky>
        <Button variant="default" onClick={() => navigate(mode === 'edit' && documentoId ? `/projetos/${projetoId}/documentos/${documentoId}` : `/projetos/${projetoId}/documentos`)}>Cancelar</Button>
        <Button variant="primary" disabled={!canSubmit} loading={create.isPending || update.isPending || createVersion.isPending} onClick={save}>{mode === 'create' ? (status === 'Publicado' ? 'Criar e publicar' : 'Criar documento') : editorialChanged ? 'Salvar nova versão' : 'Salvar alterações'}</Button>
      </PageActions>
    </SetupPage>
  );
}

function IconMark({ done }: { done: boolean }) {
  return <span className={`document-check-mark${done ? ' is-done' : ''}`} aria-hidden="true">{done ? '✓' : '○'}</span>;
}
