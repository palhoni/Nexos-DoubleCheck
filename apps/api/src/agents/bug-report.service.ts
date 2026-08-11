import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StartBugReportDto } from './dto/start-bug-report.dto';
import { UpdateBugStatusDto } from './dto/update-bug-status.dto';
import { AgentRunnerFactory } from './runtime/agent-runner.factory';
import { loadAgentDefinition } from './runtime/agent-definition.loader';
import { AgentTimeoutError } from './runtime/agent-runner.types';
import type { ClaudeTextRunRequest } from './runtime/claude-text.runner';
import {
  extractCompletedObjects,
  tryParseJson,
} from './runtime/json-salvage.util';

const AGENT_NAME = 'agent7-gerador-bug-report';
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const SEVERIDADES = ['Critical', 'High', 'Medium', 'Low'] as const;

type ProjetoResumo = { id: string; nome: string; codigo: string };
type ExecutionActor = { userId: string; email: string };
type ExecutionStatus = 'queued' | 'processing' | 'completed' | 'failed';

type EvidenciaTecnica = {
  metodo?: string;
  url?: string;
  headers?: string;
  payload?: string;
  responseStatus?: string;
  responseBody?: string;
};

type BugItem = {
  titulo: string;
  tcIdRelacionado?: string;
  severidade: (typeof SEVERIDADES)[number];
  prioridadeSugerida?: string;
  ambiente?: string;
  descricao: string;
  passosReproducao: string[];
  resultadoObtido: string;
  resultadoEsperado: string;
  evidenciaTecnica?: EvidenciaTecnica;
  criterioAceiteViolado?: string;
  notasAdicionais?: string;
  /** Preenchido após a alocação sequencial de BUG-ID pelo Nexo. */
  codigo?: string;
};

