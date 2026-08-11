import type {
  AgentRunRequest,
  AgentRunResult,
  AgentRuntime,
} from './agent-runner.types';

/**
 * Interface comum entre o runtime de texto (Messages API) e o runtime agentic
 * (Claude Agent SDK, a ser implementado em fase futura). Os serviços de cada
 * Agent (AgentsService, TestDesignerService, ...) dependem só desta interface —
 * nunca de um SDK de provedor diretamente.
 */
export abstract class AgentRunner {
  abstract readonly runtime: AgentRuntime;
  abstract run(request: AgentRunRequest): Promise<AgentRunResult>;
}
