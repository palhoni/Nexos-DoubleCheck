import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  EndpointSourceDto,
  StartEndpointDiscoveryDto,
} from './dto/start-endpoint-discovery.dto';
import { UpdateEndpointDecisionDto } from './dto/update-endpoint-decision.dto';
import { AgentRunnerFactory } from './runtime/agent-runner.factory';
import { loadAgentDefinition } from './runtime/agent-definition.loader';
import { AgentTimeoutError } from './runtime/agent-runner.types';
import type { ClaudeTextRunRequest } from './runtime/claude-text.runner';
import {
  extractCompletedObjects,
  tryParseJson,
} from './runtime/json-salvage.util';

const AGENT_NAME = 'agent4-descobridor-endpoints';
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const PRIORIDADES = ['Alta', 'Média', 'Baixa'] as const;

type ProjetoResumo = { id: string; nome: string; codigo: string };
type ExecutionActor = { userId: string; email: string };
type ExecutionStatus = 'queued' | 'processing' | 'completed' | 'failed';

type EndpointItem = {
  id: string;
  metodo: string;
  endpoint: string;
  descricao: string;
  autenticacao: string;
  prioridade: (typeof PRIORIDADES)[number];
  criterioPrioridade: string;
  observadoEm: string[];
  notas?: string;
};

type DiscoveryResult = {
  agent: typeof AGENT_NAME;
  provider: 'Anthropic';
  projeto: ProjetoResumo;
  sistema: string;
  endpoints: EndpointItem[];
  totais: { descobertos: number; alta: number; media: number; baixa: number };
  inconsistencias: string[];
  naoDocumentados: string[];
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
  /** Preenchido após a persistência do backlog — é o id usado para abrir /agents/endpoints/backlogs/:id. */
  backlogId?: string;
};

type DiscoveryJob = {
  id: string;
  actorUserId: string;
  actorEmail: string;
  projetoId: string;
  sistema: string;
  status: ExecutionStatus;
  phase: string;
  progress: number;
  message: string;
  partialContent: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: DiscoveryResult;
  error?: string;
};

