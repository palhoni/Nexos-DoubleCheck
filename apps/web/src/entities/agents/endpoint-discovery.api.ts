import { httpClient } from '@/lib/httpClient';
import type { AgentExecutionStatus } from './agent-execution.api';

export type EndpointSourceType = 'agente3' | 'collection' | 'swagger-url' | 'swagger-arquivo' | 'network-log' | 'manual';

export const ENDPOINT_SOURCE_LABELS: Record<EndpointSourceType, string> = {
  'agente3': 'Captura do Agente 3',
  'collection': 'Collection Bruno/Postman',
  'swagger-url': 'Swagger/OpenAPI (URL)',
  'swagger-arquivo': 'Swagger/OpenAPI (arquivo colado)',
  'network-log': 'Logs de rede',
  'manual': 'Lista manual',
};

export interface EndpointSourceInput {
  tipo: EndpointSourceType;
  url?: string;
  conteudo?: string;
}

export interface StartEndpointDiscoveryInput {
  projetoId: string;
  sistema: string;
  fontes: EndpointSourceInput[];
}

export interface EndpointItem {
  id: string;
  metodo: string;
  endpoint: string;
  descricao: string;
  autenticacao: string;
  prioridade: 'Alta' | 'Média' | 'Baixa';
  criterioPrioridade: string;
  observadoEm: string[];
  notas?: string;
}

export interface EndpointDiscoveryResult {
  agent: 'agent4-descobridor-endpoints';
  provider: 'Anthropic';
  projeto: { id: string; nome: string; codigo: string };
  sistema: string;
  endpoints: EndpointItem[];
  totais: { descobertos: number; alta: number; media: number; baixa: number };
  inconsistencias: string[];
  naoDocumentados: string[];
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
  backlogId?: string;
}

export interface EndpointDiscoveryJob {
  id: string;
  status: AgentExecutionStatus;
  phase: string;
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  live: { characters: number };
  result?: EndpointDiscoveryResult;
  error?: string;
}

export interface EndpointDiscoveryHistoryItem {
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

export type EndpointDecision = 'Pendente' | 'Automatizar' | 'Adiar' | 'NaoAutomatizar' | 'Investigar';

export const ENDPOINT_DECISION_LABELS: Record<EndpointDecision, string> = {
  Pendente: '🔲 Pendente',
  Automatizar: '✅ Automatizar',
  Adiar: '⏸ Adiar',
  NaoAutomatizar: '❌ Não automatizar',
  Investigar: '🔍 Investigar',
};

export interface EndpointBacklogItemRecord {
  id: string;
  backlogId: string;
  codigo: string;
  metodo: string;
  endpoint: string;
  descricao: string;
  autenticacao: string;
  prioridade: string;
  criterioPrioridade: string;
  observadoEm: string[];
  notas: string | null;
  decisao: EndpointDecision;
  decisaoJustificativa: string | null;
  decididoPorUserId: string | null;
  decididoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EndpointBacklogSummary {
  id: string;
  sistema: string;
  createdAt: string;
  updatedAt: string;
  projeto: { id: string; nome: string; codigo: string };
  _count: { itens: number };
}

export interface EndpointBacklogDetail {
  id: string;
  sistema: string;
  createdAt: string;
  updatedAt: string;
  projeto: { id: string; nome: string; codigo: string };
  itens: EndpointBacklogItemRecord[];
}

export async function startEndpointDiscovery(input: StartEndpointDiscoveryInput): Promise<EndpointDiscoveryJob> {
  const { data } = await httpClient.post<EndpointDiscoveryJob>('/agents/descobridor-endpoints/iniciar', input);
  return data;
}

export async function getEndpointDiscoveryExecution(id: string): Promise<EndpointDiscoveryJob> {
  const { data } = await httpClient.get<EndpointDiscoveryJob>(`/agents/descobridor-endpoints/execucoes/${id}`);
  return data;
}

export async function listEndpointDiscoveryExecutions(projetoId?: string): Promise<EndpointDiscoveryHistoryItem[]> {
  const { data } = await httpClient.get<EndpointDiscoveryHistoryItem[]>('/agents/descobridor-endpoints/execucoes', { params: projetoId ? { projetoId } : undefined });
  return data;
}

export async function listEndpointBacklogs(projetoId?: string): Promise<EndpointBacklogSummary[]> {
  const { data } = await httpClient.get<EndpointBacklogSummary[]>('/agents/endpoints/backlogs', { params: projetoId ? { projetoId } : undefined });
  return data;
}

export async function getEndpointBacklog(id: string): Promise<EndpointBacklogDetail> {
  const { data } = await httpClient.get<EndpointBacklogDetail>(`/agents/endpoints/backlogs/${id}`);
  return data;
}

export async function updateEndpointDecision(backlogId: string, itemId: string, payload: { decisao: EndpointDecision; justificativa?: string }): Promise<EndpointBacklogItemRecord> {
  const { data } = await httpClient.patch<EndpointBacklogItemRecord>(`/agents/endpoints/backlogs/${backlogId}/itens/${itemId}`, payload);
  return data;
}
