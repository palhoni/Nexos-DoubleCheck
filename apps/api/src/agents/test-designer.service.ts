import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CopilotClient, type CopilotSession, type PermissionHandler } from '@github/copilot-sdk';
import { Prisma, type AgentExecution } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { RunTestDesignerDto } from './dto/run-test-designer.dto';

const AGENT_NAME = 'agent2-desenhista-testes';
const SOURCE_AGENT = 'agent1-analisador-us';
const AGENT_FILE = `${AGENT_NAME}.md`;
const DENY_ALL_TOOLS: PermissionHandler = () => ({ kind: 'reject', feedback: 'Esta execução produz somente um plano salvo no Nexo e não pode usar ferramentas ou alterar arquivos.' });

export type TestPlan = {
  resumo: { usId: string; titulo: string; escopo: string; status: string; estrategia: string };
  cobertura: Array<{ categoria: string; requisitos: number; cobertos: number; percentual: number; avaliacao: string }>;
  rastreabilidade: Array<{ requisitoId: string; requisito: string; cenarioIds: string[]; cobertura: string }>;
  gaps: Array<{ id: string; categoria: string; severidade: string; descricao: string; requisitoRelacionado: string; assuncao: boolean }>;
  casosRecomendados: Array<{ id: string; gapId: string; nome: string; categoria: string; escopo: string; precondicoes: string[]; passos: string[]; resultadoEsperado: string; automacao: string; prioridade: string }>;
  bloqueadores: Array<{ id: string; descricao: string; afeta: string[] }>;
  checklist: { bloqueadores: string[]; ordemImplementacao: string[] };
  frontendForaEscopo: Array<{ cenarioId: string; titulo: string; motivo: string }>;
  totais: { requisitos: number; cobertos: number; gaps: number; casosRecomendados: number; bloqueadores: number; frontend: number };
};

type PlanResult = {
  agent: typeof AGENT_NAME;
  provider: 'GitHub Copilot';
  projeto: { id: string; nome: string; codigo: string };
  sourceExecutionId: string;
  titulo: string;
  resultado: string;
  plano: TestPlan;
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
};

type PlanJob = {
  id: string; actorUserId: string; actorEmail: string; sourceExecutionId: string; projetoId: string; titulo: string;
  status: 'queued' | 'processing' | 'completed' | 'failed'; phase: string; progress: number; message: string;
  partialContent: string; createdAt: string; updatedAt: string; startedAt?: string; completedAt?: string; result?: PlanResult; error?: string;
};

@Injectable()
export class TestDesignerService {
  private readonly jobs = new Map<string, PlanJob>();
  private readonly persistChains = new Map<string, Promise<void>>();

  constructor(private readonly prisma: PrismaService) {}

  async start(dto: RunTestDesignerDto, actor: { userId: string; email: string }) {
    const source = await this.getSource(dto.analysisExecutionId, actor.userId);
    const now = new Date().toISOString();
    const job: PlanJob = {
      id: randomUUID(), actorUserId: actor.userId, actorEmail: actor.email, sourceExecutionId: source.id,
      projetoId: source.projetoId, titulo: source.titulo || 'Requisito funcional', status: 'queued', phase: 'queued',
      progress: 3, message: 'Preparando o desenho dos testes...', partialContent: '', createdAt: now, updatedAt: now,
    };
    await this.prisma.agentExecution.create({ data: {
      id: job.id, agent: AGENT_NAME, provider: 'GitHub Copilot', projetoId: job.projetoId, actorUserId: job.actorUserId,
      titulo: job.titulo, requisito: job.sourceExecutionId, status: job.status, phase: job.phase, progress: job.progress, message: job.message,
    } });
    this.jobs.set(job.id, job);
    void this.execute(job, source).catch(() => undefined);
    return this.publicJob(job);
  }

  async get(id: string, actorUserId: string) {
    const current = this.jobs.get(id);
    if (current?.actorUserId === actorUserId) return this.publicJob(current);
    const record = await this.prisma.agentExecution.findFirst({ where: { id, actorUserId, agent: AGENT_NAME } });
    if (!record) throw new NotFoundException('Plano de testes não encontrado.');
    return this.publicJob(this.fromRecord(record));
  }