type BugReportResult = {
  agent: typeof AGENT_NAME;
  provider: 'Anthropic';
  projeto: ProjetoResumo;
  tema?: string;
  bugs: BugItem[];
  totais: {
    documentados: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
};

type BugReportJob = {
  id: string;
  actorUserId: string;
  actorEmail: string;
  projetoId: string;
  tema?: string;
  status: ExecutionStatus;
  phase: string;
  progress: number;
  message: string;
  partialContent: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: BugReportResult;
  error?: string;
};

@Injectable()
export class BugReportService {
  private readonly jobs = new Map<string, BugReportJob>();
  private readonly persistTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly persistChains = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly runners: AgentRunnerFactory,
  ) {}

  async start(dto: StartBugReportDto, actor: ExecutionActor) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: dto.projetoId },
      select: { id: true, nome: true, codigo: true },
    });
    if (!projeto)
      throw new NotFoundException(`Projeto ${dto.projetoId} não encontrado`);

    const now = new Date().toISOString();
    const job: BugReportJob = {
      id: randomUUID(),
      actorUserId: actor.userId,
      actorEmail: actor.email,
      projetoId: dto.projetoId,
      tema: dto.tema?.trim() || undefined,
      status: 'queued',
      phase: 'queued',
      progress: 3,
      message: 'Preparando a geração do bug report...',
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
        titulo: job.tema || 'Bug report',
        requisito: dto.evidencias,
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
        'Execução do Gerador de Bug Report não encontrada.',
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

  async listBugs(actorUserId: string, projetoId?: string) {
    return this.prisma.bug.findMany({
      where: {
        execution: { actorUserId },
        ...(projetoId ? { projetoId } : {}),
      },
      orderBy: [{ projetoId: 'asc' }, { codigo: 'asc' }],
      include: { projeto: { select: { id: true, nome: true, codigo: true } } },
    });
  }

  async getBug(id: string, actorUserId: string) {
    const bug = await this.prisma.bug.findFirst({
      where: { id, execution: { actorUserId } },
      include: { projeto: { select: { id: true, nome: true, codigo: true } } },
    });
    if (!bug) throw new NotFoundException('Bug não encontrado.');
    return bug;
  }

  async updateStatus(
    id: string,
    dto: UpdateBugStatusDto,
    actor: ExecutionActor,
  ) {
    const bug = await this.prisma.bug.findFirst({
      where: { id, execution: { actorUserId: actor.userId } },
    });
    if (!bug) throw new NotFoundException('Bug não encontrado.');
    return this.prisma.bug.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private async execute(
    job: BugReportJob,
    dto: StartBugReportDto,
    projeto: ProjetoResumo,
  ) {
    try {
      const result = await this.runModel(job, dto, projeto);
      result.bugs = await this.allocateAndPersistBugs(
        job.id,
        projeto.id,
        result.bugs,
      );
      job.result = result;
      job.status = 'completed';
      job.phase = 'completed';
      job.progress = 100;
      job.message = `Bug report concluído — ${result.bugs.length} bug(s) documentado(s).`;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha desconhecida ao gerar o bug report';
      job.status = 'failed';
      job.phase = 'failed';
      job.error = message;
      job.message = job.partialContent.trim()
        ? 'A execução foi interrompida; o conteúdo processado foi preservado.'
        : 'Não foi possível gerar o bug report.';
    } finally {
      job.updatedAt = new Date().toISOString();
      job.completedAt = job.updatedAt;
      await this.flushPersistence(job);
    }
  }

  private async runModel(
    job: BugReportJob,
    dto: StartBugReportDto,
    projeto: ProjetoResumo,
  ): Promise<BugReportResult> {
    const definition = loadAgentDefinition(AGENT_NAME);
    const timeoutMs = this.timeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      job.status = 'processing';
      job.phase = 'analisando-evidencias';
      job.progress = 10;
      job.message = 'Lendo as evidências informadas...';
      job.startedAt ??= new Date().toISOString();
      this.schedulePersistence(job);

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
        userPrompt: this.buildUserPrompt(dto, projeto),
        timeoutMs,
        signal: controller.signal,
        hooks: {
          onText: (delta) => {
            content += delta;
            job.partialContent = content;
            job.phase = 'documentando';
            job.progress = Math.min(90, 15 + Math.floor(content.length / 300));
            job.message = 'Recebendo os bug reports estruturados...';
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
      job.message = 'Organizando os bugs por severidade...';

      const result = this.parseResult(raw, dto, projeto);
      result.duracaoMs = Date.now() - startedAt;
      if (run.stopReason === 'max_tokens') {
        result.parcial = true;
        result.motivoInterrupcao =
          'O modelo encerrou a geração por limite de saída (max_tokens); o relatório pode estar incompleto.';
      }
      return result;
    } catch (error) {
      if (error instanceof AgentTimeoutError) {
        throw new InternalServerErrorException(
          `A geração do bug report ultrapassou o limite de ${Math.round(timeoutMs / 60_000)} minutos sem concluir.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private parseResult(
    raw: string,
    dto: StartBugReportDto,
    projeto: ProjetoResumo,
  ): BugReportResult {
    const withoutFence = raw
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    let parsed: Partial<{ bugs: Partial<BugItem>[] }> = {};

    if (start >= 0 && end > start) {
      parsed = tryParseJson(withoutFence.slice(start, end + 1)) ?? {};
    }
    const rawBugs =
      Array.isArray(parsed.bugs) && parsed.bugs.length
        ? parsed.bugs
        : extractCompletedObjects<Partial<BugItem>>(withoutFence, 'bugs');

    const bugs: BugItem[] = rawBugs.map((item) => ({
      titulo: item.titulo || 'Bug sem título informado pelo agent',
      tcIdRelacionado: item.tcIdRelacionado,
      severidade: SEVERIDADES.includes(item.severidade as never)
        ? (item.severidade as BugItem['severidade'])
        : 'Medium',
      prioridadeSugerida: item.prioridadeSugerida,
      ambiente: item.ambiente,
      descricao: item.descricao || 'Não informado.',
      passosReproducao: Array.isArray(item.passosReproducao)
        ? item.passosReproducao
        : [],
      resultadoObtido: item.resultadoObtido || 'Não informado.',
      resultadoEsperado: item.resultadoEsperado || 'Não informado.',
      evidenciaTecnica: item.evidenciaTecnica,
      criterioAceiteViolado: item.criterioAceiteViolado,
      notasAdicionais: item.notasAdicionais,
    }));

    return {
      agent: AGENT_NAME,
      provider: 'Anthropic',
      projeto,
      tema: dto.tema?.trim() || undefined,
      bugs,
      totais: {
        documentados: bugs.length,
        critical: bugs.filter((item) => item.severidade === 'Critical').length,
        high: bugs.filter((item) => item.severidade === 'High').length,
        medium: bugs.filter((item) => item.severidade === 'Medium').length,
        low: bugs.filter((item) => item.severidade === 'Low').length,
      },
      duracaoMs: 0,
      executadoEm: new Date().toISOString(),
    };
  }

  /**
   * Aloca BUG-IDs sequenciais por projeto (nunca reaproveitados/reiniciados) e
   * persiste os registros numa única transação — evita corrida entre execuções
   * concorrentes no mesmo projeto.
   */
  private async allocateAndPersistBugs(
    executionId: string,
    projetoId: string,
    bugs: BugItem[],
  ): Promise<BugItem[]> {
    if (bugs.length === 0) return bugs;
    return this.prisma.$transaction(async (tx) => {
      const existentes = await tx.bug.findMany({
        where: { projetoId },
        select: { codigo: true },
      });
      let proximo = existentes.reduce((max, { codigo }) => {
        const match = /BUG-(\d+)/.exec(codigo);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);

      const numerados: BugItem[] = [];
      for (const bug of bugs) {
        proximo += 1;
        const codigo = `BUG-${String(proximo).padStart(3, '0')}`;
        await tx.bug.create({
          data: {
            projetoId,
            executionId,
            codigo,
            titulo: bug.titulo,
            tcIdRelacionado: bug.tcIdRelacionado,
            severidade: bug.severidade,
            prioridadeSugerida: bug.prioridadeSugerida,
            ambiente: bug.ambiente,
            descricao: bug.descricao,
            passosReproducao: bug.passosReproducao,
            resultadoObtido: bug.resultadoObtido,
            resultadoEsperado: bug.resultadoEsperado,
            evidenciaTecnica: bug.evidenciaTecnica
              ? (bug.evidenciaTecnica as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            criterioAceiteViolado: bug.criterioAceiteViolado,
            notasAdicionais: bug.notasAdicionais,
          },
        });
        numerados.push({ ...bug, codigo });
      }
      return numerados;
    });
  }

  private buildExecutionRules() {
    return `Analise as evidências de bug fornecidas pelo usuário e gere um bug report completo para cada defeito real identificado, em PT-BR.

RESTRIÇÕES DESTA EXECUÇÃO:
- A pré-condição P1 já foi respondida: o usuário está descrevendo a evidência diretamente, sem triagem formal do Agente 6.
- Não use ferramentas, não leia arquivos e não grave artefatos.
- Não numere os bugs (nada de BUG-XXX) — o Nexo aloca o ID sequencial ao persistir.
- Nunca invente evidências, passos ou critérios de aceite que não estejam no texto fornecido; deixe o campo correspondente vazio ou registre "Não informado" quando faltar.
- Título de cada bug deve ser específico e descritivo, nunca genérico.
- Escreva todos os textos em português do Brasil.
- Sua resposta deve ser SOMENTE um objeto JSON válido, sem Markdown, comentários ou blocos de código.
- Se o texto descrever múltiplos defeitos, gere um item em "bugs" para cada um.

CONTRATO JSON OBRIGATÓRIO:
{
  "bugs": [
    {
      "titulo": "string — específico, não genérico",
      "tcIdRelacionado": "string (opcional)",
      "severidade": "Critical | High | Medium | Low",
      "prioridadeSugerida": "Alta | Média | Baixa",
      "ambiente": "string (opcional)",
      "descricao": "string — uma frase clara sobre o que está errado",
      "passosReproducao": ["string"],
      "resultadoObtido": "string — com evidência (status code, mensagem, etc.)",
      "resultadoEsperado": "string — baseado no critério de aceite, quando houver",
      "evidenciaTecnica": { "metodo": "string", "url": "string", "headers": "string", "payload": "string", "responseStatus": "string", "responseBody": "string" },
      "criterioAceiteViolado": "string (opcional)",
      "notasAdicionais": "string (opcional)"
    }
  ]
}`;
  }

  private buildUserPrompt(dto: StartBugReportDto, projeto: ProjetoResumo) {
    return `PROJETO: ${projeto.nome} (${projeto.codigo})
TEMA (opcional): ${dto.tema?.trim() || 'Não informado'}

EVIDÊNCIAS DOS BUGS:
${dto.evidencias.trim()}`;
  }

  private timeoutMs() {
    const configured = Number(process.env.AGENT_TIMEOUT_MS);
    return Number.isFinite(configured) && configured >= 60_000
      ? configured
      : DEFAULT_TIMEOUT_MS;
  }

  private schedulePersistence(job: BugReportJob) {
    if (this.persistTimers.has(job.id)) return;
    const timer = setTimeout(() => {
      this.persistTimers.delete(job.id);
      void this.enqueuePersistence(job).catch(() => undefined);
    }, 750);
    this.persistTimers.set(job.id, timer);
  }

  private async flushPersistence(job: BugReportJob) {
    const timer = this.persistTimers.get(job.id);
    if (timer) clearTimeout(timer);
    this.persistTimers.delete(job.id);
    await this.enqueuePersistence(job);
  }

  private enqueuePersistence(job: BugReportJob) {
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
  }): BugReportJob {
    const result =
      record.result &&
      typeof record.result === 'object' &&
      !Array.isArray(record.result)
        ? (record.result as unknown as BugReportResult)
        : undefined;
    return {
      id: record.id,
      actorUserId: record.actorUserId,
      actorEmail: '',
      projetoId: record.projetoId,
      tema: record.titulo || undefined,
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

  private publicJob(job: BugReportJob) {
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
