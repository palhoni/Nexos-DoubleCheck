import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JornadasService } from '../jornadas/jornadas.service';
import { RegrasService } from '../regras/regras.service';
import { FontesService } from '../fontes/fontes.service';
import { DocumentosService } from '../documentos/documentos.service';
import { StartJourneyMapperDto } from './dto/start-journey-mapper.dto';
import { AgentRunnerFactory } from './runtime/agent-runner.factory';
import { loadAgentDefinition } from './runtime/agent-definition.loader';
import { AgentTimeoutError } from './runtime/agent-runner.types';
import type { ClaudeTextRunRequest } from './runtime/claude-text.runner';
import { extractCompletedObjects, tryParseJson } from './runtime/json-salvage.util';

const AGENT_NAME = 'agent-mapeador-jornadas';
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ETAPA_LENGTH = 120;

type ProdutoResumo = { id: string; nome: string; codigo: string; projetoId: string };
type ExecutionActor = { userId: string; email: string };
type ExecutionStatus = 'queued' | 'processing' | 'completed' | 'failed';
type JourneyMapperPhase =
  | 'queued'
  | 'auditando-cobertura'
  | 'compondo-narrativas'
  | 'persistindo'
  | 'completed'
  | 'failed';

type ModuloContext = { id: string; nome: string; codigo: string };
type FuncionalidadeContext = {
  id: string;
  nome: string;
  codigo: string;
  moduloId: string | null;
  regras: string[];
  jaEmJornada: boolean;
};
type PublicoAlvoContext = { id: string; nome: string; tipoUsuario: string | null };
type JornadaContext = {
  id: string;
  nome: string;
  publicoAlvoId: string | null;
  etapas: string[];
  moduloIds: string[];
  funcionalidadeIds: string[];
};
type RegraContext = { id: string; nome: string; moduloIds: string[]; funcionalidadeIds: string[] };
type ProdutoParticipanteContext = { id: string; nome: string; codigo: string };
type FonteContext = { id: string; nome: string; tipo: string; referencia: string };
type DocumentoContext = { id: string; titulo: string; tipo: string; resumo: string | null };

type JourneyMapperContext = {
  modulos: ModuloContext[];
  funcionalidades: FuncionalidadeContext[];
  publicoAlvo: PublicoAlvoContext[];
  jornadas: JornadaContext[];
  regras: RegraContext[];
  produtosDoProjeto: ProdutoParticipanteContext[];
  fontes: FonteContext[];
  documentos: DocumentoContext[];
  cobertasAntes: number;
};

type VinculoComContexto = { id: string; contexto?: string };

type JornadaNovaProposta = {
  nome: string;
  descricao?: string;
  objetivo?: string;
  eventoInicial?: string;
  resultadoEsperado?: string;
  publicoAlvoId: string;
  moduloIds: string[];
  funcionalidadeIds: string[];
  etapas: string[];
  regraIds: string[];
  produtoParticipanteIds: string[];
  fontes: VinculoComContexto[];
  documentos: VinculoComContexto[];
};
type JornadaEstendidaProposta = {
  jornadaId: string;
  addModuloIds: string[];
  addFuncionalidadeIds: string[];
  addEtapas: string[];
  addRegraIds: string[];
  addProdutoParticipanteIds: string[];
  addFontes: VinculoComContexto[];
  addDocumentos: VinculoComContexto[];
};
type ForaDeEscopoItem = { funcionalidadeId: string; motivo: string };
type JourneyMapperProposal = {
  jornadasNovas: JornadaNovaProposta[];
  jornadasEstendidas: JornadaEstendidaProposta[];
  foraDeEscopo: ForaDeEscopoItem[];
};

type JourneyMapperResult = {
  agent: typeof AGENT_NAME;
  provider: 'Anthropic';
  produto: ProdutoResumo;
  foco?: string;
  cobertura: { funcionalidadesTotais: number; cobertasAntes: number; cobertasDepois: number };
  jornadasCriadas: Array<{ id: string; nome: string }>;
  jornadasEstendidas: Array<{ id: string; nome: string; funcionalidadesAdicionadas: number; etapasAdicionadas: number }>;
  relacionamentos: { regras: number; produtosParticipantes: number; fontes: number; documentos: number };
  foraDeEscopo: ForaDeEscopoItem[];
  erros: string[];
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
};

type JourneyMapperJob = {
  id: string;
  actorUserId: string;
  actorEmail: string;
  projetoId: string;
  produtoId: string;
  foco?: string;
  status: ExecutionStatus;
  phase: JourneyMapperPhase;
  progress: number;
  message: string;
  partialContent: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: JourneyMapperResult;
  error?: string;
};

