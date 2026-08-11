import { httpClient } from '@/lib/httpClient';
import type { AgentExecutionStatus } from './agent-execution.api';

export interface StartBugReportInput {
  projetoId: string;
  tema?: string;
  evidencias: string;
}

export type BugSeveridade = 'Critical' | 'High' | 'Medium' | 'Low';
export type BugStatus = 'Aberto' | 'Corrigido' | 'Invalidado';

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  Aberto: '🔴 Aberto',
  Corrigido: '✅ Corrigido',
  Invalidado: '⚪ Invalidado',
};

export interface EvidenciaTecnica {
  metodo?: string;
  url?: string;
  headers?: string;
  payload?: string;
  responseStatus?: string;
  responseBody?: string;
}

export interface BugReportItem {
  titulo: string;
  tcIdRelacionado?: string;
  severidade: BugSeveridade;
  prioridadeSugerida?: string;
  ambiente?: string;
  descricao: string;
  passosReproducao: string[];
  resultadoObtido: string;
  resultadoEsperado: string;
  evidenciaTecnica?: EvidenciaTecnica;
  criterioAceiteViolado?: string;
  notasAdicionais?: string;
  codigo?: string;
}

export interface BugReportResult {
  agent: 'agent7-gerador-bug-report';
  provider: 'Anthropic';
  projeto: { id: string; nome: string; codigo: string };
  tema?: string;
  bugs: BugReportItem[];
  totais: { documentados: number; critical: number; high: number; medium: number; low: number };
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
}

export interface BugReportJob {
  id: string;
  status: AgentExecutionStatus;
  phase: string;
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  live: { characters: number };
  result?: BugReportResult;
  error?: string;
}

export interface BugReportHistoryItem {
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

export interface BugRecord {
  id: string;
  projetoId: string;
  executionId: string;
  codigo: string;
  titulo: string;
  tcIdRelacionado: string | null;
  severidade: BugSeveridade;
  prioridadeSugerida: string | null;
  ambiente: string | null;
  descricao: string;
  passosReproducao: string[];
  resultadoObtido: string;
  resultadoEsperado: string;
  evidenciaTecnica: EvidenciaTecnica | null;
  criterioAceiteViolado: string | null;
  notasAdicionais: string | null;
  status: BugStatus;
  createdAt: string;
  updatedAt: string;
  projeto: { id: string; nome: string; codigo: string };
}

export async function startBugReport(input: StartBugReportInput): Promise<BugReportJob> {
  const { data } = await httpClient.post<BugReportJob>('/agents/gerador-bug-report/iniciar', input);
  return data;
}

export async function getBugReportExecution(id: string): Promise<BugReportJob> {
  const { data } = await httpClient.get<BugReportJob>(`/agents/gerador-bug-report/execucoes/${id}`);
  return data;
}

export async function listBugReportExecutions(projetoId?: string): Promise<BugReportHistoryItem[]> {
  const { data } = await httpClient.get<BugReportHistoryItem[]>('/agents/gerador-bug-report/execucoes', { params: projetoId ? { projetoId } : undefined });
  return data;
}

export async function listBugs(projetoId?: string): Promise<BugRecord[]> {
  const { data } = await httpClient.get<BugRecord[]>('/agents/bugs', { params: projetoId ? { projetoId } : undefined });
  return data;
}

export async function getBug(id: string): Promise<BugRecord> {
  const { data } = await httpClient.get<BugRecord>(`/agents/bugs/${id}`);
  return data;
}

export async function updateBugStatus(id: string, status: BugStatus): Promise<BugRecord> {
  const { data } = await httpClient.patch<BugRecord>(`/agents/bugs/${id}/status`, { status });
  return data;
}
