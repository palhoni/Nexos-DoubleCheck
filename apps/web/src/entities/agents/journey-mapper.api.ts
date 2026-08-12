import { httpClient } from '@/lib/httpClient';
import type { AgentExecutionStatus } from './agent-execution.api';

export type JourneyMapperPhase =
  | 'queued'
  | 'auditando-cobertura'
  | 'compondo-narrativas'
  | 'persistindo'
  | 'completed'
  | 'failed';

export interface StartJourneyMapperInput {
  produtoId: string;
  foco?: string;
}

export interface JourneyMapperForaDeEscopoItem {
  funcionalidadeId: string;
  motivo: string;
}

export interface JourneyMapperResult {
  agent: 'agent-mapeador-jornadas';
  provider: 'Anthropic';
  produto: { id: string; nome: string; codigo: string; projetoId: string };
  foco?: string;
  cobertura: { funcionalidadesTotais: number; cobertasAntes: number; cobertasDepois: number };
  jornadasCriadas: Array<{ id: string; nome: string }>;
  jornadasEstendidas: Array<{ id: string; nome: string; funcionalidadesAdicionadas: number; etapasAdicionadas: number }>;
  relacionamentos: { regras: number; produtosParticipantes: number; fontes: number; documentos: number };
  foraDeEscopo: JourneyMapperForaDeEscopoItem[];
  erros: string[];
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
}

export interface JourneyMapperJob {
  id: string;
  status: AgentExecutionStatus;
  phase: JourneyMapperPhase;
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  live: { characters: number };
  result?: JourneyMapperResult;
  error?: string;
}

export interface JourneyMapperHistoryItem {
  id: string;
  titulo: string | null;
  status: AgentExecutionStatus;
  phase: string;
  progress: number;
  message: string;
  error: string | null;
  hasResult: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  projeto: { id: string; nome: string; codigo: string };
  actorUser: { id: string; nome: string; email: string };
}

export async function startJourneyMapper(input: StartJourneyMapperInput): Promise<JourneyMapperJob> {
  const { data } = await httpClient.post<JourneyMapperJob>('/agents/mapeador-jornadas/iniciar', input);
  return data;
}

export async function getJourneyMapperExecution(id: string): Promise<JourneyMapperJob> {
  const { data } = await httpClient.get<JourneyMapperJob>(`/agents/mapeador-jornadas/execucoes/${id}`);
  return data;
}

export async function listJourneyMapperExecutions(projetoId?: string): Promise<JourneyMapperHistoryItem[]> {
  const { data } = await httpClient.get<JourneyMapperHistoryItem[]>('/agents/mapeador-jornadas/execucoes', { params: projetoId ? { projetoId } : undefined });
  return data;
}