@Injectable()
export class JourneyMapperService {
  private readonly jobs = new Map<string, JourneyMapperJob>();
  private readonly persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly persistChains = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly runners: AgentRunnerFactory,
    private readonly jornadasService: JornadasService,
    private readonly regrasService: RegrasService,
    private readonly fontesService: FontesService,
    private readonly documentosService: DocumentosService,
  ) {}

  async start(dto: StartJourneyMapperDto, actor: ExecutionActor) {
    const produto = await this.prisma.produto.findUnique({
      where: { id: dto.produtoId },
      select: { id: true, nome: true, codigo: true, projetoId: true },
    });
    if (!produto) throw new NotFoundException(`Produto ${dto.produtoId} não encontrado`);

    const [funcionalidadesCount, publicoAlvoCount] = await Promise.all([
      this.prisma.funcionalidade.count({ where: { produtoId: produto.id } }),
      this.prisma.publicoAlvo.count({ where: { produtoId: produto.id } }),
    ]);
    if (funcionalidadesCount === 0) {
      throw new BadRequestException(
        'Este produto ainda não tem Módulos/Funcionalidades cadastrados. Jornada é sempre composta a partir de Funcionalidades que já existem — cadastre a estrutura de Módulos e Funcionalidades antes de mapear jornadas.',
      );
    }
    if (publicoAlvoCount === 0) {
      throw new BadRequestException(
        'Este produto ainda não tem Público-alvo cadastrado. Toda Jornada pertence a exatamente um Público-alvo — cadastre ao menos um antes de mapear jornadas.',
      );
    }

    const now = new Date().toISOString();
    const job: JourneyMapperJob = {
      id: randomUUID(),
      actorUserId: actor.userId,
      actorEmail: actor.email,
      projetoId: produto.projetoId,
      produtoId: produto.id,
      foco: dto.foco?.trim() || undefined,
      status: 'queued',
      phase: 'queued',
      progress: 3,
      message: 'Levantando a estrutura atual do produto...',
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
        titulo: `Jornadas — ${produto.nome}`,
        requisito: `Mapeamento de jornadas do produto ${produto.nome} (${produto.codigo})${job.foco ? ` — foco: ${job.foco}` : ''}`,
        status: job.status,
        phase: job.phase,
        progress: job.progress,
        message: job.message,
      },
    });
    this.jobs.set(job.id, job);
    void this.execute(job, produto).catch(() => undefined);
    return this.publicJob(job);
  }

  async getExecution(id: string, actorUserId: string) {
    const job = this.jobs.get(id);
    if (job && job.actorUserId === actorUserId) return this.publicJob(job);
    const record = await this.prisma.agentExecution.findFirst({
      where: { id, actorUserId, agent: AGENT_NAME },
    });
    if (!record) throw new NotFoundException('Execução do Mapeador de Jornadas não encontrada.');
    return this.publicJob(this.jobFromRecord(record));
  }

  async listExecutions(actorUserId: string, projetoId?: string) {
    const rows = await this.prisma.agentExecution.findMany({
      where: { actorUserId, agent: AGENT_NAME, ...(projetoId ? { projetoId } : {}) },
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
    return rows.map(({ result, ...row }) => ({ ...row, hasResult: result !== null }));
  }

  private async execute(job: JourneyMapperJob, produto: ProdutoResumo) {
    try {
      const runOutput = await this.runModel(job, produto);
      const result = await this.persistProposal(job, produto, runOutput);
      job.result = result;
      job.status = 'completed';
      job.phase = 'completed';
      job.progress = 100;
      job.message = `Mapeamento concluído — ${result.jornadasCriadas.length} jornada(s) criada(s), ${result.jornadasEstendidas.length} estendida(s).`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida ao mapear as jornadas';
      job.status = 'failed';
      job.phase = 'failed';
      job.error = message;
      job.message = 'Não foi possível concluir o mapeamento de jornadas.';
    } finally {
      job.updatedAt = new Date().toISOString();
      job.completedAt = job.updatedAt;
      await this.flushPersistence(job);
    }
  }

  private async buildContext(produto: ProdutoResumo): Promise<JourneyMapperContext> {
    const [modulos, funcionalidades, publicoAlvo, jornadas, regras, produtosDoProjeto, fontes, documentos] = await Promise.all([
      this.prisma.modulo.findMany({
        where: { produtoId: produto.id },
        select: { id: true, nome: true, codigo: true },
        orderBy: { ordemExibicao: 'asc' },
      }),
      this.prisma.funcionalidade.findMany({
        where: { produtoId: produto.id },
        select: { id: true, nome: true, codigo: true, moduloId: true },
      }),
      this.prisma.publicoAlvo.findMany({
        where: { produtoId: produto.id },
        select: { id: true, nome: true, tipoUsuario: true },
      }),
      this.prisma.jornada.findMany({
        where: { produtoId: produto.id },
        select: {
          id: true,
          nome: true,
          publicoAlvoId: true,
          etapas: true,
          modulos: { select: { id: true } },
          funcionalidades: { select: { id: true } },
        },
      }),
      this.prisma.regra.findMany({
        where: { produtoId: produto.id, versaoAtual: true },
        select: {
          id: true,
          nome: true,
          modulos: { select: { id: true } },
          funcionalidades: { select: { id: true } },
        },
      }),
      this.prisma.produto.findMany({
        where: { projetoId: produto.projetoId, id: { not: produto.id } },
        select: { id: true, nome: true, codigo: true },
      }),
      this.prisma.fonteConhecimento.findMany({
        where: { projetoId: produto.projetoId },
        select: { id: true, nome: true, tipo: true, referencia: true },
      }),
      this.prisma.documentoConhecimento.findMany({
        where: { projetoId: produto.projetoId },
        select: { id: true, titulo: true, tipo: true, resumo: true },
      }),
    ]);

    const regraNomesPorFuncionalidade = new Map<string, string[]>();
    for (const regra of regras) {
      for (const funcionalidade of regra.funcionalidades) {
        const lista = regraNomesPorFuncionalidade.get(funcionalidade.id) ?? [];
        lista.push(regra.nome);
        regraNomesPorFuncionalidade.set(funcionalidade.id, lista);
      }
    }

    const jornadasContext: JornadaContext[] = jornadas.map((jornada) => ({
      id: jornada.id,
      nome: jornada.nome,
      publicoAlvoId: jornada.publicoAlvoId,
      etapas: jornada.etapas,
      moduloIds: jornada.modulos.map((modulo) => modulo.id),
      funcionalidadeIds: jornada.funcionalidades.map((funcionalidade) => funcionalidade.id),
    }));
    const cobertasAntesSet = new Set(jornadasContext.flatMap((jornada) => jornada.funcionalidadeIds));

    return {
      modulos,
      funcionalidades: funcionalidades.map((funcionalidade) => ({
        id: funcionalidade.id,
        nome: funcionalidade.nome,
        codigo: funcionalidade.codigo,
        moduloId: funcionalidade.moduloId,
        regras: regraNomesPorFuncionalidade.get(funcionalidade.id) ?? [],
        jaEmJornada: cobertasAntesSet.has(funcionalidade.id),
      })),
      publicoAlvo,
      jornadas: jornadasContext,
      regras: regras.map((regra) => ({
        id: regra.id,
        nome: regra.nome,
        moduloIds: regra.modulos.map((modulo) => modulo.id),
        funcionalidadeIds: regra.funcionalidades.map((funcionalidade) => funcionalidade.id),
      })),
      produtosDoProjeto,
      fontes,
      documentos: documentos.map((documento) => ({
        id: documento.id,
        titulo: documento.titulo,
        tipo: documento.tipo,
        resumo: documento.resumo,
      })),
      cobertasAntes: cobertasAntesSet.size,
    };
  }

  private async runModel(job: JourneyMapperJob, produto: ProdutoResumo) {
    const definition = loadAgentDefinition(AGENT_NAME);
    const timeoutMs = this.timeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      job.status = 'processing';
      job.phase = 'auditando-cobertura';
      job.progress = 10;
      job.message = 'Levantando módulos, funcionalidades, regras, fontes e documentos existentes...';
      job.startedAt ??= new Date().toISOString();
      this.schedulePersistence(job);

      const context = await this.buildContext(produto);

      job.phase = 'compondo-narrativas';
      job.progress = 20;
      job.message = 'Compondo as jornadas com o Claude...';
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
        userPrompt: this.buildUserPrompt(produto, job.foco, context),
        timeoutMs,
        signal: controller.signal,
        hooks: {
          onText: (delta) => {
            content += delta;
            job.partialContent = content;
            job.phase = 'compondo-narrativas';
            job.progress = Math.min(85, 20 + Math.floor(content.length / 300));
            job.message = 'Recebendo a proposta de jornadas...';
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
      if (!raw) throw new Error('O Claude concluiu a execução sem retornar conteúdo.');

      job.phase = 'persistindo';
      job.progress = 90;
      job.message = 'Criando e estendendo as jornadas e seus relacionamentos...';

      const proposal = this.parseProposal(raw);
      return { proposal, context, startedAt, maxTokensHit: run.stopReason === 'max_tokens' };
    } catch (error) {
      if (error instanceof AgentTimeoutError) {
        throw new InternalServerErrorException(
          `O mapeamento de jornadas ultrapassou o limite de ${Math.round(timeoutMs / 60_000)} minutos sem concluir.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private parseVinculos(value: unknown): VinculoComContexto[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') return { id: item };
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const id = record.id ?? record.fonteId ?? record.documentoId;
          if (typeof id !== 'string' || !id) return null;
          return { id, contexto: typeof record.contexto === 'string' ? record.contexto : undefined };
        }
        return null;
      })
      .filter((item): item is VinculoComContexto => item !== null);
  }

  private parseProposal(raw: string): JourneyMapperProposal {
    const withoutFence = raw
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    let parsed: Partial<{
      jornadasNovas: Partial<Record<string, unknown>>[];
      jornadasEstendidas: Partial<Record<string, unknown>>[];
      foraDeEscopo: Partial<ForaDeEscopoItem>[];
    }> = {};

    if (start >= 0 && end > start) {
      parsed = tryParseJson(withoutFence.slice(start, end + 1)) ?? {};
    }
    const rawNovas =
      Array.isArray(parsed.jornadasNovas) && parsed.jornadasNovas.length
        ? parsed.jornadasNovas
        : extractCompletedObjects<Record<string, unknown>>(withoutFence, 'jornadasNovas');
    const rawEstendidas =
      Array.isArray(parsed.jornadasEstendidas) && parsed.jornadasEstendidas.length
        ? parsed.jornadasEstendidas
        : extractCompletedObjects<Record<string, unknown>>(withoutFence, 'jornadasEstendidas');
    const rawForaDeEscopo = Array.isArray(parsed.foraDeEscopo) ? parsed.foraDeEscopo : [];

    const asStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

    const jornadasNovas: JornadaNovaProposta[] = rawNovas
      .filter((item) => item.nome && item.publicoAlvoId)
      .map((item) => ({
        nome: String(item.nome).trim(),
        descricao: typeof item.descricao === 'string' ? item.descricao : undefined,
        objetivo: typeof item.objetivo === 'string' ? item.objetivo : undefined,
        eventoInicial: typeof item.eventoInicial === 'string' ? item.eventoInicial : undefined,
        resultadoEsperado: typeof item.resultadoEsperado === 'string' ? item.resultadoEsperado : undefined,
        publicoAlvoId: String(item.publicoAlvoId),
        moduloIds: asStringArray(item.moduloIds),
        funcionalidadeIds: asStringArray(item.funcionalidadeIds),
        etapas: asStringArray(item.etapas),
        regraIds: asStringArray(item.regraIds),
        produtoParticipanteIds: asStringArray(item.produtoParticipanteIds),
        fontes: this.parseVinculos(item.fontes),
        documentos: this.parseVinculos(item.documentos),
      }));

    const jornadasEstendidas: JornadaEstendidaProposta[] = rawEstendidas
      .filter((item) => Boolean(item.jornadaId))
      .map((item) => ({
        jornadaId: String(item.jornadaId),
        addModuloIds: asStringArray(item.addModuloIds),
        addFuncionalidadeIds: asStringArray(item.addFuncionalidadeIds),
        addEtapas: asStringArray(item.addEtapas),
        addRegraIds: asStringArray(item.addRegraIds),
        addProdutoParticipanteIds: asStringArray(item.addProdutoParticipanteIds),
        addFontes: this.parseVinculos(item.addFontes),
        addDocumentos: this.parseVinculos(item.addDocumentos),
      }));

    const foraDeEscopo: ForaDeEscopoItem[] = rawForaDeEscopo
      .filter((item) => Boolean(item.funcionalidadeId))
      .map((item) => ({ funcionalidadeId: item.funcionalidadeId!, motivo: item.motivo || 'Não informado' }));

    return { jornadasNovas, jornadasEstendidas, foraDeEscopo };
  }

  private sanitizeEtapa(etapa: string): string {
    const trimmed = etapa.trim();
    return trimmed.length > MAX_ETAPA_LENGTH ? `${trimmed.slice(0, MAX_ETAPA_LENGTH - 3)}...` : trimmed;
  }

  /** Regra é vinculada pelo lado da própria Regra (Jornada não expõe esse campo no seu
   *  CRUD) — soma o novo jornadaId ao que a regra já tinha, nunca substitui. */
  private async linkRegraToJornada(produtoId: string, regraId: string, jornadaId: string, actorUserId: string) {
    const atual = await this.regrasService.findOneOrThrow(produtoId, regraId);
    if (atual.jornadaIds.includes(jornadaId)) return false;
    await this.regrasService.update(produtoId, regraId, { jornadaIds: [...atual.jornadaIds, jornadaId] }, actorUserId);
    return true;
  }

  /** Vínculos de Fonte/Documento têm chave única (fonte/documento + entidade); rodar o
   *  agent de novo sobre uma jornada já processada não deve contar como erro. */
  private isDuplicateLinkError(error: unknown) {
    return error instanceof Error && /já est(á|ão) vinculad/i.test(error.message);
  }

  private async persistProposal(
    job: JourneyMapperJob,
    produto: ProdutoResumo,
    runOutput: { proposal: JourneyMapperProposal; context: JourneyMapperContext; startedAt: number; maxTokensHit: boolean },
  ): Promise<JourneyMapperResult> {
    const { proposal, context, startedAt, maxTokensHit } = runOutput;
    const moduloIdSet = new Set(context.modulos.map((modulo) => modulo.id));
    const funcionalidadeIdSet = new Set(context.funcionalidades.map((funcionalidade) => funcionalidade.id));
    const publicoAlvoIdSet = new Set(context.publicoAlvo.map((publicoAlvo) => publicoAlvo.id));
    const jornadaIdSet = new Set(context.jornadas.map((jornada) => jornada.id));
    const regraIdSet = new Set(context.regras.map((regra) => regra.id));
    const produtoParticipanteIdSet = new Set(context.produtosDoProjeto.map((produtoParticipante) => produtoParticipante.id));
    const fonteIdSet = new Set(context.fontes.map((fonte) => fonte.id));
    const documentoIdSet = new Set(context.documentos.map((documento) => documento.id));

    const jornadasCriadas: Array<{ id: string; nome: string }> = [];
    const jornadasEstendidas: Array<{ id: string; nome: string; funcionalidadesAdicionadas: number; etapasAdicionadas: number }> = [];
    const erros: string[] = [];
    const cobertasDepoisSet = new Set(context.funcionalidades.filter((funcionalidade) => funcionalidade.jaEmJornada).map((funcionalidade) => funcionalidade.id));
    let regrasVinculadas = 0;
    let produtosParticipantesVinculados = 0;
    let fontesVinculadas = 0;
    let documentosVinculados = 0;

    for (const item of proposal.jornadasNovas) {
      try {
        if (!publicoAlvoIdSet.has(item.publicoAlvoId)) {
          throw new Error(`público-alvo "${item.publicoAlvoId}" não pertence a este produto`);
        }
        const moduloIdsValidos = item.moduloIds.filter((id) => moduloIdSet.has(id));
        const funcionalidadeIdsValidos = item.funcionalidadeIds.filter((id) => funcionalidadeIdSet.has(id));
        if (funcionalidadeIdsValidos.length === 0) {
          throw new Error('nenhuma funcionalidade válida informada');
        }
        const produtoParticipanteIdsValidos = item.produtoParticipanteIds.filter((id) => produtoParticipanteIdSet.has(id));

        const criada = await this.jornadasService.create(
          produto.id,
          {
            nome: item.nome,
            descricao: item.descricao,
            objetivo: item.objetivo,
            eventoInicial: item.eventoInicial,
            resultadoEsperado: item.resultadoEsperado,
            publicoAlvoId: item.publicoAlvoId,
            moduloIds: moduloIdsValidos,
            funcionalidadeIds: funcionalidadeIdsValidos,
            produtoParticipanteIds: produtoParticipanteIdsValidos,
          },
          job.actorUserId,
        );
        for (const etapa of item.etapas) {
          await this.jornadasService.addEtapa(produto.id, criada.id, this.sanitizeEtapa(etapa));
        }
        funcionalidadeIdsValidos.forEach((id) => cobertasDepoisSet.add(id));
        produtosParticipantesVinculados += produtoParticipanteIdsValidos.length;

        for (const regraId of item.regraIds.filter((id) => regraIdSet.has(id))) {
          try {
            if (await this.linkRegraToJornada(produto.id, regraId, criada.id, job.actorUserId)) regrasVinculadas++;
          } catch (error) {
            erros.push(`Regra "${regraId}" em "${item.nome}": ${error instanceof Error ? error.message : 'falha desconhecida'}`);
          }
        }
        for (const fonte of item.fontes.filter((f) => fonteIdSet.has(f.id))) {
          try {
            await this.fontesService.createLink(fonte.id, { entityType: 'Jornada', entityId: criada.id, contexto: fonte.contexto }, job.actorUserId);
            fontesVinculadas++;
          } catch (error) {
            if (!this.isDuplicateLinkError(error)) erros.push(`Fonte "${fonte.id}" em "${item.nome}": ${error instanceof Error ? error.message : 'falha desconhecida'}`);
          }
        }
        for (const documento of item.documentos.filter((d) => documentoIdSet.has(d.id))) {
          try {
            await this.documentosService.createLink(documento.id, { entityType: 'Jornada', entityId: criada.id, contexto: documento.contexto }, job.actorUserId);
            documentosVinculados++;
          } catch (error) {
            if (!this.isDuplicateLinkError(error)) erros.push(`Documento "${documento.id}" em "${item.nome}": ${error instanceof Error ? error.message : 'falha desconhecida'}`);
          }
        }

        jornadasCriadas.push({ id: criada.id, nome: criada.nome });
      } catch (error) {
        erros.push(`Jornada nova "${item.nome}": ${error instanceof Error ? error.message : 'falha desconhecida'}`);
      }
    }

    for (const item of proposal.jornadasEstendidas) {
      try {
        if (!jornadaIdSet.has(item.jornadaId)) throw new Error('jornada informada não pertence a este produto');
        const atual = await this.jornadasService.findOneOrThrow(produto.id, item.jornadaId);
        const novosModuloIds = item.addModuloIds.filter((id) => moduloIdSet.has(id) && !atual.moduloIds.includes(id));
        const novosFuncionalidadeIds = item.addFuncionalidadeIds.filter((id) => funcionalidadeIdSet.has(id) && !atual.funcionalidadeIds.includes(id));
        const novosProdutoParticipanteIds = item.addProdutoParticipanteIds.filter((id) => produtoParticipanteIdSet.has(id) && !atual.produtoParticipanteIds.includes(id));

        if (novosModuloIds.length > 0 || novosFuncionalidadeIds.length > 0 || novosProdutoParticipanteIds.length > 0) {
          await this.jornadasService.update(
            produto.id,
            item.jornadaId,
            {
              moduloIds: [...atual.moduloIds, ...novosModuloIds],
              funcionalidadeIds: [...atual.funcionalidadeIds, ...novosFuncionalidadeIds],
              produtoParticipanteIds: [...atual.produtoParticipanteIds, ...novosProdutoParticipanteIds],
            },
            job.actorUserId,
          );
        }
        for (const etapa of item.addEtapas) {
          await this.jornadasService.addEtapa(produto.id, item.jornadaId, this.sanitizeEtapa(etapa));
        }
        novosFuncionalidadeIds.forEach((id) => cobertasDepoisSet.add(id));
        produtosParticipantesVinculados += novosProdutoParticipanteIds.length;

        for (const regraId of item.addRegraIds.filter((id) => regraIdSet.has(id))) {
          try {
            if (await this.linkRegraToJornada(produto.id, regraId, item.jornadaId, job.actorUserId)) regrasVinculadas++;
          } catch (error) {
            erros.push(`Regra "${regraId}" em "${atual.nome}": ${error instanceof Error ? error.message : 'falha desconhecida'}`);
          }
        }
        for (const fonte of item.addFontes.filter((f) => fonteIdSet.has(f.id))) {
          try {
            await this.fontesService.createLink(fonte.id, { entityType: 'Jornada', entityId: item.jornadaId, contexto: fonte.contexto }, job.actorUserId);
            fontesVinculadas++;
          } catch (error) {
            if (!this.isDuplicateLinkError(error)) erros.push(`Fonte "${fonte.id}" em "${atual.nome}": ${error instanceof Error ? error.message : 'falha desconhecida'}`);
          }
        }
        for (const documento of item.addDocumentos.filter((d) => documentoIdSet.has(d.id))) {
          try {
            await this.documentosService.createLink(documento.id, { entityType: 'Jornada', entityId: item.jornadaId, contexto: documento.contexto }, job.actorUserId);
            documentosVinculados++;
          } catch (error) {
            if (!this.isDuplicateLinkError(error)) erros.push(`Documento "${documento.id}" em "${atual.nome}": ${error instanceof Error ? error.message : 'falha desconhecida'}`);
          }
        }

        jornadasEstendidas.push({
          id: item.jornadaId,
          nome: atual.nome,
          funcionalidadesAdicionadas: novosFuncionalidadeIds.length,
          etapasAdicionadas: item.addEtapas.length,
        });
      } catch (error) {
        erros.push(`Extensão da jornada "${item.jornadaId}": ${error instanceof Error ? error.message : 'falha desconhecida'}`);
      }
    }

    return {
      agent: AGENT_NAME,
      provider: 'Anthropic',
      produto,
      foco: job.foco,
      cobertura: {
        funcionalidadesTotais: context.funcionalidades.length,
        cobertasAntes: context.cobertasAntes,
        cobertasDepois: cobertasDepoisSet.size,
      },
      jornadasCriadas,
      jornadasEstendidas,
      relacionamentos: {
        regras: regrasVinculadas,
        produtosParticipantes: produtosParticipantesVinculados,
        fontes: fontesVinculadas,
        documentos: documentosVinculados,
      },
      foraDeEscopo: proposal.foraDeEscopo,
      erros,
      duracaoMs: Date.now() - startedAt,
      executadoEm: new Date().toISOString(),
      ...(maxTokensHit
        ? {
            parcial: true,
            motivoInterrupcao: 'O modelo encerrou a geração por limite de saída (max_tokens); a proposta pode estar incompleta.',
          }
        : {}),
    };
  }

  private buildExecutionRules() {
    return `Vasculhe o contexto do produto fornecido (módulos, funcionalidades, público-alvo, regras, produtos do mesmo projeto, fontes de conhecimento, documentos e jornadas já existentes) e proponha jornadas novas e/ou extensões de jornadas existentes para cobrir os fluxos ponta-a-ponta relevantes ainda não mapeados, em PT-BR.

RESTRIÇÕES DESTA EXECUÇÃO:
- As pré-condições já foram satisfeitas pelo Nexo: o contexto abaixo já traz módulos, funcionalidades, público-alvo, regras, fontes, documentos e jornadas existentes reais deste produto/projeto — considere isso resolvido, não peça para "consultar o produto".
- Não use ferramentas, não leia arquivos e não grave nada — sua única saída é o JSON estruturado abaixo.
- Nunca invente um id de módulo, funcionalidade, público-alvo, regra, produto, fonte, documento ou jornada — use somente os ids fornecidos no contexto. Nunca invente uma funcionalidade nova.
- Cada jornada nova tem exatamente 1 publicoAlvoId, escolhido entre os públicos-alvo fornecidos.
- Prefira ESTENDER uma jornada existente (jornadasEstendidas) em vez de propor uma jornada quase-duplicada.
- Cada etapa deve ter no máximo 120 caracteres (limite real do sistema) — prefira frases curtas e diretas; etapas maiores serão cortadas automaticamente pelo Nexo.
- Não force toda funcionalidade a entrar em alguma jornada. Capacidades de suporte (configuração, relatório, auditoria, busca, notificação, tela de CRUD simples que não conta uma história própria) devem ir para "foraDeEscopo" com o motivo, não para uma jornada forçada.
- Funcionalidades marcadas "jaEmJornada": true no contexto já pertencem a alguma jornada existente — não ignore isso; só as inclua numa jornada nova ou extensão se genuinamente fizerem parte daquele fluxo.
- Regras ("regraIds"/"addRegraIds"): só vincule uma regra quando ela genuinamente rege, restringe ou muda o comportamento dessa jornada (ex.: uma condição que bloqueia ou desvia uma etapa) — não vincule toda regra do módulo só porque o módulo aparece na jornada. É normal uma jornada não ter nenhuma regra vinculada.
- Produtos participantes ("produtoParticipanteIds"/"addProdutoParticipanteIds"): só preencha quando o fluxo realmente atravessa outro produto do mesmo projeto. Na grande maioria das jornadas isso fica vazio — não force um produto participante.
- Fontes e documentos ("fontes"/"documentos" e os equivalentes "add*"): só vincule quando a fonte/documento genuinamente evidencia, especifica ou explica esse processo. Cada item é um objeto { "id": "...", "contexto": "por que essa fonte/documento é relevante PARA ESTA jornada, em até 200 caracteres" }. Não vincule documentos/fontes genéricos do projeto que não tenham relação direta com o fluxo.
- Escreva todos os textos em português do Brasil.
- Sua resposta deve ser SOMENTE um objeto JSON válido, sem Markdown, comentários ou blocos de código.

CONTRATO JSON OBRIGATÓRIO:
{
  "jornadasNovas": [
    {
      "nome": "string — curto, substantivo do fluxo",
      "descricao": "string (1-2 frases)",
      "objetivo": "string (1-2 frases)",
      "eventoInicial": "string — até 200 caracteres",
      "resultadoEsperado": "string",
      "publicoAlvoId": "id de público-alvo do contexto",
      "moduloIds": ["id de módulo do contexto"],
      "funcionalidadeIds": ["id de funcionalidade do contexto"],
      "etapas": ["string — até 120 caracteres cada, em ordem cronológica"],
      "regraIds": ["id de regra do contexto que genuinamente rege esta jornada — pode ser vazio"],
      "produtoParticipanteIds": ["id de produto do mesmo projeto — normalmente vazio"],
      "fontes": [{ "id": "id de fonte do contexto", "contexto": "por que é relevante" }],
      "documentos": [{ "id": "id de documento do contexto", "contexto": "por que é relevante" }]
    }
  ],
  "jornadasEstendidas": [
    {
      "jornadaId": "id de jornada já existente do contexto",
      "addModuloIds": ["id de módulo do contexto, se precisar adicionar"],
      "addFuncionalidadeIds": ["id de funcionalidade do contexto a adicionar"],
      "addEtapas": ["string — até 120 caracteres cada"],
      "addRegraIds": ["id de regra do contexto — pode ser vazio"],
      "addProdutoParticipanteIds": ["id de produto do mesmo projeto — normalmente vazio"],
      "addFontes": [{ "id": "id de fonte do contexto", "contexto": "por que é relevante" }],
      "addDocumentos": [{ "id": "id de documento do contexto", "contexto": "por que é relevante" }]
    }
  ],
  "foraDeEscopo": [
    { "funcionalidadeId": "id de funcionalidade do contexto", "motivo": "por que essa funcionalidade não vira jornada" }
  ]
}`;
  }

  private buildUserPrompt(produto: ProdutoResumo, foco: string | undefined, context: JourneyMapperContext) {
    return `PRODUTO: ${produto.nome} (${produto.codigo})
FOCO INFORMADO PELO USUÁRIO (opcional): ${foco || 'Não informado — mapeie o produto como um todo'}

MÓDULOS:
${JSON.stringify(context.modulos)}

FUNCIONALIDADES (jaEmJornada indica se já pertence a alguma jornada existente; regras lista os nomes das regras de negócio já vinculadas, para dar contexto de comportamento condicional):
${JSON.stringify(context.funcionalidades)}

PÚBLICO-ALVO:
${JSON.stringify(context.publicoAlvo)}

REGRAS DE NEGÓCIO DO PRODUTO (id, nome, módulos e funcionalidades que regem — use para decidir "regraIds"/"addRegraIds"):
${JSON.stringify(context.regras)}

OUTROS PRODUTOS DO MESMO PROJETO (candidatos a "produtoParticipanteIds" — normalmente nenhum se aplica):
${JSON.stringify(context.produtosDoProjeto)}

FONTES DE CONHECIMENTO DO PROJETO (candidatas a evidência — use para decidir "fontes"/"addFontes"):
${JSON.stringify(context.fontes)}

DOCUMENTOS DE CONHECIMENTO DO PROJETO (candidatos a documentação relacionada — use para decidir "documentos"/"addDocumentos"):
${JSON.stringify(context.documentos)}

JORNADAS JÁ EXISTENTES (não duplique cobertura; prefira estender quando fizer sentido):
${JSON.stringify(context.jornadas)}`;
  }

  private timeoutMs() {
    const configured = Number(process.env.AGENT_TIMEOUT_MS);
    return Number.isFinite(configured) && configured >= 60_000 ? configured : DEFAULT_TIMEOUT_MS;
  }

  private schedulePersistence(job: JourneyMapperJob) {
    if (this.persistTimers.has(job.id)) return;
    const timer = setTimeout(() => {
      this.persistTimers.delete(job.id);
      void this.enqueuePersistence(job).catch(() => undefined);
    }, 750);
    this.persistTimers.set(job.id, timer);
  }

  private async flushPersistence(job: JourneyMapperJob) {
    const timer = this.persistTimers.get(job.id);
    if (timer) clearTimeout(timer);
    this.persistTimers.delete(job.id);
    await this.enqueuePersistence(job);
  }

  private enqueuePersistence(job: JourneyMapperJob) {
    const snapshot = {
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      message: job.message,
      partialContent: job.partialContent,
      result: job.result ? (JSON.parse(JSON.stringify(job.result)) as Prisma.InputJsonValue) : Prisma.DbNull,
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
  }): JourneyMapperJob {
    const result =
      record.result && typeof record.result === 'object' && !Array.isArray(record.result)
        ? (record.result as unknown as JourneyMapperResult)
        : undefined;
    return {
      id: record.id,
      actorUserId: record.actorUserId,
      actorEmail: '',
      projetoId: record.projetoId,
      produtoId: result?.produto.id ?? '',
      foco: result?.foco,
      status: record.status as ExecutionStatus,
      phase: record.phase as JourneyMapperPhase,
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

  private publicJob(job: JourneyMapperJob) {
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
