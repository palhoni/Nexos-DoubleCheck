import { httpClient } from '@/lib/httpClient';

export interface RunUsAnalyserInput {
  projetoId: string;
  titulo?: string;
  requisito: string;
}

export interface ExtractedRequirementFile {
  nome: string;
  texto: string;
  paginas: number;
  tituloSugerido: string;
  truncado: boolean;
}

export interface UsAnalyserResult {
  agent: string;
  provider: 'GitHub Copilot';
  projeto: { id: string; nome: string; codigo: string };
  titulo: string;
  resultado: string;
  analise: StructuredUsAnalysis;
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
}

export interface StructuredUsAnalysis {
  requisito: {
    identificador: string;
    titulo: string;
    resumo: string;
    modo: string;
    escopo: string;
    criteriosAceite: string[];
  };
  requisitoReescrito: {
    titulo: string;
    historiaUsuario: string;
    contexto: string;
    objetivo: string;
    escopoIncluido: string[];
    escopoFora: string[];
    criteriosAceite: Array<{ id: string; descricao: string; tipo: string }>;
    dependencias: string[];
    premissas: string[];
    pendencias: string[];
  };
  gate: {
    status: 'PASS' | 'CONDITIONAL' | 'FAIL';
    coerencia: { nota: number; justificativa: string };
    completude: { nota: number; justificativa: string };
    testabilidade: { nota: number; justificativa: string };
    findings: Array<{ categoria: string; severidade: string; trecho: string; recomendacao: string }>;
    decisoesHumanas: string[];
  };
  regrasNegocio: Array<{ id: string; regra: string; origem: string; status: string; risco: string }>;
  perguntasRefinamento: Array<{ id: string; pergunta: string; trechoOrigem: string; riscoMitigado: string; criticidade: string }>;
  cenariosTeste: Array<{
    id: string;
    titulo: string;
    tipo: string;
    execucao: string;
    escopo: string;
    dado: string;
    quando: string;
    entao: string;
    criterioRelacionado: string;
  }>;
  riscosAdicionais: string[];
}

export type AgentExecutionStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type AgentExecutionPhase = 'queued' | 'context' | 'copilot' | 'requirement' | 'gate' | 'rules' | 'questions' | 'scenarios' | 'structuring' | 'completed' | 'failed';

export interface AgentExecutionJob {
  id: string;
  status: AgentExecutionStatus;
  phase: AgentExecutionPhase;
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  live: {
    characters: number;
    title: string | null;
    gateStatus: string | null;
    rules: number;
    questions: number;
    scenarios: number;
  };
  result?: UsAnalyserResult;
  error?: string;
}

export interface AgentExecutionHistoryItem {
  id: string;
  titulo: string | null;
  status: AgentExecutionStatus;
  phase: AgentExecutionPhase;
  progress: number;
  message: string;
  error: string | null;
  hasResult: boolean;
  parcial: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  projeto: { id: string; nome: string; codigo: string };
  actorUser: { id: string; nome: string; email: string };
}

export interface StructuredTestPlan {
  resumo: { usId: string; titulo: string; escopo: string; status: string; estrategia: string };
  revisaoIndependente: {
    osOriginalRevisada: boolean;
    analiseAgent1Revisada: boolean;
    conclusao: string;
    decisaoNovosCasos: string;
    justificativa: string;
    divergencias: Array<{ id: string; tipo: string; descricao: string; impacto: string }>;
  };
  cobertura: Array<{ categoria: string; requisitos: number; cobertos: number; percentual: number; avaliacao: string }>;
  rastreabilidade: Array<{ requisitoId: string; requisito: string; cenarioIds: string[]; cobertura: string }>;
  gaps: Array<{ id: string; categoria: string; severidade: string; descricao: string; requisitoRelacionado: string; assuncao: boolean }>;
  casosRecomendados: Array<{ id: string; gapId: string; nome: string; categoria: string; escopo: string; precondicoes: string[]; passos: string[]; resultadoEsperado: string; automacao: string; prioridade: string }>;
  bloqueadores: Array<{ id: string; descricao: string; afeta: string[] }>;
  checklist: { bloqueadores: string[]; ordemImplementacao: string[] };
  frontendForaEscopo: Array<{ cenarioId: string; titulo: string; motivo: string }>;
  totais: { requisitos: number; cobertos: number; gaps: number; casosRecomendados: number; bloqueadores: number; frontend: number };
}

