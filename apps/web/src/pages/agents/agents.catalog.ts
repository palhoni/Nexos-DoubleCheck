export type AgentStage = 'requisitos' | 'descoberta' | 'planejamento' | 'qualidade';

export interface AgentCatalogItem {
  id: string;
  number: number;
  name: string;
  shortName: string;
  description: string;
  stage: AgentStage;
  command: string;
  capabilities: string[];
}

export const AGENT_STAGES: Array<{ id: AgentStage; label: string; subtitle: string; tone: string }> = [
  { id: 'requisitos', label: 'Requisitos', subtitle: 'Entendimento e refinamento', tone: 'violet' },
  { id: 'descoberta', label: 'Descoberta', subtitle: 'Exploração funcional e técnica', tone: 'teal' },
  { id: 'planejamento', label: 'Planejamento', subtitle: 'Cobertura e preparação', tone: 'amber' },
  { id: 'qualidade', label: 'Qualidade', subtitle: 'Execução, evidências e confiança', tone: 'red' },
];

export const AGENTS_CATALOG: AgentCatalogItem[] = [
  {
    id: 'agent1-analisador-us',
    number: 1,
    name: 'Agente 1 — Analisador de US',
    shortName: 'Analisador de US',
    description: 'Analisa requisitos, mede a qualidade da US, levanta dúvidas e cria cenários orientados a risco.',
    stage: 'requisitos',
    command: '/agent1-analisador-us',
    capabilities: ['Gate de qualidade', 'Perguntas de refinamento', 'Cenários de teste'],
  },
  {
    id: 'agent3-engenheiro-reverso-frontend',
    number: 3,
    name: 'Agente 3 — Engenheiro Reverso de Frontend',
    shortName: 'Engenheiro Reverso',
    description: 'Navega nas telas, registra o comportamento observado e produz uma US reversa do produto.',
    stage: 'descoberta',
    command: '/agent3-engenheiro-reverso-frontend',
    capabilities: ['Navegação real', 'US reversa', 'Seletores e fluxos'],
  },
  {
    id: 'agent4-descobridor-endpoints',
    number: 4,
    name: 'Agente 4 — Descobridor de Endpoints',
    shortName: 'Descobridor de Endpoints',
    description: 'Cataloga chamadas de rede, normaliza endpoints e organiza o backlog técnico por prioridade.',
    stage: 'descoberta',
    command: '/agent4-descobridor-endpoints',
    capabilities: ['Catálogo de API', 'Priorização', 'Backlog de endpoints'],
  },
  {
    id: 'agent2-desenhista-testes',
    number: 2,
    name: 'Agente 2 — Desenhista de Testes',
    shortName: 'Desenhista de Testes',
    description: 'Transforma a análise em cobertura, estrutura de automação e checklist de implementação.',
    stage: 'planejamento',
    command: '/agent2-desenhista-testes',
    capabilities: ['Análise de cobertura', 'Scaffolding', 'Mapeamento de cenários'],
  },
  {
    id: 'agent9-auditor',
    number: 9,
    name: 'Agente 9 — Auditor de Testes',
    shortName: 'Auditor de Testes',
    description: 'Audita os guardrails da suíte e aponta testes frágeis antes que a execução seja iniciada.',
    stage: 'planejamento',
    command: '/agent9-auditor',
    capabilities: ['Guardrails', 'Qualidade da suíte', 'Mutation testing'],
  },
  {
    id: 'agent5-executor-testes-api',
    number: 5,
    name: 'Agente 5 — Executor de Testes API',
    shortName: 'Executor de Testes',
    description: 'Executa a suíte autorizada, coleta evidências e consolida os resultados da rodada.',
    stage: 'qualidade',
    command: '/agent5-executor-testes-api',
    capabilities: ['Execução de suíte', 'Evidências', 'Relatórios'],
  },
  {
    id: 'agent6-detetive-falhas',
    number: 6,
    name: 'Agente 6 — Detetive de Falhas',
    shortName: 'Detetive de Falhas',
    description: 'Investiga cada falha e distingue bug real, ambiente, flakiness e teste incorreto.',
    stage: 'qualidade',
    command: '/agent6-detetive-falhas',
    capabilities: ['Triage', 'Causa raiz', 'Flakiness'],
  },
  {
    id: 'agent7-gerador-bug-report',
    number: 7,
    name: 'Agente 7 — Gerador de Bug Report',
    shortName: 'Gerador de Bug Report',
    description: 'Transforma falhas confirmadas em relatos rastreáveis, completos e apoiados por evidências.',
    stage: 'qualidade',
    command: '/agent7-gerador-bug-report',
    capabilities: ['Bug report', 'Evidência técnica', 'Índice de bugs'],
  },
  {
    id: 'agent8-retest',
    number: 8,
    name: 'Agente 8 — Retest',
    shortName: 'Retest',
    description: 'Confirma correções, verifica regressões e atualiza o estado final de cada bug.',
    stage: 'qualidade',
    command: '/agent8-retest',
    capabilities: ['Confirmação de correção', 'Regressão', 'Encerramento'],
  },
];
