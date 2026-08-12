export type AgentStage = 'conhecimento' | 'requisitos' | 'descoberta' | 'planejamento' | 'qualidade';

/**
 * 'live'    — tem execução real conectada ao backend (Live Agent Office mostra estado real).
 * 'planned' — ainda é só a definição do agent (.claude/agents/*.md); no Live Agent Office
 *             aparece com reação cosmética de "apoio" enquanto um agent live está processando,
 *             e nunca gera uma execução real no banco.
 */
export type AgentIntegration = 'live' | 'planned';

export interface AgentCatalogRoutes {
  start?: string;
  list?: string;
  detail?: (executionId: string) => string;
}

export interface AgentCatalogItem {
  id: string;
  number: number;
  name: string;
  shortName: string;
  description: string;
  stage: AgentStage;
  /** Caminho da definição do agent no formato de subagent do Claude Code. */
  definitionPath: string;
  capabilities: string[];
  integration: AgentIntegration;
  routes?: AgentCatalogRoutes;
  /** Frase exibida na estação quando o agent está apenas "apoiando" (cosmético, ainda não conectado). */
  supportMessage: string;
}

export const AGENT_STAGES: Array<{ id: AgentStage; label: string; subtitle: string; tone: string }> = [
  { id: 'conhecimento', label: 'Conhecimento', subtitle: 'Estrutura e narrativa do produto', tone: 'blue' },
  { id: 'requisitos', label: 'Requisitos', subtitle: 'Entendimento e refinamento', tone: 'violet' },
  { id: 'descoberta', label: 'Descoberta', subtitle: 'Exploração funcional e técnica', tone: 'teal' },
  { id: 'planejamento', label: 'Planejamento', subtitle: 'Cobertura e preparação', tone: 'amber' },
  { id: 'qualidade', label: 'Qualidade', subtitle: 'Execução, evidências e confiança', tone: 'red' },
];

