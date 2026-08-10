import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { CopilotClient, type CopilotSession, type PermissionHandler } from '@github/copilot-sdk';
import { Prisma, type AgentExecution } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { RunUsAnalyserDto } from './dto/run-us-analyser.dto';

const AGENT_NAME = 'agent1-analisador-us';
const AGENT_FILE = `${AGENT_NAME}.md`;
const DEFAULT_AGENT_TIMEOUT_MS = 15 * 60 * 1000;
const DENY_ALL_TOOLS: PermissionHandler = () => ({
  kind: 'reject',
  feedback: 'Este agent opera apenas sobre o texto fornecido e não tem permissão para usar ferramentas.',
});

type StructuredAnalysis = {
  requisito: {
    identificador: string;
    titulo: string;
    resumo: string;
    modo: string;
    escopo: string;
    criteriosAceite: string[];
  };
  requisitoReescrito: {
    titulo: string;
    historiaUsuario: string;
    contexto: string;
    objetivo: string;
    escopoIncluido: string[];
    escopoFora: string[];
    criteriosAceite: Array<{ id: string; descricao: string; tipo: string }>;
    dependencias: string[];
    premissas: string[];
    pendencias: string[];
  };
  gate: {
    status: 'PASS' | 'CONDITIONAL' | 'FAIL';
    coerencia: { nota: number; justificativa: string };
    completude: { nota: number; justificativa: string };
    testabilidade: { nota: number; justificativa: string };
    findings: Array<{ categoria: string; severidade: string; trecho: string; recomendacao: string }>;
    decisoesHumanas: string[];
  };
  regrasNegocio: Array<{ id: string; regra: string; origem: string; status: string; risco: string }>;
  perguntasRefinamento: Array<{ id: string; pergunta: string; trechoOrigem: string; riscoMitigado: string; criticidade: string }>;
  cenariosTeste: Array<{
    id: string;
    titulo: string;
    tipo: string;
    execucao: string;
    escopo: string;
    dado: string;
    quando: string;
    entao: string;
    criterioRelacionado: string;
  }>;
  riscosAdicionais: string[];
};

