import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { Stepper, type StepperStep } from '@/design-system';
import { timeHooks } from '@/entities/time/time.hooks';
import { pessoaHooks } from '@/entities/pessoa/pessoa.hooks';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { useDocumentoResumo } from '@/entities/documento/documento.api';

type SetupSection = 'projeto' | 'times' | 'pessoas' | 'produtos' | 'regras' | 'documentos';

interface SetupLocation {
  projetoId?: string;
  produtoId?: string;
  secao: SetupSection;
}

function parseSetupLocation(pathname: string): SetupLocation | null {
  const documentos = matchPath('/projetos/:projetoId/documentos/*', pathname) ?? matchPath('/projetos/:projetoId/documentos', pathname);
  if (documentos) return { projetoId: documentos.params.projetoId, secao: 'documentos' };

  const fontesProjeto = matchPath('/projetos/:projetoId/fontes', pathname);
  if (fontesProjeto) return { projetoId: fontesProjeto.params.projetoId, secao: 'projeto' };

  const regrasSetup = matchPath('/projetos/:projetoId/regras', pathname);
  if (regrasSetup) return { projetoId: regrasSetup.params.projetoId, secao: 'regras' };

  const regra = matchPath('/projetos/:projetoId/produtos/:produtoId/regras/:regraId', pathname);
  if (regra) return { projetoId: regra.params.projetoId, produtoId: regra.params.produtoId, secao: 'regras' };

  const produtoDetail = matchPath('/projetos/:projetoId/produtos/:produtoId/*', pathname) ?? matchPath('/projetos/:projetoId/produtos/:produtoId', pathname);
  if (produtoDetail) return { projetoId: produtoDetail.params.projetoId, produtoId: produtoDetail.params.produtoId, secao: 'produtos' };

  const timeDetail = matchPath('/projetos/:projetoId/times/:timeId', pathname);
  if (timeDetail) return { projetoId: timeDetail.params.projetoId, secao: 'times' };

  const pessoaDetail = matchPath('/projetos/:projetoId/pessoas/:pessoaId', pathname);
  if (pessoaDetail) return { projetoId: pessoaDetail.params.projetoId, secao: 'pessoas' };

  const times = matchPath('/projetos/:projetoId/times', pathname);
  if (times) return { projetoId: times.params.projetoId, secao: 'times' };

  const pessoas = matchPath('/projetos/:projetoId/pessoas', pathname);
  if (pessoas) return { projetoId: pessoas.params.projetoId, secao: 'pessoas' };

  const produtos = matchPath('/projetos/:projetoId/produtos', pathname);
  if (produtos) return { projetoId: produtos.params.projetoId, secao: 'produtos' };

  const projeto = matchPath('/projetos/:projetoId', pathname);
  if (projeto) return { projetoId: projeto.params.projetoId, secao: 'projeto' };

  return null;
}


/**
 * Stepper contextual do Setup. Projeto, Time, Pessoas, Produtos, Regras e Documentos
 * possuem rotas reais. Agents permanece apenas como etapa futura até a base estar pronta.
 */
export function SetupStepper() {
  const location = useLocation();
  const navigate = useNavigate();
  const parsed = parseSetupLocation(location.pathname);
  const projetoId = parsed?.projetoId;

  const { data: timesData } = timeHooks.useList({ page: 1, pageSize: 1 }, projetoId, { enabled: !!projetoId });
  const { data: pessoasData } = pessoaHooks.useList({ page: 1, pageSize: 1 }, projetoId, { enabled: !!projetoId });
  const { data: produtosData } = produtoHooks.useList({ page: 1, pageSize: 1 }, projetoId, { enabled: !!projetoId });
  const { data: documentosResumo } = useDocumentoResumo(projetoId);

  if (!parsed || !projetoId) return null;

  const secao = parsed.secao;
  const produtoDone = (produtosData?.meta.total ?? 0) > 0 || secao === 'regras';

  const destinations = {
    projeto: `/projetos/${projetoId}`,
    times: `/projetos/${projetoId}/times`,
    pessoas: `/projetos/${projetoId}/pessoas`,
    produtos: `/projetos/${projetoId}/produtos`,
    regras: `/projetos/${projetoId}/regras`,
    documentos: `/projetos/${projetoId}/documentos`,
  } as const;

  const go = (section: keyof typeof destinations) => (secao === section ? undefined : () => navigate(destinations[section]));

  const steps: StepperStep[] = [
    {
      key: 'projeto',
      label: 'Projeto',
      icon: 'folder',
      state: secao === 'projeto' ? 'current' : 'done',
      onClick: go('projeto'),
    },
    {
      key: 'time',
      label: 'Time',
      icon: 'users',
      state: secao === 'times' ? 'current' : secao !== 'projeto' || (timesData?.meta.total ?? 0) > 0 ? 'done' : 'upcoming',
      onClick: go('times'),
    },
    {
      key: 'pessoas',
      label: 'Pessoas',
      icon: 'user',
      state: secao === 'pessoas' ? 'current' : ['produtos', 'regras', 'documentos'].includes(secao) || (pessoasData?.meta.total ?? 0) > 0 ? 'done' : 'upcoming',
      onClick: go('pessoas'),
    },
    {
      key: 'produtos',
      label: 'Produtos',
      icon: 'box',
      state: secao === 'produtos' ? 'current' : ['regras', 'documentos'].includes(secao) || produtoDone ? 'done' : 'upcoming',
      onClick: go('produtos'),
    },
    {
      key: 'regras',
      label: 'Regras',
      icon: 'clipboardCheck',
      state: secao === 'regras' ? 'current' : secao === 'documentos' ? 'done' : 'upcoming',
      onClick: go('regras'),
    },
    {
      key: 'documentos',
      label: 'Documentos',
      icon: 'folder',
      state: secao === 'documentos' ? 'current' : (documentosResumo?.total ?? 0) > 0 ? 'done' : 'upcoming',
      onClick: go('documentos'),
    },
    { key: 'agentes', label: 'Agentes', icon: 'zap', state: 'upcoming' },
  ];

  return (
    <div className="setup-stepper-shell">
      <Stepper steps={steps} />
    </div>
  );
}