  async list(actorUserId: string, sourceExecutionId?: string) {
    const rows = await this.prisma.agentExecution.findMany({
      where: { actorUserId, agent: AGENT_NAME, ...(sourceExecutionId ? { requisito: sourceExecutionId } : {}) },
      orderBy: { createdAt: 'desc' }, take: 30,
      select: { id: true, titulo: true, requisito: true, status: true, phase: true, progress: true, message: true, error: true, result: true, createdAt: true, updatedAt: true, completedAt: true, projeto: { select: { id: true, nome: true, codigo: true } } },
    });
    return rows.map(({ result, requisito, ...row }) => ({ ...row, sourceExecutionId: requisito, hasResult: result !== null, parcial: Boolean(result && typeof result === 'object' && !Array.isArray(result) && 'parcial' in result && result.parcial) }));
  }

  private async getSource(id: string, actorUserId: string) {
    const source = await this.prisma.agentExecution.findFirst({ where: { id, actorUserId, agent: SOURCE_AGENT }, include: { projeto: { select: { id: true, nome: true, codigo: true, descricao: true, objetivo: true, areaNegocio: true } } } });
    if (!source?.result) throw new NotFoundException('A análise concluída do Agent 1 não foi encontrada.');
    return source;
  }

  private async execute(job: PlanJob, source: Awaited<ReturnType<TestDesignerService['getSource']>>) {
    const update = async (phase: string, progress: number, message: string, delta = '') => {
      job.status = 'processing'; job.phase = phase; job.progress = progress; job.message = message; job.partialContent += delta;
      job.startedAt ??= new Date().toISOString(); job.updatedAt = new Date().toISOString(); await this.persist(job);
    };
    try {
      await update('coverage', 10, 'Recalculando a cobertura em seis categorias...');
      const result = await this.runCopilot(job, source, update);
      job.result = result; job.status = 'completed'; job.phase = 'completed'; job.progress = 100; job.message = 'Plano de testes concluído.';
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Falha desconhecida no GitHub Copilot';
      job.status = 'failed'; job.phase = 'failed'; job.error = reason; job.message = job.partialContent ? 'Execução interrompida; o conteúdo recebido foi preservado.' : 'Não foi possível desenhar os testes.';
      if (job.partialContent) job.result = this.makeResult(job, source, job.partialContent, true, reason);
    } finally {
      job.updatedAt = new Date().toISOString(); job.completedAt = job.updatedAt; await this.persist(job);
    }
  }

  private async runCopilot(job: PlanJob, source: Awaited<ReturnType<TestDesignerService['getSource']>>, update: (phase: string, progress: number, message: string, delta?: string) => Promise<void>) {
    const { workingDirectory, prompt } = this.loadPrompt();
    const client = new CopilotClient({ workingDirectory, useLoggedInUser: true, logLevel: 'error' });
    let session: CopilotSession | undefined; let unsubscribe: (() => void) | undefined; let content = '';
    try {
      await client.start();
      session = await client.createSession({ customAgents: [{ name: AGENT_NAME, displayName: 'Desenhista de Testes', description: 'Transforma uma análise de US em cobertura e plano de testes.', tools: [], prompt }], agent: AGENT_NAME, workingDirectory, onPermissionRequest: DENY_ALL_TOOLS, streaming: true });
      unsubscribe = session.on('assistant.message_delta', (event) => {
        const delta = event.data.deltaContent; content += delta;
        const phase = content.includes('"casosRecomendados"') ? 'test-cases' : content.includes('"gaps"') ? 'gaps' : content.includes('"rastreabilidade"') ? 'traceability' : 'coverage';
        void update(phase, Math.min(91, 18 + Math.floor(content.length / 350)), 'Recebendo o plano estruturado do Agent...', delta);
      });
      const startedAt = Date.now();
      const response = await session.sendAndWait({ prompt: this.executionPrompt(source, job.actorEmail) }, this.timeoutMs());
      const raw = response?.data.content?.trim();
      if (!raw) throw new Error('O GitHub Copilot concluiu sem retornar conteúdo.');
      await update('structuring', 96, 'Organizando matriz, gaps e casos recomendados...');
      return { ...this.makeResult(job, source, raw), duracaoMs: Date.now() - startedAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida';
      throw new InternalServerErrorException(`Não foi possível executar o Desenhista de Testes pelo GitHub Copilot: ${message}`);
    } finally {
      unsubscribe?.(); if (session) await session.disconnect().catch(() => undefined); await client.stop().catch(() => undefined);
    }
  }

  private makeResult(job: PlanJob, source: Awaited<ReturnType<TestDesignerService['getSource']>>, raw: string, parcial = false, reason?: string): PlanResult {
    return { agent: AGENT_NAME, provider: 'GitHub Copilot', projeto: { id: source.projeto.id, nome: source.projeto.nome, codigo: source.projeto.codigo }, sourceExecutionId: source.id, titulo: job.titulo, resultado: raw, plano: this.parsePlan(raw, job.titulo), duracaoMs: Date.now() - new Date(job.createdAt).getTime(), executadoEm: new Date().toISOString(), ...(parcial ? { parcial: true, motivoInterrupcao: reason } : {}) };
  }

  private parsePlan(raw: string, title: string): TestPlan {
    const clean = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const start = clean.indexOf('{'); const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) try { return this.normalizePlan(JSON.parse(clean.slice(start, end + 1)) as Partial<TestPlan>, title); } catch { /* fallback preserva o bruto */ }
    return this.normalizePlan({}, title);
  }