export interface TestPlanMonitoring {
  model?: string;
  finishReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  providerDurationMs?: number;
  requestId?: string;
  serviceRequestId?: string;
  streamedCharacters: number;
  finalCharacters: number;
  streamedBytes?: number;
  lastChunkAt?: string;
  finalReceivedAt?: string;
  idleAborted: boolean;
  contextTruncations: number;
  modelFailure?: string;
  jsonValid: boolean;
  contractValid: boolean;
  validationErrors: string[];
  detected: { gaps: number; cases: number; blockers: number };
  structured: { gaps: number; cases: number; blockers: number; frontend: number };
}

export interface TestDesignerResult {
  agent: 'agent2-desenhista-testes';
  provider: 'GitHub Copilot';
  projeto: { id: string; nome: string; codigo: string };
  sourceExecutionId: string;
  titulo: string;
  resultado: string;
  plano: StructuredTestPlan;
  monitoramento: TestPlanMonitoring;
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
}

export interface TestDesignerJob {
  id: string;
  status: AgentExecutionStatus;
  phase: string;
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  live: { characters: number; gaps: number; cases: number; blockers: number; lastChunkAt?: string; model?: string; inputTokens?: number; outputTokens?: number; finishReason?: string };
  result?: TestDesignerResult;
  error?: string;
}

export interface TestDesignerHistoryItem {
  id: string;
  titulo: string | null;
  sourceExecutionId: string;
  status: AgentExecutionStatus;
  phase: string;
  progress: number;
  message: string;
  error: string | null;
  hasResult: boolean;
  parcial: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  projeto: { id: string; nome: string; codigo: string };
}

export async function runUsAnalyser(input: RunUsAnalyserInput) {
  const { data } = await httpClient.post<UsAnalyserResult>('/agents/analisador-us/executar', input);
  return data;
}

export async function startUsAnalyser(input: RunUsAnalyserInput) {
  const { data } = await httpClient.post<AgentExecutionJob>('/agents/analisador-us/iniciar', input);
  return data;
}

export async function getAgentExecution(id: string) {
  const { data } = await httpClient.get<AgentExecutionJob>(`/agents/execucoes/${id}`);
  return data;
}

export async function listAgentExecutions(projetoId?: string) {
  const { data } = await httpClient.get<AgentExecutionHistoryItem[]>('/agents/execucoes', {
    params: projetoId ? { projetoId } : undefined,
  });
  return data;
}

export async function extractRequirementFile(file: File) {
  const body = new FormData();
  body.append('arquivo', file);
  const { data } = await httpClient.post<ExtractedRequirementFile>('/agents/requisitos/extrair', body);
  return data;
}

export async function startTestDesigner(analysisExecutionId: string) {
  const { data } = await httpClient.post<TestDesignerJob>('/agents/desenhista-testes/iniciar', { analysisExecutionId });
  return data;
}

export async function getTestDesignerExecution(id: string) {
  const { data } = await httpClient.get<TestDesignerJob>(`/agents/desenhista-testes/execucoes/${id}`);
  return data;
}

export async function listTestDesignerExecutions(analysisExecutionId?: string) {
  const { data } = await httpClient.get<TestDesignerHistoryItem[]>('/agents/desenhista-testes/execucoes', { params: analysisExecutionId ? { analysisExecutionId } : undefined });
  return data;
}
