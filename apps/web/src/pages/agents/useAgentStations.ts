import { useMemo } from 'react';
import { AGENTS_CATALOG, isLive, type AgentCatalogItem } from './agents.catalog';
import type { AgentExecutionStatus } from '@/entities/agents/agent-execution.api';

export type LiveExecution = {
  id: string;
  agentId: string;
  title: string;
  status: AgentExecutionStatus;
  progress: number;
  message: string;
  partial: boolean;
  updatedAt: string;
  projectId: string;
};

export type StationState = 'working' | 'supporting' | 'collaborating' | 'queued' | 'done' | 'attention' | 'idle' | 'offline';

export type AgentStation = {
  agent: AgentCatalogItem;
  state: StationState;
  execution?: LiveExecution;
  reaction?: string;
  displayProgress?: number;
  collaborationExecutionId?: string;
};

export function executionState(execution?: LiveExecution): StationState {
  if (!execution) return 'idle';
  if (execution.status === 'processing') return 'working';
  if (execution.status === 'queued') return 'queued';
  if (execution.status === 'failed' || execution.partial) return 'attention';
  return 'done';
}

export function designerReaction(progress: number, now: number) {
  const reactions = progress < 20
    ? ['Me conte o objetivo principal.', 'Vou mapear os primeiros riscos.']
    : progress < 45
      ? ['Esse critério é observável?', 'Temos dados para esse cenário?']
      : progress < 70
        ? ['Encontrei uma borda importante.', 'Vou confrontar isso com a OS.']
        : progress < 90
          ? ['Esses casos cobrem o risco?', 'Estou verificando a rastreabilidade.']
          : ['Entendimento alinhado.', 'Pronto para revisar a cobertura.'];
  return reactions[Math.floor(now / 6000) % reactions.length];
}

/**
 * Deriva o estado visual de cada estação do Live Agent Office a partir das
 * execuções reais em andamento. Regra de precedência (é o que corrige o bug
 * em que o Agent 1 "sumia" atrás do estado cosmético de apoio do Agent 2):
 *
 *   1. Agents `live` SEMPRE mostram seu estado real — nunca são sobrescritos
 *      pela reação cosmética de apoio dos agents `planned`.
 *   2. Agents `planned` mostram "apoiando" (cosmético, nunca persistido no
 *      backend) só enquanto o Agent 2 está produzindo um plano; caso
 *      contrário ficam "offline" (ainda não conectados).
 */
export function useAgentStations({ executions, now }: { executions: LiveExecution[]; now: number }) {
  const analyzerExecution = executions.find((item) => item.agentId === 'agent1-analisador-us');
  const designerExecution = executions.find((item) => item.agentId === 'agent2-desenhista-testes');
  const analyzerIsActive = analyzerExecution?.status === 'processing' || analyzerExecution?.status === 'queued';
  const refinementMeetingActive = analyzerExecution?.status === 'processing';
  const designerProductionActive = designerExecution?.status === 'processing';

  // Ordem do catálogo já é a ordem de rotação desejada (3, 4, 9, 5, 6, 7, 8).
  const supportAgentNumbers = useMemo(() => AGENTS_CATALOG.filter((agent) => !isLive(agent)).map((agent) => agent.number), []);
  const reactingSupportAgent = supportAgentNumbers.length ? supportAgentNumbers[Math.floor(now / 5000) % supportAgentNumbers.length] : undefined;

  const stations = useMemo<AgentStation[]>(() => AGENTS_CATALOG.map((agent) => {
    const execution = executions.find((item) => item.agentId === agent.id);

    if (isLive(agent)) {
      if (agent.id === 'agent2-desenhista-testes' && analyzerIsActive && analyzerExecution && execution?.status !== 'processing' && execution?.status !== 'queued') {
        return { agent, execution, state: 'collaborating', reaction: designerReaction(analyzerExecution.progress, now), displayProgress: analyzerExecution.progress, collaborationExecutionId: analyzerExecution.id };
      }
      return { agent, execution, state: executionState(execution) };
    }

    if (designerProductionActive && designerExecution) {
      return { agent, state: 'supporting', reaction: agent.number === reactingSupportAgent ? agent.supportMessage : undefined, displayProgress: designerExecution.progress };
    }
    return { agent, state: 'offline' };
  }), [analyzerExecution, analyzerIsActive, designerExecution, designerProductionActive, executions, now, reactingSupportAgent]);

  const collaborationActive = stations.some((item) => item.state === 'collaborating');
  const activeCount = refinementMeetingActive || designerProductionActive
    ? stations.length
    : stations.filter((item) => item.state === 'working' || item.state === 'collaborating' || item.state === 'queued').length;
  const attentionCount = stations.filter((item) => item.state === 'attention').length;

  return {
    stations,
    analyzerExecution,
    designerExecution,
    analyzerIsActive,
    refinementMeetingActive,
    designerProductionActive,
    collaborationActive,
    activeCount,
    attentionCount,
  };
}