  private normalizePlan(value: Partial<TestPlan>, title: string): TestPlan {
    const cobertura = Array.isArray(value.cobertura) ? value.cobertura : [];
    return {
      resumo: { usId: value.resumo?.usId || title, titulo: value.resumo?.titulo || title, escopo: value.resumo?.escopo || 'Não classificado', status: value.resumo?.status || 'Requer revisão', estrategia: value.resumo?.estrategia || 'Consulte o relatório técnico.' },
      cobertura, rastreabilidade: Array.isArray(value.rastreabilidade) ? value.rastreabilidade : [], gaps: Array.isArray(value.gaps) ? value.gaps : [],
      casosRecomendados: Array.isArray(value.casosRecomendados) ? value.casosRecomendados : [], bloqueadores: Array.isArray(value.bloqueadores) ? value.bloqueadores : [],
      checklist: { bloqueadores: Array.isArray(value.checklist?.bloqueadores) ? value.checklist.bloqueadores : [], ordemImplementacao: Array.isArray(value.checklist?.ordemImplementacao) ? value.checklist.ordemImplementacao : [] },
      frontendForaEscopo: Array.isArray(value.frontendForaEscopo) ? value.frontendForaEscopo : [],
      totais: value.totais ?? { requisitos: 0, cobertos: 0, gaps: 0, casosRecomendados: 0, bloqueadores: 0, frontend: 0 },
    };
  }

