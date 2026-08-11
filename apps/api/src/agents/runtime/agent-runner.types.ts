/**
 * Contratos compartilhados entre os runtimes de execução de Agents (texto e agentic).
 * Nenhum tipo aqui deve vazar detalhes específicos de um provedor (Claude, Copilot, ...).
 */

export type AgentRuntime = 'text' | 'agentic';

export type NormalizedStopReason =
  'end_turn' | 'max_tokens' | 'refusal' | 'tool_use' | 'aborted' | 'error';

export interface NormalizedUsage {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  providerDurationMs?: number;
  providerRequestId?: string;
}

export interface NormalizedToolCall {
  seq: number;
  name: string;
  input: unknown;
  decision: 'auto' | 'allow' | 'deny';
  isError?: boolean;
  resultPreview?: string;
  startedAt: string;
  completedAt?: string;
}

export interface AgentRunHooks {
  onText: (delta: string) => void;
  onToolCall?: (call: NormalizedToolCall) => void;
  onUsage?: (usage: NormalizedUsage) => void;
}

export interface AgentRunRequest {
  /** Identificador do agent (bate com o nome do arquivo em .claude/agents/). */
  agentId: string;
  executionId: string;
  /** Conteúdo dinâmico desta execução (contexto do projeto, requisito, etc.). */
  userPrompt: string;
  /** Modelo Claude a usar (ex.: "claude-opus-5"). Se omitido, o runner usa o default configurado. */
  model?: string;
  maxTokens?: number;
  timeoutMs: number;
  signal: AbortSignal;
  hooks: AgentRunHooks;
}

export interface AgentRunResult {
  text: string;
  usage: NormalizedUsage;
  stopReason: NormalizedStopReason;
  stopCategory?: string;
  toolCalls: NormalizedToolCall[];
  durationMs: number;
}

export class AgentTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(
      `A execução ultrapassou o limite de ${Math.round(timeoutMs / 60_000)} minutos sem concluir.`,
    );
    this.name = 'AgentTimeoutError';
  }
}

export class AgentRefusalError extends Error {
  constructor(public readonly category?: string) {
    super(
      `O modelo recusou a execução por política de segurança${category ? ` (categoria: ${category})` : ''}.`,
    );
    this.name = 'AgentRefusalError';
  }
}
