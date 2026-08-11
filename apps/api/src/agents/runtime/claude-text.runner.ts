import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AgentRunner } from './agent-runner';
import {
  AgentRunRequest,
  AgentRunResult,
  AgentRuntime,
  AgentTimeoutError,
  NormalizedStopReason,
  NormalizedUsage,
} from './agent-runner.types';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-opus-5';
const DEFAULT_MAX_TOKENS =
  Number(process.env.AGENT_MAX_OUTPUT_TOKENS) || 32_000;
const DEFAULT_EFFORT =
  (process.env
    .AGENT_EFFORT_DEFAULT as Anthropic.Messages.OutputConfig['effort']) ||
  'high';

/** Um bloco do `system` — a persona (cacheável) ou as regras/contrato desta execução (também cacheável, pois só o prompt do usuário varia de fato). */
export interface ClaudeSystemBlock {
  text: string;
  cache?: boolean;
}

export interface ClaudeTextRunRequest extends AgentRunRequest {
  system: ClaudeSystemBlock[];
}

function mapStopReason(
  reason: Anthropic.Messages.StopReason | null,
): NormalizedStopReason {
  switch (reason) {
    case 'max_tokens':
      return 'max_tokens';
    case 'refusal':
      return 'refusal';
    case 'tool_use':
      return 'tool_use';
    case 'end_turn':
    case 'stop_sequence':
    case 'pause_turn':
    case 'model_context_window_exceeded':
    default:
      return 'end_turn';
  }
}

/**
 * Runtime de texto — usado pelos Agents que não precisam tocar um repositório
 * real (Agent 1, Agent 2 no escopo de plano JSON, Agent 4, Agent 6 v1, Agent 7,
 * Agent 9). Usa a Messages API pura: sem ferramentas, com prompt cacheado e sem
 * o peso de um harness agentic.
 */
@Injectable()
export class ClaudeTextRunner extends AgentRunner {
  readonly runtime: AgentRuntime = 'text';
  private readonly logger = new Logger(ClaudeTextRunner.name);
  private readonly client = new Anthropic();

  async run(request: ClaudeTextRunRequest): Promise<AgentRunResult> {
    const startedAt = Date.now();
    const model = request.model || DEFAULT_MODEL;
    const maxTokens = request.maxTokens || DEFAULT_MAX_TOKENS;

    const stream = this.client.messages.stream(
      {
        model,
        max_tokens: maxTokens,
        thinking: { type: 'adaptive' },
        output_config: { effort: DEFAULT_EFFORT },
        system: request.system.map((block) => ({
          type: 'text' as const,
          text: block.text,
          ...(block.cache
            ? { cache_control: { type: 'ephemeral' as const } }
            : {}),
        })),
        messages: [{ role: 'user', content: request.userPrompt }],
      },
      { signal: request.signal },
    );

    stream.on('text', (delta) => request.hooks.onText(delta));

    let finalMessage: Anthropic.Message;
    try {
      finalMessage = await stream.finalMessage();
    } catch (error) {
      if (request.signal.aborted) {
        throw new AgentTimeoutError(request.timeoutMs);
      }
      throw error;
    }

    const text = finalMessage.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const stopReason = mapStopReason(finalMessage.stop_reason);
    const stopCategory = finalMessage.stop_details?.category ?? undefined;

    const usage: NormalizedUsage = {
      model: finalMessage.model,
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      cacheReadTokens: finalMessage.usage.cache_read_input_tokens ?? undefined,
      cacheCreationTokens:
        finalMessage.usage.cache_creation_input_tokens ?? undefined,
      providerDurationMs: Date.now() - startedAt,
      providerRequestId: stream.request_id ?? undefined,
    };
    request.hooks.onUsage?.(usage);

    if (stopReason === 'refusal') {
      this.logger.warn(
        `Recusa do modelo ao executar ${request.agentId} (execução ${request.executionId}, categoria: ${stopCategory ?? 'não informada'})`,
      );
    }

    // stopReason vai no resultado — quem decide se isso é uma falha (e como reportar)
    // é o serviço do agent, não o runner. Ex.: 'refusal'/'max_tokens' podem virar um
    // resultado parcial em vez de uma exceção, dependendo do agent.
    return {
      text,
      usage,
      stopReason,
      stopCategory,
      toolCalls: [],
      durationMs: Date.now() - startedAt,
    };
  }
}
