import { httpClient } from '@/lib/httpClient';

export interface RunUsAnalyserInput {
  projetoId: string;
  titulo?: string;
  requisito: string;
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