type ExecutionStatus = 'queued' | 'processing' | 'completed' | 'failed';
type ExecutionPhase = 'queued' | 'context' | 'copilot' | 'requirement' | 'gate' | 'rules' | 'questions' | 'scenarios' | 'structuring' | 'completed' | 'failed';
type AnalysisResult = {
  agent: string;
  provider: 'GitHub Copilot';
  projeto: { id: string; nome: string; codigo: string };
  titulo: string;
  resultado: string;
  analise: StructuredAnalysis;
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
};
type AnalysisJob = {
  id: string;
  actorUserId: string;
  actorEmail: string;
  projetoId: string;
  titulo?: string;
  requisito: string;
  status: ExecutionStatus;
  phase: ExecutionPhase;
  progress: number;
  message: string;
  partialContent: string;
  createdAt: string;
  updatedAt: string;
  result?: AnalysisResult;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

type ExecutionActor = { userId: string; email: string };

@Injectable()
export class AgentsService implements OnModuleInit {
  private readonly jobs = new Map<string, AnalysisJob>();
  private readonly persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly persistChains = new Map<string, Promise<void>>();
  private readonly executionPromises = new Map<string, Promise<void>>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.agentExecution.updateMany({
      where: { status: { in: ['queued', 'processing'] } },
      data: {
        status: 'failed',
        phase: 'failed',
        message: 'A execução foi interrompida pela reinicialização da API.',
        error: 'A API foi reiniciada antes da conclusão da análise.',
        completedAt: new Date(),
      },
    });
  }

  async extractRequirementFile(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Selecione um arquivo PDF exportado pelo Jira.');
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) throw new BadRequestException('Formato não suportado. Envie um arquivo PDF exportado pelo Jira.');

    const parser = new PDFParse({ data: file.buffer });
    try {
      const extracted = await parser.getText();
      const texto = extracted.text
        .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gim, '')
        .replace(/^https?:\/\/jira\.dt\.renault\.com\/\S+\s*$/gim, '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (texto.length < 20) {
        throw new BadRequestException('O PDF não contém texto pesquisável. Exporte a issue pelo Jira em vez de usar uma imagem digitalizada.');
      }
      const identifier = file.originalname.match(/#?([A-Z][A-Z0-9]{1,15}-\d+)/i)?.[1]
        ?? texto.match(/\b([A-Z][A-Z0-9]{1,15}-\d+)\b/i)?.[1];
      return {
        nome: file.originalname,
        texto: texto.slice(0, 120_000),
        paginas: extracted.total,
        tituloSugerido: identifier?.toUpperCase() ?? file.originalname.replace(/\.pdf$/i, ''),
        truncado: texto.length > 120_000,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Não foi possível ler o PDF exportado pelo Jira: ${error instanceof Error ? error.message : 'arquivo inválido'}`);
    } finally {
      await parser.destroy();
    }
  }

  async startUsAnalyser(dto: RunUsAnalyserDto, actor: ExecutionActor) {
    this.pruneJobs();
    const now = new Date().toISOString();
    const job: AnalysisJob = {
      id: randomUUID(),
      actorUserId: actor.userId,
      actorEmail: actor.email,
      projetoId: dto.projetoId,
      titulo: dto.titulo?.trim() || undefined,
      requisito: dto.requisito,
      status: 'queued',
      phase: 'queued',
      progress: 3,
      message: 'Preparando a análise...',
      partialContent: '',
      createdAt: now,
      updatedAt: now,
    };
    await this.prisma.agentExecution.create({
      data: {
        id: job.id,
        agent: AGENT_NAME,
        provider: 'GitHub Copilot',
        projetoId: job.projetoId,
        actorUserId: job.actorUserId,
        titulo: job.titulo,
        requisito: job.requisito,
        status: job.status,
        phase: job.phase,
        progress: job.progress,
        message: job.message,
      },
    });
    this.jobs.set(job.id, job);
    const execution = this.executeJob(job, dto);
    this.executionPromises.set(job.id, execution);
    void execution.finally(() => this.executionPromises.delete(job.id)).catch(() => undefined);
    return this.publicJob(job);
  }

  async getExecution(id: string, actorUserId: string) {
    const job = this.jobs.get(id);
    if (job && job.actorUserId === actorUserId) return this.publicJob(job);

    const saved = await this.prisma.agentExecution.findFirst({ where: { id, actorUserId } });
    if (!saved) throw new NotFoundException('Execução do agent não encontrada');
    return this.publicJob(this.jobFromRecord(saved));
  }

  async listExecutions(actorUserId: string, projetoId?: string) {
    const rows = await this.prisma.agentExecution.findMany({
      where: { actorUserId, ...(projetoId ? { projetoId } : {}) },
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
      parcial: Boolean(result && typeof result === 'object' && !Array.isArray(result) && 'parcial' in result && result.parcial),
    }));
  }

  async runUsAnalyser(dto: RunUsAnalyserDto, actor: ExecutionActor) {
    const started = await this.startUsAnalyser(dto, actor);
    await this.executionPromises.get(started.id);
    const job = this.jobs.get(started.id);
    if (job?.result) return job.result;
    throw new InternalServerErrorException(job?.error || 'O agent não conseguiu produzir um resultado.');
  }

  private async executeJob(job: AnalysisJob, dto: RunUsAnalyserDto) {
    try {
      const result = await this.executeAnalysis(dto, job.actorEmail, (phase, progress, message, delta) => {
        job.status = 'processing';
        job.startedAt ??= new Date().toISOString();
        job.phase = phase;
        job.progress = progress;
        job.message = message;
        if (delta) job.partialContent += delta;
        job.updatedAt = new Date().toISOString();
        this.schedulePersistence(job);
      });
      job.result = result;
      job.status = 'completed';
      job.phase = 'completed';
      job.progress = 100;
      job.message = 'Análise concluída.';
      job.updatedAt = new Date().toISOString();
      job.completedAt = job.updatedAt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha desconhecida no GitHub Copilot';
      job.status = 'failed';
      job.phase = 'failed';
      job.message = job.partialContent.trim() ? 'A execução foi interrompida, mas o conteúdo processado foi preservado.' : 'A análise não pôde ser concluída.';
      job.error = errorMessage;
      if (job.partialContent.trim()) {
        job.result = await this.buildPartialResult(dto, job.partialContent, job.createdAt, errorMessage).catch(() => undefined);
      }
      job.updatedAt = new Date().toISOString();
      job.completedAt = job.updatedAt;
    } finally {
      await this.flushPersistence(job);
    }
  }

  private async executeAnalysis(
    dto: RunUsAnalyserDto,
    actorEmail: string,
    report: (phase: ExecutionPhase, progress: number, message: string, delta?: string) => void,
  ): Promise<AnalysisResult> {
    report('context', 8, 'Carregando o contexto isolado do projeto...');
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: dto.projetoId },
      select: {
        id: true,
        nome: true,
        codigo: true,
        status: true,
        descricao: true,
        objetivo: true,
        areaNegocio: true,
        idiomas: true,
        paisesDisponiveis: true,
        responsavelPrincipal: true,
        _count: { select: { times: true, pessoas: true, produtos: true } },
      },
    });

    if (!projeto) throw new NotFoundException(`Projeto ${dto.projetoId} não encontrado`);

    const { prompt: agentPrompt, workingDirectory } = this.loadAgentPrompt();
    const client = new CopilotClient({
      workingDirectory,
      useLoggedInUser: true,
      logLevel: 'error',
    });
    let session: CopilotSession | undefined;
    let unsubscribe: (() => void) | undefined;
    let streamedContent = '';
    const timeoutMs = this.agentTimeoutMs();

    try {
      report('copilot', 15, 'Conectando ao GitHub Copilot...');
      await client.start();
      session = await client.createSession({
        customAgents: [{
          name: AGENT_NAME,
          displayName: 'Analisador de US',
          description: 'Analisa requisitos funcionais e produz gate, dúvidas, riscos e cenários de teste.',
          tools: [],
          prompt: agentPrompt,
        }],
        agent: AGENT_NAME,
        workingDirectory,
        onPermissionRequest: DENY_ALL_TOOLS,
        streaming: true,
      });

      report('requirement', 23, 'O agent está lendo e classificando o requisito...');
      unsubscribe = session.on('assistant.message_delta', (event) => {
        const delta = event.data.deltaContent;
        streamedContent += delta;
        report(this.detectPhase(streamedContent), Math.min(88, 23 + Math.floor(streamedContent.length / 420)), 'Recebendo a análise do agent...', delta);
      });

      const startedAt = Date.now();
      const response = await session.sendAndWait({
        prompt: this.buildExecutionPrompt(dto, projeto, actorEmail),
      }, timeoutMs);

      const resultado = response?.data.content?.trim();
      if (!resultado) {
        throw new Error('O GitHub Copilot concluiu a sessão sem retornar conteúdo.');
      }

      report('structuring', 94, 'Organizando o resultado nas seções visuais...');

      return {
        agent: AGENT_NAME,
        provider: 'GitHub Copilot',
        projeto: { id: projeto.id, nome: projeto.nome, codigo: projeto.codigo },
        titulo: dto.titulo?.trim() || 'Requisito funcional',
        resultado,
        analise: this.parseStructuredAnalysis(resultado, dto),
        duracaoMs: Date.now() - startedAt,
        executadoEm: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida no GitHub Copilot';
      if (/timeout after \d+ms waiting for session\.idle/i.test(message)) {
        const timeoutMinutes = Math.round(timeoutMs / 60_000);
        throw new InternalServerErrorException(`A análise ultrapassou o limite de ${timeoutMinutes} minutos sem concluir. O conteúdo enviado é extenso; tente novamente ou reduza o requisito se o problema persistir.`);
      }
      throw new InternalServerErrorException(`Não foi possível executar o Analisador de US pelo GitHub Copilot: ${message}`);
    } finally {
      unsubscribe?.();
      if (session) await session.disconnect().catch(() => undefined);
      await client.stop().catch(() => undefined);
    }
  }

  private agentTimeoutMs() {
    const configured = Number(process.env.COPILOT_AGENT_TIMEOUT_MS);
    return Number.isFinite(configured) && configured >= 60_000 ? configured : DEFAULT_AGENT_TIMEOUT_MS;
  }

  private detectPhase(content: string): ExecutionPhase {
    if (content.includes('"cenariosTeste"')) return 'scenarios';
    if (content.includes('"perguntasRefinamento"')) return 'questions';
    if (content.includes('"regrasNegocio"')) return 'rules';
    if (content.includes('"gate"')) return 'gate';
    return content.length > 0 ? 'requirement' : 'copilot';
  }

  private schedulePersistence(job: AnalysisJob) {
    if (this.persistTimers.has(job.id)) return;
    const timer = setTimeout(() => {
      this.persistTimers.delete(job.id);
      void this.enqueuePersistence(job).catch(() => undefined);
    }, 750);
    this.persistTimers.set(job.id, timer);
  }

  private async flushPersistence(job: AnalysisJob) {
    const timer = this.persistTimers.get(job.id);
    if (timer) clearTimeout(timer);
    this.persistTimers.delete(job.id);
    await this.enqueuePersistence(job);
  }

  private enqueuePersistence(job: AnalysisJob) {
    const snapshot = {
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      message: job.message,
      partialContent: job.partialContent,
      result: job.result ? JSON.parse(JSON.stringify(job.result)) as Prisma.InputJsonValue : Prisma.DbNull,
      error: job.error ?? null,
      startedAt: job.startedAt ? new Date(job.startedAt) : null,
      completedAt: job.completedAt ? new Date(job.completedAt) : null,
    };
    const previous = this.persistChains.get(job.id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      await this.prisma.agentExecution.update({ where: { id: job.id }, data: snapshot });
    });
    this.persistChains.set(job.id, next);
    return next;
  }

  private jobFromRecord(record: AgentExecution): AnalysisJob {
    let result = record.result && typeof record.result === 'object' && !Array.isArray(record.result)
      ? record.result as unknown as AnalysisResult
      : undefined;
    if (result?.analise) {
      result = {
        ...result,
        analise: this.parseStructuredAnalysis(result.resultado, {
          projetoId: record.projetoId,
          titulo: record.titulo ?? undefined,
          requisito: record.requisito,
        }),
      };
    }
    return {
      id: record.id,
      actorUserId: record.actorUserId,
      actorEmail: '',
      projetoId: record.projetoId,
      titulo: record.titulo ?? undefined,
      requisito: record.requisito,
      status: record.status as ExecutionStatus,
      phase: record.phase as ExecutionPhase,
      progress: record.progress,
      message: record.message,
      partialContent: record.partialContent,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      result,
      error: record.error ?? undefined,
      startedAt: record.startedAt?.toISOString(),
      completedAt: record.completedAt?.toISOString(),
    };
  }

  private publicJob(job: AnalysisJob) {
    const content = job.partialContent;
    const count = (pattern: RegExp) => (content.match(pattern) ?? []).length;
    const gateStatus = content.match(/"status"\s*:\s*"(PASS|CONDITIONAL|FAIL)"/)?.[1] ?? null;
    const title = content.match(/"titulo"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1]?.replace(/\\"/g, '"') ?? null;
    return {
      id: job.id,
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      message: job.message,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      live: {
        characters: content.length,
        title,
        gateStatus,
        rules: count(/"id"\s*:\s*"RN\d+/g),
        questions: count(/"id"\s*:\s*"Q\d+/g),
        scenarios: count(/"id"\s*:\s*"TC-[BF]\d+/g),
      },
      result: job.result,
      error: job.error,
    };
  }

  private pruneJobs() {
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    for (const [id, job] of this.jobs) {
      if (new Date(job.updatedAt).getTime() < cutoff) this.jobs.delete(id);
    }
  }

  private parseStructuredAnalysis(raw: string, dto: RunUsAnalyserDto): StructuredAnalysis {
    const withoutFence = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');

    if (start >= 0 && end > start) {
      const json = withoutFence.slice(start, end + 1);
      const repairedJson = json
        .replace(/(:\s*)\\"/g, '$1"')
        .replace(/\\"(?=\s*[,}\]])/g, '"');

      for (const candidate of [json, repairedJson]) {
        try {
          const parsed = JSON.parse(candidate) as StructuredAnalysis;
          if (parsed.requisito && parsed.gate && Array.isArray(parsed.perguntasRefinamento) && Array.isArray(parsed.cenariosTeste)) {
            return this.normalizeStructuredAnalysis(parsed, dto);
          }
        } catch {
          // Tenta o próximo candidato antes de recorrer ao fallback.
        }
      }
    }

    return this.mergePartialSections(raw, dto, {
      requisito: {
        identificador: dto.titulo?.trim() || 'Não informado',
        titulo: dto.titulo?.trim() || 'Requisito funcional',
        resumo: 'A análise foi concluída, mas o retorno não veio no novo formato estruturado. Consulte o relatório técnico nesta execução.',
        modo: 'Não classificado',
        escopo: 'Não classificado',
        criteriosAceite: [],
      },
      requisitoReescrito: {
        titulo: dto.titulo?.trim() || 'Requisito funcional',
        historiaUsuario: 'Disponível após uma nova execução no formato estruturado.',
        contexto: 'Consulte o relatório técnico desta execução.',
        objetivo: 'Não informado.',
        escopoIncluido: [],
        escopoFora: [],
        criteriosAceite: [],
        dependencias: [],
        premissas: [],
        pendencias: [],
      },
      gate: {
        status: 'CONDITIONAL',
        coerencia: { nota: 0, justificativa: 'Disponível no relatório técnico.' },
        completude: { nota: 0, justificativa: 'Disponível no relatório técnico.' },
        testabilidade: { nota: 0, justificativa: 'Disponível no relatório técnico.' },
        findings: [],
        decisoesHumanas: [],
      },
      regrasNegocio: [],
      perguntasRefinamento: [],
      cenariosTeste: [],
      riscosAdicionais: [],
    });
  }

  private parsePartialStructuredAnalysis(raw: string, dto: RunUsAnalyserDto): StructuredAnalysis {
    return this.parseStructuredAnalysis(raw, dto);
  }

  private mergePartialSections(raw: string, dto: RunUsAnalyserDto, base: StructuredAnalysis): StructuredAnalysis {
    const repairedRaw = raw
      .replace(/(:\s*)\\"/g, '$1"')
      .replace(/\\"(?=\s*[,}\]])/g, '"');
    const requisito = this.extractJsonSection<StructuredAnalysis['requisito']>(repairedRaw, 'requisito');
    const requisitoReescrito = this.extractJsonSection<StructuredAnalysis['requisitoReescrito']>(repairedRaw, 'requisitoReescrito');
    const gate = this.extractJsonSection<StructuredAnalysis['gate']>(repairedRaw, 'gate');
    const regrasNegocio = this.extractJsonSection<StructuredAnalysis['regrasNegocio']>(repairedRaw, 'regrasNegocio')
      ?? this.extractCompletedObjects<StructuredAnalysis['regrasNegocio'][number]>(repairedRaw, 'regrasNegocio');
    const perguntasRefinamento = this.extractJsonSection<StructuredAnalysis['perguntasRefinamento']>(repairedRaw, 'perguntasRefinamento')
      ?? this.extractCompletedObjects<StructuredAnalysis['perguntasRefinamento'][number]>(repairedRaw, 'perguntasRefinamento');
    const cenariosTeste = this.extractJsonSection<StructuredAnalysis['cenariosTeste']>(repairedRaw, 'cenariosTeste')
      ?? this.extractCompletedObjects<StructuredAnalysis['cenariosTeste'][number]>(repairedRaw, 'cenariosTeste');

    return this.normalizeStructuredAnalysis({
      ...base,
      requisito: requisito ?? base.requisito,
      requisitoReescrito: requisitoReescrito ?? base.requisitoReescrito,
      gate: gate ?? base.gate,
      regrasNegocio: regrasNegocio.length ? regrasNegocio : base.regrasNegocio,
      perguntasRefinamento: perguntasRefinamento.length ? perguntasRefinamento : base.perguntasRefinamento,
      cenariosTeste: cenariosTeste.length ? cenariosTeste : base.cenariosTeste,
    }, dto);
  }

  private extractJsonSection<T>(raw: string, key: string): T | undefined {
    const keyIndex = raw.indexOf(`"${key}"`);
    if (keyIndex < 0) return undefined;
    const colonIndex = raw.indexOf(':', keyIndex + key.length + 2);
    if (colonIndex < 0) return undefined;
    const start = raw.slice(colonIndex + 1).search(/[\[{]/);
    if (start < 0) return undefined;
    const absoluteStart = colonIndex + 1 + start;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let index = absoluteStart; index < raw.length; index += 1) {
      const char = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        stack.pop();
        if (stack.length === 0) return this.tryParseJson<T>(raw.slice(absoluteStart, index + 1));
      }
    }
    return undefined;
  }

  private extractCompletedObjects<T>(raw: string, key: string): T[] {
    const keyIndex = raw.indexOf(`"${key}"`);
    if (keyIndex < 0) return [];
    const arrayStart = raw.indexOf('[', keyIndex + key.length + 2);
    if (arrayStart < 0) return [];
    const results: T[] = [];
    const stack: string[] = [];
    let itemStart = -1;
    let inString = false;
    let escaped = false;

    for (let index = arrayStart; index < raw.length; index += 1) {
      const char = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '[') stack.push(char);
      else if (char === '{') {
        if (stack.length === 1) itemStart = index;
        stack.push(char);
      } else if (char === '}') {
        if (stack.length === 2 && itemStart >= 0) {
          const parsed = this.tryParseJson<T>(raw.slice(itemStart, index + 1));
          if (parsed) results.push(parsed);
          itemStart = -1;
        }
        stack.pop();
      } else if (char === ']') {
        stack.pop();
        if (stack.length === 0) break;
      }
    }
    return results;
  }

  private tryParseJson<T>(value: string): T | undefined {
    const repaired = value
      .replace(/(:\s*)\\"/g, '$1"')
      .replace(/\\"(?=\s*[,}\]])/g, '"');
    for (const candidate of [value, repaired]) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Tenta o próximo candidato.
      }
    }
    return undefined;
  }

  private async buildPartialResult(
    dto: RunUsAnalyserDto,
    content: string,
    createdAt: string,
    reason: string,
  ): Promise<AnalysisResult> {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: dto.projetoId },
      select: { id: true, nome: true, codigo: true },
    });
    if (!projeto) throw new NotFoundException(`Projeto ${dto.projetoId} não encontrado`);
    return {
      agent: AGENT_NAME,
      provider: 'GitHub Copilot',
      projeto,
      titulo: dto.titulo?.trim() || 'Requisito funcional',
      resultado: content,
      analise: this.parsePartialStructuredAnalysis(content, dto),
      duracaoMs: Date.now() - new Date(createdAt).getTime(),
      executadoEm: new Date().toISOString(),
      parcial: true,
      motivoInterrupcao: reason,
    };
  }

  private cleanAgentText(value: string) {
    return value
      .replace(/^\s*```(?:\w+)?\s*|\s*```\s*$/g, '')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/\*\*|__|`/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private sanitizeAgentValue<T>(value: T): T {
    if (typeof value === 'string') return this.cleanAgentText(value) as T;
    if (Array.isArray(value)) return value.map((item) => this.sanitizeAgentValue(item)) as T;
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.sanitizeAgentValue(item)])) as T;
    }
    return value;
  }

  private normalizeIdentifier(value: string | undefined, fallback?: string) {
    const cleaned = this.cleanAgentText(value || fallback || 'Não informado');
    const ticket = cleaned.match(/\b[A-Z][A-Z0-9]{1,15}-\d+\b/i)?.[0];
    if (ticket) return ticket.toUpperCase();
    return cleaned.replace(/^identificador\s*:?\s*/i, '').trim() || 'Não informado';
  }

  private normalizeStructuredAnalysis(parsed: StructuredAnalysis, dto: RunUsAnalyserDto): StructuredAnalysis {
    parsed = this.sanitizeAgentValue(parsed);
    return {
      requisito: {
        identificador: this.normalizeIdentifier(parsed.requisito.identificador, dto.titulo?.trim()),
        titulo: parsed.requisito.titulo || dto.titulo?.trim() || 'Requisito funcional',
        resumo: parsed.requisito.resumo || 'Resumo não informado pelo agent.',
        modo: parsed.requisito.modo || 'Não classificado',
        escopo: parsed.requisito.escopo || 'Não classificado',
        criteriosAceite: Array.isArray(parsed.requisito.criteriosAceite) ? parsed.requisito.criteriosAceite : [],
      },
      requisitoReescrito: {
        titulo: parsed.requisitoReescrito?.titulo || parsed.requisito.titulo || dto.titulo?.trim() || 'Requisito funcional',
        historiaUsuario: parsed.requisitoReescrito?.historiaUsuario || 'Não informada pelo agent.',
        contexto: parsed.requisitoReescrito?.contexto || parsed.requisito.resumo || 'Não informado.',
        objetivo: parsed.requisitoReescrito?.objetivo || 'Não informado.',
        escopoIncluido: Array.isArray(parsed.requisitoReescrito?.escopoIncluido) ? parsed.requisitoReescrito.escopoIncluido : [],
        escopoFora: Array.isArray(parsed.requisitoReescrito?.escopoFora) ? parsed.requisitoReescrito.escopoFora : [],
        criteriosAceite: Array.isArray(parsed.requisitoReescrito?.criteriosAceite) ? parsed.requisitoReescrito.criteriosAceite : [],
        dependencias: Array.isArray(parsed.requisitoReescrito?.dependencias) ? parsed.requisitoReescrito.dependencias : [],
        premissas: Array.isArray(parsed.requisitoReescrito?.premissas) ? parsed.requisitoReescrito.premissas : [],
        pendencias: Array.isArray(parsed.requisitoReescrito?.pendencias) ? parsed.requisitoReescrito.pendencias : [],
      },
      gate: {
        status: ['PASS', 'CONDITIONAL', 'FAIL'].includes(parsed.gate.status) ? parsed.gate.status : 'CONDITIONAL',
        coerencia: parsed.gate.coerencia ?? { nota: 0, justificativa: 'Não avaliada.' },
        completude: parsed.gate.completude ?? { nota: 0, justificativa: 'Não avaliada.' },
        testabilidade: parsed.gate.testabilidade ?? { nota: 0, justificativa: 'Não avaliada.' },
        findings: Array.isArray(parsed.gate.findings) ? parsed.gate.findings : [],
        decisoesHumanas: Array.isArray(parsed.gate.decisoesHumanas) ? parsed.gate.decisoesHumanas : [],
      },
      regrasNegocio: Array.isArray(parsed.regrasNegocio) ? parsed.regrasNegocio : [],
      perguntasRefinamento: Array.isArray(parsed.perguntasRefinamento) ? parsed.perguntasRefinamento : [],
      cenariosTeste: Array.isArray(parsed.cenariosTeste) ? parsed.cenariosTeste : [],
      riscosAdicionais: Array.isArray(parsed.riscosAdicionais) ? parsed.riscosAdicionais : [],
    };
  }

  private loadAgentPrompt() {
    const candidates = [
      resolve(process.cwd(), 'agents', '.github', 'agents'),
      resolve(process.cwd(), '..', '..', 'agents', '.github', 'agents'),
    ];
    const workingDirectory = candidates.find((candidate) => existsSync(resolve(candidate, AGENT_FILE)));
    if (!workingDirectory) {
      throw new InternalServerErrorException(`Definição do agent ${AGENT_FILE} não encontrada.`);
    }
    return {
      workingDirectory,
      prompt: readFileSync(resolve(workingDirectory, AGENT_FILE), 'utf8'),
    };
  }

  private buildExecutionPrompt(
    dto: RunUsAnalyserDto,
    projeto: {
      nome: string;
      codigo: string;
      status: string;
      descricao: string | null;
      objetivo: string | null;
      areaNegocio: string | null;
      idiomas: string[];
      paisesDisponiveis: string[];
      responsavelPrincipal: string | null;
      _count: { times: number; pessoas: number; produtos: number };
    },
    actorEmail: string,
  ) {
    return `Execute a análise do requisito abaixo em PT-BR, seguindo integralmente sua definição de agent.

RESTRIÇÕES DESTA EXECUÇÃO:
- Não use ferramentas, não leia arquivos e não grave artefatos.
- Entregue na resposta todo o conteúdo que normalmente seria salvo em docs/analysis.
- Não invente regras; marque decisões que dependem do PO.
- Reescreva o material bruto em um requisito profissional, claro, atômico e testável.
- Preserve inferências, contradições e lacunas como premissas ou pendências; nunca as apresente como fatos confirmados.
- Sua resposta deve ser SOMENTE um objeto JSON válido, sem Markdown, comentários ou blocos de código.
- Preencha todas as propriedades do contrato abaixo. Use arrays vazios quando não houver itens.
- Respeite rigorosamente a ordem das propriedades do contrato: requisito, requisitoReescrito, gate, regrasNegocio, perguntasRefinamento, cenariosTeste e riscosAdicionais.
- Priorize requisito, reescrita e gate. Se a resposta estiver próxima do limite, reduza a quantidade de cenários e finalize um JSON válido; nunca interrompa no meio de um objeto.
- Seja objetivo nas descrições para que a resposta completa permaneça abaixo do limite do provider.

CONTRATO JSON OBRIGATÓRIO:
{
  "requisito": {
    "identificador": "string",
    "titulo": "string",
    "resumo": "string",
    "modo": "Nova US | Mudança em desenvolvimento | Ajuste fora de sprint",
    "escopo": "Backend | Frontend | Misto",
    "criteriosAceite": ["string"]
  },
  "requisitoReescrito": {
    "titulo": "string",
    "historiaUsuario": "Como [perfil], quero [capacidade], para [benefício]",
    "contexto": "string",
    "objetivo": "string",
    "escopoIncluido": ["string"],
    "escopoFora": ["string"],
    "criteriosAceite": [{ "id": "AC01", "descricao": "critério atômico e testável", "tipo": "Confirmado | Inferido | Requer confirmação" }],
    "dependencias": ["string"],
    "premissas": ["string"],
    "pendencias": ["string"]
  },
  "gate": {
    "status": "PASS | CONDITIONAL | FAIL",
    "coerencia": { "nota": 0, "justificativa": "string" },
    "completude": { "nota": 0, "justificativa": "string" },
    "testabilidade": { "nota": 0, "justificativa": "string" },
    "findings": [{ "categoria": "string", "severidade": "Critical | High | Medium | Low", "trecho": "string", "recomendacao": "string" }],
    "decisoesHumanas": ["string"]
  },
  "regrasNegocio": [{ "id": "RN01", "regra": "string", "origem": "trecho do requisito", "status": "Confirmada | Inferida | Requer confirmação", "risco": "Alto | Médio | Baixo - descrição objetiva do impacto" }],
  "perguntasRefinamento": [{ "id": "Q01", "pergunta": "string", "trechoOrigem": "string", "riscoMitigado": "string", "criticidade": "Alta | Média | Baixa" }],
  "cenariosTeste": [{ "id": "TC-B001 ou TC-F001", "titulo": "string", "tipo": "Funcional | Borda | Negativo | Segurança | Concorrência | Visual", "execucao": "AUTOMAÇÃO | MANUAL | AMBOS", "escopo": "Backend | Frontend", "dado": "string", "quando": "string", "entao": "string", "criterioRelacionado": "string" }],
  "riscosAdicionais": ["string"]
}

CONTEXTO ISOLADO DO PROJETO:
- Projeto: ${projeto.nome} (${projeto.codigo})
- Status: ${projeto.status}
- Área de negócio: ${projeto.areaNegocio ?? 'Não informada'}
- Objetivo: ${projeto.objetivo ?? 'Não informado'}
- Descrição: ${projeto.descricao ?? 'Não informada'}
- Responsável: ${projeto.responsavelPrincipal ?? 'Não informado'}
- Idiomas: ${projeto.idiomas.join(', ') || 'Não informados'}
- Países: ${projeto.paisesDisponiveis.join(', ') || 'Não informados'}
- Estrutura cadastrada: ${projeto._count.times} time(s), ${projeto._count.pessoas} pessoa(s), ${projeto._count.produtos} produto(s)
- Solicitante no Nexo: ${actorEmail}

TÍTULO OU IDENTIFICADOR:
${dto.titulo?.trim() || 'Não informado; derive do requisito e use o fallback previsto.'}

REQUISITO FUNCIONAL:
${dto.requisito.trim()}`;
  }
}
