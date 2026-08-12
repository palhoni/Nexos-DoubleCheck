import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AgentRunner } from './agent-runner';
import { ClaudeTextRunner } from './claude-text.runner';
import { ClaudeAgentSdkTextRunner } from './claude-agent-sdk-text.runner';
import type { AgentRuntime } from './agent-runner.types';

/**
 * Mapa fixo de qual runtime cada agent usa (ver plano — só os agents que
 * precisam tocar um repositório real usam o runtime "agentic"). Agents ainda
 * não implementados no runtime agentic devem permanecer fora deste mapa até
 * que a Fase 6+ (workspace + Claude Agent SDK) esteja pronta.
 */
const AGENT_RUNTIME: Record<string, AgentRuntime> = {
  'agent1-analisador-us': 'text',
  'agent2-desenhista-testes': 'text',
  'agent4-descobridor-endpoints': 'text',
  'agent7-gerador-bug-report': 'text',
  'agent-mapeador-jornadas': 'text',
};

/**
 * 'api-key' força a Messages API (@anthropic-ai/sdk); 'claude-code-session' força
 * o Claude Agent SDK (reaproveita a sessão local do Claude Code); 'auto' (default)
 * usa a API key se ela existir e cai para a sessão do Claude Code quando não existe —
 * assim uma máquina de dev sem ANTHROPIC_API_KEY funciona sem configuração extra, e
 * um deploy real (que sempre tem a API key configurada) continua no runner já testado.
 */
type AgentAuthMode = 'auto' | 'api-key' | 'claude-code-session';

@Injectable()
export class AgentRunnerFactory {
  private readonly logger = new Logger(AgentRunnerFactory.name);
  private readonly textRunner: AgentRunner;

  constructor(
    apiKeyRunner: ClaudeTextRunner,
    sessionRunner: ClaudeAgentSdkTextRunner,
  ) {
    const mode = (process.env.AGENT_AUTH_MODE as AgentAuthMode) || 'auto';
    const hasApiKey = Boolean(
      process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
    );

    const useApiKey = mode === 'api-key' || (mode === 'auto' && hasApiKey);
    this.textRunner = useApiKey ? apiKeyRunner : sessionRunner;

    this.logger.log(
      useApiKey
        ? 'Runtime de texto: Messages API (ANTHROPIC_API_KEY).'
        : 'Runtime de texto: Claude Agent SDK (sessão local do Claude Code, sem ANTHROPIC_API_KEY).',
    );
  }

  for(agentId: string): AgentRunner {
    const runtime = AGENT_RUNTIME[agentId];
    if (runtime === 'text') return this.textRunner;
    if (runtime === 'agentic') {
      throw new InternalServerErrorException(
        `O runtime agentic ainda não está implementado (agent "${agentId}" precisa dele).`,
      );
    }
    throw new InternalServerErrorException(
      `Agent "${agentId}" não está registrado em AGENT_RUNTIME.`,
    );
  }
}
