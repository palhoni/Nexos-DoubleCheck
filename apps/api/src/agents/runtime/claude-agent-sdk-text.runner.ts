import { Injectable, Logger } from '@nestjs/common';
import type { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { AgentRunner } from './agent-runner';
import {
  AgentRunResult,
  AgentRuntime,
  AgentTimeoutError,
  NormalizedStopReason,
  NormalizedUsage,
} from './agent-runner.types';
import type { ClaudeTextRunRequest } from './claude-text.runner';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-opus-5';

// @anthropic-ai/claude-agent-sdk é ESM-only (sem build CJS). O Node atual já
// resolve isso num require() direto, mas o ts-jest dos testes não — por isso o
// import é dinâmico e só acontece de fato quando run() é chamado, nunca no
// carregamento do módulo (o que quebraria a suíte de testes sem tocar em nada
// deste runner).
type ClaudeAgentSdkModule = typeof import('@anthropic-ai/claude-agent-sdk');
let sdkModulePromise: Promise<ClaudeAgentSdkModule> | undefined;
function loadClaudeAgentSdk(): Promise<ClaudeAgentSdkModule> {
  if (!sdkModulePromise)
    sdkModulePromise = import('@anthropic-ai/claude-agent-sdk');
  return sdkModulePromise;
}

function mapStopReason(
  reason: string | null,
  isError: boolean,
): NormalizedStopReason {
  if (isError) return 'error';
  switch (reason) {
    case 'max_tokens':
      return 'max_tokens';
    case 'refusal':
      return 'refusal';
    case 'tool_use':
      return 'tool_use';
    default:
      return 'end_turn';
  }
}

/**
 * Runtime de texto alternativo — mesmo contrato do ClaudeTextRunner, mas via
 * @anthropic-ai/claude-agent-sdk em vez da Messages API pura. A vantagem é que
 * o SDK spawna o binário do Claude Code e reaproveita a sessão já autenticada
 * na máquina (sem ANTHROPIC_API_KEY). É o runner usado quando não há API key
 * configurada — ver AgentRunnerFactory.
 */
@Injectable()
export class ClaudeAgentSdkTextRunner extends AgentRunner {
  readonly runtime: AgentRuntime = 'text';
  private readonly logger = new Logger(ClaudeAgentSdkTextRunner.name);

  async run(request: ClaudeTextRunRequest): Promise<AgentRunResult> {
    const startedAt = Date.now();
    const model = request.model || DEFAULT_MODEL;
    const { query, SYSTEM_PROMPT_DYNAMIC_BOUNDARY } =
      await loadClaudeAgentSdk();

    // O SDK pede um AbortController próprio; a requisição chega com um AbortSignal
    // (composto pelo timeout do serviço chamador), então só propagamos o abort.
    const abortController = new AbortController();
    if (request.signal.aborted) abortController.abort();
    else
      request.signal.addEventListener('abort', () => abortController.abort(), {
        once: true,
      });

    // Blocos marcados como "cache" são a persona/regras estáticas (idênticas em toda
    // execução) — ficam antes do SYSTEM_PROMPT_DYNAMIC_BOUNDARY para permitir cache
    // de prompt entre sessões, equivalente ao cache_control: ephemeral do outro runner.
    const staticBlocks = request.system
      .filter((block) => block.cache)
      .map((block) => block.text);
    const dynamicBlocks = request.system
      .filter((block) => !block.cache)
      .map((block) => block.text);
    const systemPrompt = [
      ...staticBlocks,
      SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
      ...dynamicBlocks,
    ];

    const stream = query({
      prompt: request.userPrompt,
      options: {
        model,
        systemPrompt,
        tools: [],
        maxTurns: 1,
        includePartialMessages: true,
        abortController,
      },
    });

    let text = '';
    let result: SDKResultMessage | undefined;

    try {
      for await (const message of stream) {
        if (message.type === 'stream_event') {
          const event = message.event;
          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta'
          ) {
            text += event.delta.text;
            request.hooks.onText(event.delta.text);
          }
        }
        if (message.type === 'result') {
          result = message;
        }
      }
    } catch (error) {
      if (request.signal.aborted) {
        throw new AgentTimeoutError(request.timeoutMs);
      }
      throw error;
    }

    if (!result) {
      throw new Error(
        `A execução do agent "${request.agentId}" não retornou um resultado final (sessão encerrada sem "result").`,
      );
    }

    // Se o texto acumulado via stream ficou vazio por algum motivo, cai para o campo
    // final do resultado (mesmo texto, só que sem os deltas incrementais).
    if (!text && result.subtype === 'success') {
      text = result.result;
    }

    const stopReason = mapStopReason(result.stop_reason, result.is_error);
    const usage: NormalizedUsage = {
      model,
      inputTokens: result.usage?.input_tokens,
      outputTokens: result.usage?.output_tokens,
      cacheReadTokens: result.usage?.cache_read_input_tokens,
      cacheCreationTokens: result.usage?.cache_creation_input_tokens,
      providerDurationMs: Date.now() - startedAt,
      providerRequestId: result.session_id,
    };
    request.hooks.onUsage?.(usage);

    if (stopReason === 'refusal') {
      this.logger.warn(
        `Recusa do modelo ao executar ${request.agentId} (execução ${request.executionId}).`,
      );
    }
    if (stopReason === 'error') {
      this.logger.error(
        `Erro na execução do agent "${request.agentId}" via Agent SDK: ${'errors' in result ? result.errors?.join('; ') : 'sem detalhes'}`,
      );
    }

    return {
      text,
      usage,
      stopReason,
      toolCalls: [],
      durationMs: Date.now() - startedAt,
    };
  }
}