  private executionPrompt(source: Awaited<ReturnType<TestDesignerService['getSource']>>, actorEmail: string) {
    return `Execute o desenho de testes em PT-BR a partir da análise do Agent 1 fornecida abaixo. A pré-condição P1 está satisfeita pelo conteúdo do banco.\n\nRESTRIÇÕES:\n- Não use ferramentas, não leia nem grave arquivos e não gere código ou scaffold nesta versão.\n- Recalcule a cobertura de forma independente nas seis categorias obrigatórias.\n- Escreva todos os textos em português do Brasil.\n- Retorne SOMENTE JSON válido e completo.\n- Todo gap deve ter ao menos um caso recomendado e rastreável.\n- Cenários de frontend devem ser planejados, mas marcados em frontendForaEscopo para futura automação separada.\n\nCONTRATO JSON:\n${JSON.stringify({ resumo: { usId: 'string', titulo: 'string', escopo: 'Backend | Frontend | Misto', status: 'Pronto | Requer refinamento', estrategia: 'string' }, cobertura: [{ categoria: 'Happy Path | Casos de borda | Tratamento de erros | Segurança | Performance | Variações de UX', requisitos: 0, cobertos: 0, percentual: 0, avaliacao: 'string' }], rastreabilidade: [{ requisitoId: 'AC01', requisito: 'string', cenarioIds: ['TC-B001'], cobertura: 'Coberto | Gap' }], gaps: [{ id: 'GAP-01', categoria: 'string', severidade: 'Crítica | Alta | Média | Baixa', descricao: 'string', requisitoRelacionado: 'string', assuncao: false }], casosRecomendados: [{ id: 'CTR-01', gapId: 'GAP-01', nome: 'string', categoria: 'string', escopo: 'Backend | Frontend', precondicoes: ['string'], passos: ['string'], resultadoEsperado: 'string', automacao: 'Automatizável | Manual | Ambos', prioridade: 'Alta | Média | Baixa' }], bloqueadores: [{ id: 'BLQ-01', descricao: 'string', afeta: ['CTR-01'] }], checklist: { bloqueadores: ['string'], ordemImplementacao: ['string'] }, frontendForaEscopo: [{ cenarioId: 'string', titulo: 'string', motivo: 'string' }], totais: { requisitos: 0, cobertos: 0, gaps: 0, casosRecomendados: 0, bloqueadores: 0, frontend: 0 } }, null, 2)}\n\nPROJETO: ${source.projeto.nome} (${source.projeto.codigo})\nSOLICITANTE: ${actorEmail}\nANÁLISE DO AGENT 1:\n${JSON.stringify(source.result)}`;
  }

  private loadPrompt() {
    const candidates = [resolve(process.cwd(), 'agents', '.github', 'agents'), resolve(process.cwd(), '..', '..', 'agents', '.github', 'agents')];
    const workingDirectory = candidates.find((path) => existsSync(resolve(path, AGENT_FILE)));
    if (!workingDirectory) throw new InternalServerErrorException(`Definição do agent ${AGENT_FILE} não encontrada.`);
    return { workingDirectory, prompt: readFileSync(resolve(workingDirectory, AGENT_FILE), 'utf8') };
  }

  private timeoutMs() { const configured = Number(process.env.COPILOT_AGENT_TIMEOUT_MS); return Number.isFinite(configured) && configured >= 60_000 ? configured : 15 * 60 * 1000; }

  private async persist(job: PlanJob) {
    const snapshot = { status: job.status, phase: job.phase, progress: job.progress, message: job.message, partialContent: job.partialContent, result: job.result ? JSON.parse(JSON.stringify(job.result)) as Prisma.InputJsonValue : Prisma.DbNull, error: job.error ?? null, startedAt: job.startedAt ? new Date(job.startedAt) : null, completedAt: job.completedAt ? new Date(job.completedAt) : null };
    const previous = this.persistChains.get(job.id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => { await this.prisma.agentExecution.update({ where: { id: job.id }, data: snapshot }); });
    this.persistChains.set(job.id, next);
    await next;
  }

  private fromRecord(record: AgentExecution): PlanJob {
    return { id: record.id, actorUserId: record.actorUserId, actorEmail: '', sourceExecutionId: record.requisito, projetoId: record.projetoId, titulo: record.titulo || 'Requisito funcional', status: record.status as PlanJob['status'], phase: record.phase, progress: record.progress, message: record.message, partialContent: record.partialContent, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), startedAt: record.startedAt?.toISOString(), completedAt: record.completedAt?.toISOString(), result: record.result && typeof record.result === 'object' && !Array.isArray(record.result) ? record.result as unknown as PlanResult : undefined, error: record.error ?? undefined };
  }

  private publicJob(job: PlanJob) { return { id: job.id, status: job.status, phase: job.phase, progress: job.progress, message: job.message, createdAt: job.createdAt, updatedAt: job.updatedAt, live: { characters: job.partialContent.length, gaps: (job.partialContent.match(/"id"\s*:\s*"GAP-/g) ?? []).length, cases: (job.partialContent.match(/"id"\s*:\s*"CTR-/g) ?? []).length, blockers: (job.partialContent.match(/"id"\s*:\s*"BLQ-/g) ?? []).length }, result: job.result, error: job.error } }
}