export const AGENTS_CATALOG: AgentCatalogItem[] = [
  {
    id: 'agent-mapeador-jornadas',
    number: 10,
    name: 'Mapeador de Jornadas',
    shortName: 'Mapeador de Jornadas',
    description: 'Audita a cobertura de Jornadas de um produto e cria ou estende jornadas para os fluxos ponta-a-ponta ainda não mapeados.',
    stage: 'conhecimento',
    definitionPath: '.claude/agents/agent-mapeador-jornadas.md',
    capabilities: ['Auditoria de cobertura', 'Jornadas novas e estendidas', 'Narrativa ponta-a-ponta'],
    integration: 'live',
    routes: {
      start: '/agents/mapeador-jornadas',
    },
    supportMessage: 'Costurando funcionalidades em jornadas.',
  },
  {
    id: 'agent1-analisador-us',
    number: 1,
    name: 'Agente 1 — Analisador de US',
    shortName: 'Analisador de US',
    description: 'Analisa requisitos, mede a qualidade da US, levanta dúvidas e cria cenários orientados a risco.',
    stage: 'requisitos',
    definitionPath: '.claude/agents/agent1-analisador-us.md',
    capabilities: ['Gate de qualidade', 'Perguntas de refinamento', 'Cenários de teste'],
    integration: 'live',
    routes: {
      start: '/agents/agent1-analisador-us',
      list: '/agents/analises',
      detail: (executionId) => `/agents/analises/${executionId}`,
    },
    supportMessage: 'Validando aderência à OS refinada.',
  },
  {
    id: 'agent3-engenheiro-reverso-frontend',
    number: 3,
    name: 'Agente 3 — Engenheiro Reverso de Frontend',
    shortName: 'Engenheiro Reverso',
    description: 'Navega nas telas, registra o comportamento observado e produz uma US reversa do produto.',
    stage: 'descoberta',
    definitionPath: '.claude/agents/agent3-engenheiro-reverso-frontend.md',
    capabilities: ['Navegação real', 'US reversa', 'Seletores e fluxos'],
    integration: 'planned',
    supportMessage: 'Revisando impacto nos fluxos de tela.',
  },
  {
    id: 'agent4-descobridor-endpoints',
    number: 4,
    name: 'Agente 4 — Descobridor de Endpoints',
    shortName: 'Descobridor de Endpoints',
    description: 'Cataloga chamadas de rede, normaliza endpoints e organiza o backlog técnico por prioridade.',
    stage: 'descoberta',
    definitionPath: '.claude/agents/agent4-descobridor-endpoints.md',
    capabilities: ['Catálogo de API', 'Priorização', 'Backlog de endpoints'],
    integration: 'live',
    routes: {
      start: '/agents/descobridor-endpoints',
      list: '/agents/endpoints',
    },
    supportMessage: 'Conferindo contratos e integrações.',
  },
  {
    id: 'agent2-desenhista-testes',
    number: 2,
    name: 'Agente 2 — Desenhista de Testes',
    shortName: 'Desenhista de Testes',
    description: 'Transforma a análise em cobertura, estrutura de automação e checklist de implementação.',
    stage: 'planejamento',
    definitionPath: '.claude/agents/agent2-desenhista-testes.md',
    capabilities: ['Análise de cobertura', 'Scaffolding', 'Mapeamento de cenários'],
    integration: 'live',
    routes: {
      list: '/agents/planos-teste',
    },
    supportMessage: 'Validando aderência à OS refinada.',
  },
  {
    id: 'agent9-auditor',
    number: 9,
    name: 'Agente 9 — Auditor de Testes',
    shortName: 'Auditor de Testes',
    description: 'Audita os guardrails da suíte e aponta testes frágeis antes que a execução seja iniciada.',
    stage: 'planejamento',
    definitionPath: '.claude/agents/agent9-auditor.md',
    capabilities: ['Guardrails', 'Qualidade da suíte', 'Mutation testing'],
    integration: 'planned',
    supportMessage: 'Auditando cobertura e guardrails.',
  },
  {
    id: 'agent5-executor-testes-api',
    number: 5,
    name: 'Agente 5 — Executor de Testes API',
    shortName: 'Executor de Testes',
    description: 'Executa a suíte autorizada, coleta evidências e consolida os resultados da rodada.',
    stage: 'qualidade',
    definitionPath: '.claude/agents/agent5-executor-testes-api.md',
    capabilities: ['Execução de suíte', 'Evidências', 'Relatórios'],
    integration: 'planned',
    supportMessage: 'Preparando a estratégia de execução.',
  },
  {
    id: 'agent6-detetive-falhas',
    number: 6,
    name: 'Agente 6 — Detetive de Falhas',
    shortName: 'Detetive de Falhas',
    description: 'Investiga cada falha e distingue bug real, ambiente, flakiness e teste incorreto.',
    stage: 'qualidade',
    definitionPath: '.claude/agents/agent6-detetive-falhas.md',
    capabilities: ['Triage', 'Causa raiz', 'Flakiness'],
    integration: 'planned',
    supportMessage: 'Mapeando riscos e pontos de falha.',
  },
  {
    id: 'agent7-gerador-bug-report',
    number: 7,
    name: 'Agente 7 — Gerador de Bug Report',
    shortName: 'Gerador de Bug Report',
    description: 'Transforma falhas confirmadas em relatos rastreáveis, completos e apoiados por evidências.',
    stage: 'qualidade',
    definitionPath: '.claude/agents/agent7-gerador-bug-report.md',
    capabilities: ['Bug report', 'Evidência técnica', 'Índice de bugs'],
    integration: 'live',
    routes: {
      start: '/agents/gerador-bug-report',
      list: '/agents/bugs',
    },
    supportMessage: 'Organizando evidências e rastreabilidade.',
  },
  {
    id: 'agent8-retest',
    number: 8,
    name: 'Agente 8 — Retest',
    shortName: 'Retest',
    description: 'Confirma correções, verifica regressões e atualiza o estado final de cada bug.',
    stage: 'qualidade',
    definitionPath: '.claude/agents/agent8-retest.md',
    capabilities: ['Confirmação de correção', 'Regressão', 'Encerramento'],
    integration: 'planned',
    supportMessage: 'Preparando critérios para o reteste.',
  },
];

export const isLive = (agent: AgentCatalogItem) => agent.integration === 'live';
export const LIVE_AGENTS = AGENTS_CATALOG.filter(isLive);
export const AGENT_BY_ID = new Map(AGENTS_CATALOG.map((agent) => [agent.id, agent] as const));
