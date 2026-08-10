import { createBrowserRouter } from 'react-router-dom';
import { PublicOnlyLayout } from '@/auth/PublicOnlyLayout';
import { ProtectedLayout } from '@/auth/ProtectedLayout';
import { LoginPage } from '@/auth/LoginPage';
import { AppShell } from '@/shell/AppShell';
import { HomePage } from '@/pages/HomePage';
import { VisaoGeralPage } from '@/pages/VisaoGeralPage';
import { ProjetosListPage } from '@/pages/projetos/ProjetosListPage';
import { ProjetoDetailPage } from '@/pages/projetos/ProjetoDetailPage';
import { ProjetoFormPage } from '@/pages/projetos/ProjetoFormPage';
import { ProjetoEcossistemaPage } from '@/pages/projetos/ProjetoEcossistemaPage';
import { ProjetoFontesPage } from '@/pages/projetos/ProjetoFontesPage';
import { ProjetoDocumentosPage } from '@/pages/projetos/ProjetoDocumentosPage';
import { DocumentoFormPage } from '@/pages/projetos/DocumentoFormPage';
import { DocumentoDetailPage } from '@/pages/projetos/DocumentoDetailPage';
import { TimesSetupPage } from '@/pages/projetos/TimesSetupPage';
import { PessoasSetupPage } from '@/pages/projetos/PessoasSetupPage';
import { ProdutosSetupPage } from '@/pages/projetos/ProdutosSetupPage';
import { RegrasSetupPage } from '@/pages/projetos/RegrasSetupPage';
import { TimeDetailPage } from '@/pages/projetos/TimeDetailPage';
import { PessoaDetailPage } from '@/pages/projetos/PessoaDetailPage';
import { ProdutoDetailPage } from '@/pages/projetos/ProdutoDetailPage';
import { ProdutoFormPage } from '@/pages/projetos/ProdutoFormPage';
import { PublicoAlvoDetailPage } from '@/pages/projetos/PublicoAlvoDetailPage';
import { PublicoAlvoFormPage } from '@/pages/projetos/PublicoAlvoFormPage';
import { ModuloDetailPage } from '@/pages/projetos/ModuloDetailPage';
import { FuncionalidadeDetailPage } from '@/pages/projetos/FuncionalidadeDetailPage';
import { JornadaDetailPage } from '@/pages/projetos/JornadaDetailPage';
import { RegraDetailPage } from '@/pages/projetos/RegraDetailPage';
import { IntegracaoDetailPage } from '@/pages/projetos/IntegracaoDetailPage';
import { IntegracoesMapaPage } from '@/pages/integracoes/IntegracoesMapaPage';
import { MapaConhecimentoPage } from '@/pages/conhecimento/MapaConhecimentoPage';
import { GovernancaPage } from '@/pages/governanca/GovernancaPage';
import { BuscaGlobalPage } from '@/pages/busca/BuscaGlobalPage';
import { MinhaAreaPage } from '@/pages/minha-area/MinhaAreaPage';
import { AtividadePage } from '@/pages/atividade/AtividadePage';
import { AgentsOrchestrationPage } from '@/pages/agents/AgentsOrchestrationPage';
import { AgentUsAnalyserPage } from '@/pages/agents/AgentUsAnalyserPage';
import { UsAnalysesPage } from '@/pages/agents/UsAnalysesPage';
import { UsAnalysisDetailPage } from '@/pages/agents/UsAnalysisDetailPage';

export const router = createBrowserRouter([
  {
    element: <PublicOnlyLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/visao-geral', element: <VisaoGeralPage /> },
          { path: '/integracoes', element: <IntegracoesMapaPage /> },
          { path: '/conhecimento', element: <MapaConhecimentoPage /> },
          { path: '/governanca', element: <GovernancaPage /> },
          { path: '/buscar', element: <BuscaGlobalPage /> },
          { path: '/atividade', element: <AtividadePage /> },
          { path: '/agents', element: <AgentsOrchestrationPage /> },
          { path: '/agents/agent1-analisador-us', element: <AgentUsAnalyserPage /> },
          { path: '/agents/analises', element: <UsAnalysesPage /> },
          { path: '/agents/analises/:executionId', element: <UsAnalysisDetailPage /> },
          { path: '/minha-area', element: <MinhaAreaPage /> },
          { path: '/projetos', element: <ProjetosListPage /> },
          { path: '/projetos/novo', element: <ProjetoFormPage mode="create" /> },
          { path: '/projetos/:id/editar', element: <ProjetoFormPage mode="edit" /> },
          { path: '/projetos/:id/ecossistema', element: <ProjetoEcossistemaPage /> },
          { path: '/projetos/:id/fontes', element: <ProjetoFontesPage /> },
          { path: '/projetos/:id', element: <ProjetoDetailPage /> },
          { path: '/projetos/:projetoId/times', element: <TimesSetupPage /> },
          { path: '/projetos/:projetoId/pessoas', element: <PessoasSetupPage /> },
          { path: '/projetos/:projetoId/produtos', element: <ProdutosSetupPage /> },
          { path: '/projetos/:projetoId/regras', element: <RegrasSetupPage /> },
          { path: '/projetos/:projetoId/documentos', element: <ProjetoDocumentosPage /> },
          { path: '/projetos/:projetoId/documentos/novo', element: <DocumentoFormPage mode="create" /> },
          { path: '/projetos/:projetoId/documentos/:documentoId', element: <DocumentoDetailPage /> },
          { path: '/projetos/:projetoId/documentos/:documentoId/editar', element: <DocumentoFormPage mode="edit" /> },
          { path: '/projetos/:projetoId/produtos/novo', element: <ProdutoFormPage mode="create" /> },
          { path: '/projetos/:projetoId/times/:timeId', element: <TimeDetailPage /> },
          { path: '/projetos/:projetoId/pessoas/:pessoaId', element: <PessoaDetailPage /> },
          { path: '/projetos/:projetoId/produtos/:produtoId', element: <ProdutoDetailPage /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/editar', element: <ProdutoFormPage mode="edit" /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/publico-alvo/novo', element: <PublicoAlvoFormPage mode="create" /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/publico-alvo/:publicoAlvoId', element: <PublicoAlvoDetailPage /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/publico-alvo/:publicoAlvoId/editar', element: <PublicoAlvoFormPage mode="edit" /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/modulos/:moduloId', element: <ModuloDetailPage /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/funcionalidades/:funcionalidadeId', element: <FuncionalidadeDetailPage /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/jornadas/:jornadaId', element: <JornadaDetailPage /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/regras/:regraId', element: <RegraDetailPage /> },
          { path: '/projetos/:projetoId/produtos/:produtoId/integracoes/:integracaoId', element: <IntegracaoDetailPage /> },
        ],
      },
    ],
  },
]);