@Injectable()
export class EndpointDiscoveryService {
  private readonly jobs = new Map<string, DiscoveryJob>();
  private readonly persistTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly persistChains = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly runners: AgentRunnerFactory,
  ) {}

  async start(dto: StartEndpointDiscoveryDto, actor: ExecutionActor) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: dto.projetoId },
      select: { id: true, nome: true, codigo: true },
    });
    if (!projeto)
      throw new NotFoundException(`Projeto ${dto.projetoId} não encontrado`);

    const now = new Date().toISOString();
    const job: DiscoveryJob = {
      id: randomUUID(),
      actorUserId: actor.userId,
      actorEmail: actor.email,
      projetoId: dto.projetoId,
      sistema: dto.sistema.trim(),
      status: 'queued',
      phase: 'queued',
      progress: 3,
      message: 'Preparando a descoberta de endpoints...',
      partialContent: '',
      createdAt: now,
      updatedAt: now,
    };
    await this.prisma.agentExecution.create({
      data: {
        id: job.id,
        agent: AGENT_NAME,
        provider: 'Anthropic',
        projetoId: job.projetoId,
        actorUserId: job.actorUserId,
        titulo: job.sistema,
        requisito: JSON.stringify({
          sistema: job.sistema,
          fontes: dto.fontes.map((fonte) => fonte.tipo),
        }),
        status: job.status,
        phase: job.phase,
        progress: job.progress,
        message: job.message,
      },
    });
    this.jobs.set(job.id, job);
    void this.execute(job, dto, projeto).catch(() => undefined);
    return this.publicJob(job);
  }

  async getExecution(id: string, actorUserId: string) {
    const job = this.jobs.get(id);
    if (job && job.actorUserId === actorUserId) return this.publicJob(job);
    const record = await this.prisma.agentExecution.findFirst({
      where: { id, actorUserId, agent: AGENT_NAME },
    });
    if (!record)
      throw new NotFoundException(
        'Execução do Descobridor de Endpoints não encontrada.',
      );
    return this.publicJob(this.jobFromRecord(record));
  }

  async listExecutions(actorUserId: string, projetoId?: string) {
    const rows = await this.prisma.agentExecution.findMany({
      where: {
        actorUserId,
        agent: AGENT_NAME,
        ...(projetoId ? { projetoId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        titulo: true,
        status: true,
        phase: true,
        progress: true,
        message: true,
        error: true,
        result: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        projeto: { select: { id: true, nome: true, codigo: true } },
        actorUser: { select: { id: true, nome: true, email: true } },
      },
    });
    return rows.map(({ result, ...row }) => ({
      ...row,
      hasResult: result !== null,
    }));
  }

  async listBacklogs(actorUserId: string, projetoId?: string) {
    return this.prisma.endpointBacklog.findMany({
      where: {
        execution: { actorUserId },
        ...(projetoId ? { projetoId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sistema: true,
        createdAt: true,
        updatedAt: true,
        projeto: { select: { id: true, nome: true, codigo: true } },
        _count: { select: { itens: true } },
      },
    });
  }

  async getBacklog(id: string, actorUserId: string) {
    const backlog = await this.prisma.endpointBacklog.findFirst({
      where: { id, execution: { actorUserId } },
      include: {
        projeto: { select: { id: true, nome: true, codigo: true } },
        itens: { orderBy: { codigo: 'asc' } },
      },
    });
    if (!backlog)
      throw new NotFoundException('Backlog de endpoints não encontrado.');
    return backlog;
  }

  async updateDecision(
    backlogId: string,
    itemId: string,
    dto: UpdateEndpointDecisionDto,
    actor: ExecutionActor,
  ) {
    const item = await this.prisma.endpointBacklogItem.findFirst({
      where: {
        id: itemId,
        backlogId,
        backlog: { execution: { actorUserId: actor.userId } },
      },
    });
    if (!item) throw new NotFoundException('Item do backlog não encontrado.');
    return this.prisma.endpointBacklogItem.update({
      where: { id: itemId },
      data: {
        decisao: dto.decisao,
        decisaoJustificativa: dto.justificativa ?? null,
        decididoPorUserId: actor.userId,
        decididoEm: new Date(),
      },
    });
  }

  private async execute(
    job: DiscoveryJob,
    dto: StartEndpointDiscoveryDto,
    projeto: ProjetoResumo,
  ) {
    try {
      const result = await this.runModel(job, dto, projeto);
      job.result = result;
      job.status = 'completed';
      job.phase = 'completed';
      job.progress = 100;
      job.message = 'Backlog de endpoints concluído.';
      result.backlogId = await this.persistBacklog(
        job.id,
        projeto.id,
        job.sistema,
        result,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha desconhecida ao descobrir endpoints';
      job.status = 'failed';
      job.phase = 'failed';
      job.error = message;
      job.message = job.partialContent.trim()
        ? 'A execução foi interrompida; o conteúdo processado foi preservado.'
        : 'Não foi possível descobrir os endpoints.';
    } finally {
      job.updatedAt = new Date().toISOString();
      job.completedAt = job.updatedAt;
      await this.flushPersistence(job);
    }
  }

  private async runModel(
    job: DiscoveryJob,
    dto: StartEndpointDiscoveryDto,
    projeto: ProjetoResumo,
  ): Promise<DiscoveryResult> {
    const definition = loadAgentDefinition(AGENT_NAME);
    const timeoutMs = this.timeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      job.status = 'processing';
      job.phase = 'coletando-fontes';
      job.progress = 8;
      job.message = 'Lendo as fontes informadas...';
      job.startedAt ??= new Date().toISOString();
      this.schedulePersistence(job);

      const fontesTexto = await this.collectSourcesText(dto.fontes);

      const runner = this.runners.for(AGENT_NAME);
      const startedAt = Date.now();
      let content = '';

      const runRequest: ClaudeTextRunRequest = {
        agentId: AGENT_NAME,
        executionId: job.id,
        system: [
          { text: definition.systemPrompt, cache: true },
          { text: this.buildExecutionRules(), cache: true },
        ],
        userPrompt: this.buildUserPrompt(dto, projeto, fontesTexto),
        timeoutMs,
        signal: controller.signal,
        hooks: {
          onText: (delta) => {
            content += delta;
            job.partialContent = content;
            job.phase = 'catalogando';
            job.progress = Math.min(90, 15 + Math.floor(content.length / 300));
            job.message = 'Recebendo o backlog estruturado...';
            job.updatedAt = new Date().toISOString();
            this.schedulePersistence(job);
          },
        },
      };

      const run = await runner.run(runRequest);
      if (run.stopReason === 'refusal') {
        throw new Error(
          `O Claude recusou processar esta solicitação por política de segurança${run.stopCategory ? ` (categoria: ${run.stopCategory})` : ''}.`,
        );
      }
      const raw = run.text.trim();
      if (!raw)
        throw new Error('O Claude concluiu a execução sem retornar conteúdo.');

      job.phase = 'estruturando';
      job.progress = 95;
      job.message = 'Organizando o backlog por prioridade...';

      const result = this.parseResult(raw, projeto);
      result.duracaoMs = Date.now() - startedAt;
      if (run.stopReason === 'max_tokens') {
        result.parcial = true;
        result.motivoInterrupcao =
          'O modelo encerrou a geração por limite de saída (max_tokens); o backlog pode estar incompleto.';
      }
      return result;
    } catch (error) {
      if (error instanceof AgentTimeoutError) {
        throw new InternalServerErrorException(
          `A descoberta de endpoints ultrapassou o limite de ${Math.round(timeoutMs / 60_000)} minutos sem concluir.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async collectSourcesText(
    fontes: EndpointSourceDto[],
  ): Promise<string> {
    const blocks: string[] = [];
    for (const [index, fonte] of fontes.entries()) {
      const label = `FONTE ${index + 1} — tipo: ${fonte.tipo}`;
      if (fonte.tipo === 'swagger-url' && fonte.url) {
        try {
          const response = await fetch(fonte.url, {
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const text = (await response.text()).slice(0, 300_000);
          blocks.push(`${label} (${fonte.url})\n${text}`);
        } catch (error) {
          blocks.push(
            `${label} (${fonte.url})\n[FALHA AO ACESSAR A URL: ${error instanceof Error ? error.message : 'erro desconhecido'} — informe isso no resumo e não invente conteúdo]`,
          );
        }
      } else if (fonte.conteudo?.trim()) {
        blocks.push(`${label}\n${fonte.conteudo.trim().slice(0, 200_000)}`);
      } else {
        blocks.push(`${label}\n[SEM CONTEÚDO INFORMADO]`);
      }
    }
    return blocks.join('\n\n---\n\n');
  }

  private parseResult(raw: string, projeto: ProjetoResumo): DiscoveryResult {
    const withoutFence = raw
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    let parsed: Partial<{
      endpoints: Partial<EndpointItem>[];
      inconsistencias: string[];
      naoDocumentados: string[];
    }> = {};

    if (start >= 0 && end > start) {
      parsed = tryParseJson(withoutFence.slice(start, end + 1)) ?? {};
    }
    const rawEndpoints =
      Array.isArray(parsed.endpoints) && parsed.endpoints.length
        ? parsed.endpoints
        : extractCompletedObjects<Partial<EndpointItem>>(
            withoutFence,
            'endpoints',
          );

    const endpoints: EndpointItem[] = rawEndpoints.map((item, index) => ({
      id: item.id?.trim() || `EP-${String(index + 1).padStart(3, '0')}`,
      metodo: (item.metodo || 'NÃO INFORMADO').toUpperCase(),
      endpoint: item.endpoint || 'NÃO INFORMADO',
      descricao: item.descricao || 'Não informado.',
      autenticacao: item.autenticacao || 'Desconhecida',
      prioridade: PRIORIDADES.includes(item.prioridade as never)
        ? (item.prioridade as EndpointItem['prioridade'])
        : 'Média',
      criterioPrioridade: item.criterioPrioridade || 'Não informado.',
      observadoEm: Array.isArray(item.observadoEm) ? item.observadoEm : [],
      notas: item.notas,
    }));

    return {
      agent: AGENT_NAME,
      provider: 'Anthropic',
      projeto,
      sistema: projeto.nome,
      endpoints,
      totais: {
        descobertos: endpoints.length,
        alta: endpoints.filter((item) => item.prioridade === 'Alta').length,
        media: endpoints.filter((item) => item.prioridade === 'Média').length,
        baixa: endpoints.filter((item) => item.prioridade === 'Baixa').length,
      },
      inconsistencias: Array.isArray(parsed.inconsistencias)
        ? parsed.inconsistencias
        : [],
      naoDocumentados: Array.isArray(parsed.naoDocumentados)
        ? parsed.naoDocumentados
        : [],
      duracaoMs: 0,
      executadoEm: new Date().toISOString(),
    };
  }

  private async persistBacklog(
    executionId: string,
    projetoId: string,
    sistema: string,
    result: DiscoveryResult,
  ): Promise<string> {
    const backlog = await this.prisma.endpointBacklog.create({
      data: {
        projetoId,
        executionId,
        sistema,
        itens: {
          create: result.endpoints.map((item) => ({
            codigo: item.id,
            metodo: item.metodo,
            endpoint: item.endpoint,
            descricao: item.descricao,
            autenticacao: item.autenticacao,
            prioridade: item.prioridade,
            criterioPrioridade: item.criterioPrioridade,
            observadoEm: item.observadoEm,
            notas: item.notas,
          })),
        },
      },
    });
    return backlog.id;
  }

  private buildExecutionRules() {
    return `Execute a descoberta de endpoints com base nas fontes fornecidas pelo usuário, em PT-BR.

RESTRIÇÕES DESTA EXECUÇÃO:
- As pré-condições P1/P2/P3 já foram respondidas pelo formulário — não pergunte de novo, use o que está no prompt.
- Não use ferramentas, não leia arquivos e não grave artefatos.
- Nunca registre valores reais de payload/response — apenas estrutura (ex.: {userId, email}).
- Nunca invente endpoints que não estejam nas fontes fornecidas; use "[NÃO INFORMADO]" para dados ausentes.
- Deduplique endpoints iguais (mesmo método + mesmo caminho) entre fontes diferentes, consolidando em um único registro.
- Escreva todos os textos em português do Brasil.
- Sua resposta deve ser SOMENTE um objeto JSON válido, sem Markdown, comentários ou blocos de código.
- Priorize preencher "endpoints" primeiro. Se a resposta estiver próxima do limite, feche o JSON com os endpoints já processados em vez de truncar no meio de um objeto.

CONTRATO JSON OBRIGATÓRIO:
{
  "endpoints": [
    {
      "id": "EP-001",
      "metodo": "GET | POST | PUT | PATCH | DELETE",
      "endpoint": "/api/recurso/:id",
      "descricao": "string",
      "autenticacao": "JWT | API Key | Basic | Nenhuma | Desconhecida",
      "prioridade": "Alta | Média | Baixa",
      "criterioPrioridade": "string — o critério objetivo que gerou essa prioridade",
      "observadoEm": ["string"],
      "notas": "string (opcional)"
    }
  ],
  "inconsistencias": ["string"],
  "naoDocumentados": ["string"]
}`;
  }

  private buildUserPrompt(
    dto: StartEndpointDiscoveryDto,
    projeto: ProjetoResumo,
    fontesTexto: string,
  ) {
    return `PROJETO: ${projeto.nome} (${projeto.codigo})
SISTEMA/MÓDULO: ${dto.sistema.trim()}

FONTES INFORMADAS:
${fontesTexto}`;
  }

  private timeoutMs() {
    const configured = Number(process.env.AGENT_TIMEOUT_MS);
    return Number.isFinite(configured) && configured >= 60_000
      ? configured
      : DEFAULT_TIMEOUT_MS;
  }

  private schedulePersistence(job: DiscoveryJob) {
    if (this.persistTimers.has(job.id)) return;
    const timer = setTimeout(() => {
      this.persistTimers.delete(job.id);
      void this.enqueuePersistence(job).catch(() => undefined);
    }, 750);
    this.persistTimers.set(job.id, timer);
  }

  private async flushPersistence(job: DiscoveryJob) {
    const timer = this.persistTimers.get(job.id);
    if (timer) clearTimeout(timer);
    this.persistTimers.delete(job.id);
    await this.enqueuePersistence(job);
  }

  private enqueuePersistence(job: DiscoveryJob) {
    const snapshot = {
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      message: job.message,
      partialContent: job.partialContent,
      result: job.result
        ? (JSON.parse(JSON.stringify(job.result)) as Prisma.InputJsonValue)
        : Prisma.DbNull,
      error: job.error ?? null,
      startedAt: job.startedAt ? new Date(job.startedAt) : null,
      completedAt: job.completedAt ? new Date(job.completedAt) : null,
    };
    const previous = this.persistChains.get(job.id) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        await this.prisma.agentExecution.update({
          where: { id: job.id },
          data: snapshot,
        });
      });
    this.persistChains.set(job.id, next);
    return next;
  }

  private jobFromRecord(record: {
    id: string;
    actorUserId: string;
    projetoId: string;
    titulo: string | null;
    status: string;
    phase: string;
    progress: number;
    message: string;
    partialContent: string;
    result: Prisma.JsonValue;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }): DiscoveryJob {
    const result =
      record.result &&
      typeof record.result === 'object' &&
      !Array.isArray(record.result)
        ? (record.result as unknown as DiscoveryResult)
        : undefined;
    return {
      id: record.id,
      actorUserId: record.actorUserId,
      actorEmail: '',
      projetoId: record.projetoId,
      sistema: record.titulo || 'Sistema não informado',
      status: record.status as ExecutionStatus,
      phase: record.phase,
      progress: record.progress,
      message: record.message,
      partialContent: record.partialContent,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      startedAt: record.startedAt?.toISOString(),
      completedAt: record.completedAt?.toISOString(),
      result,
      error: record.error ?? undefined,
    };
  }

  private publicJob(job: DiscoveryJob) {
    return {
      id: job.id,
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      message: job.message,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      live: { characters: job.partialContent.length },
      result: job.result,
      error: job.error,
    };
  }
}
