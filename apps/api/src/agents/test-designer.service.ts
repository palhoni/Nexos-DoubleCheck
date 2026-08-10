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
  revisaoIndependente: {
    osOriginalRevisada: boolean;
    analiseAgent1Revisada: boolean;
    conclusao: string;
    decisaoNovosCasos: string;
    justificativa: string;
    divergencias: Array<{ id: string; tipo: string; descricao: string; impacto: string }>;
  };
  cobertura: Array<{ categoria: string; requisitos: number; cobertos: number; percentual: number; avaliacao: string }>;
  rastreabilidade: Array<{ requisitoId: string; requisito: string; cenarioIds: string[]; cobertura: string }>;
  gaps: Array<{ id: string; categoria: string; severidade: string; descricao: string; requisitoRelacionado: string; assuncao: boolean }>;
  casosRecomendados: Array<{ id: string; gapId: string; nome: string; categoria: string; escopo: string; precondicoes: string[]; passos: string[]; resultadoEsperado: string; automacao: string; prioridade: string }>;
  bloqueadores: Array<{ id: string; descricao: string; afeta: string[] }>;
  checklist: { bloqueadores: string[]; ordemImplementacao: string[] };
  frontendForaEscopo: Array<{ cenarioId: string; titulo: string; motivo: string }>;
  totais: { requisitos: number; cobertos: number; gaps: number; casosRecomendados: number; bloqueadores: number; frontend: number };
};

export type TestPlanMonitoring = {
  model?: string;
  finishReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  providerDurationMs?: number;
  requestId?: string;
  serviceRequestId?: string;
  streamedCharacters: number;
  finalCharacters: number;
  streamedBytes?: number;
  lastChunkAt?: string;
  finalReceivedAt?: string;
  idleAborted: boolean;
  contextTruncations: number;
  modelFailure?: string;
  jsonValid: boolean;
  contractValid: boolean;
  validationErrors: string[];
  detected: { gaps: number; cases: number; blockers: number };
  structured: { gaps: number; cases: number; blockers: number; frontend: number };
};

type PlanResult = {
  agent: typeof AGENT_NAME;
  provider: 'GitHub Copilot';
  projeto: { id: string; nome: string; codigo: string };
  sourceExecutionId: string;
  titulo: string;
  resultado: string;
  plano: TestPlan;
  monitoramento: TestPlanMonitoring;
  duracaoMs: number;
  executadoEm: string;
  parcial?: boolean;
  motivoInterrupcao?: string;
};

type PlanJob = {
  id: string; actorUserId: string; actorEmail: string; sourceExecutionId: string; projetoId: string; titulo: string;
  status: 'queued' | 'processing' | 'completed' | 'failed'; phase: string; progress: number; message: string;
  partialContent: string; createdAt: string; updatedAt: string; startedAt?: string; completedAt?: string; result?: PlanResult; error?: string;
  monitoring: TestPlanMonitoring;
};

class InvalidPlanOutputError extends Error {
  constructor(public readonly phase: 'truncated' | 'invalid-output', public readonly preservedResult: PlanResult, message: string) {
    super(message);
  }
}

const emptyMonitoring = (): TestPlanMonitoring => ({
  streamedCharacters: 0, finalCharacters: 0, idleAborted: false, contextTruncations: 0,
  jsonValid: false, contractValid: false, validationErrors: [],
  detected: { gaps: 0, cases: 0, blockers: 0 }, structured: { gaps: 0, cases: 0, blockers: 0, frontend: 0 },
});

function countIds(raw: string, prefix: string) {
  return (raw.match(new RegExp(`"id"\\s*:\\s*"${prefix}-`, 'g')) ?? []).length;
}

function extractCompletedObjects<T>(raw: string, field: string): T[] {
  const fieldMatch = new RegExp(`"${field}"\\s*:\\s*\\[`).exec(raw);
  if (!fieldMatch) return [];
  const items: T[] = [];
  let objectStart = -1; let depth = 0; let inString = false; let escaped = false;
  for (let index = fieldMatch.index + fieldMatch[0].length; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === ']' && depth === 0) break;
    if (char === '{') { if (depth === 0) objectStart = index; depth += 1; continue; }
    if (char !== '}' || depth === 0) continue;
    depth -= 1;
    if (depth === 0 && objectStart >= 0) {
      try { items.push(JSON.parse(raw.slice(objectStart, index + 1)) as T); } catch { /* ignora apenas o objeto incompleto */ }
      objectStart = -1;
    }
  }
  return items;
}

export function parseAndValidateTestPlan(raw: string, title: string, requireIndependentReview = false): { plan: TestPlan; jsonValid: boolean; contractValid: boolean; validationErrors: string[] } {
  const clean = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  let value: Partial<TestPlan> = {};
  const validationErrors: string[] = [];
  let jsonValid = false;
  try {
    value = JSON.parse(clean) as Partial<TestPlan>;
    jsonValid = true;
  } catch (error) {
    validationErrors.push(`JSON inválido: ${error instanceof Error ? error.message : 'erro de parsing'}`);
    value = {
      cobertura: extractCompletedObjects<TestPlan['cobertura'][number]>(clean, 'cobertura'),
      rastreabilidade: extractCompletedObjects<TestPlan['rastreabilidade'][number]>(clean, 'rastreabilidade'),
      gaps: extractCompletedObjects<TestPlan['gaps'][number]>(clean, 'gaps'),
      casosRecomendados: extractCompletedObjects<TestPlan['casosRecomendados'][number]>(clean, 'casosRecomendados'),
      bloqueadores: extractCompletedObjects<TestPlan['bloqueadores'][number]>(clean, 'bloqueadores'),
      frontendForaEscopo: extractCompletedObjects<TestPlan['frontendForaEscopo'][number]>(clean, 'frontendForaEscopo'),
    };
  }

  const cobertura = Array.isArray(value.cobertura) ? value.cobertura : [];
  const plan: TestPlan = {
    resumo: { usId: value.resumo?.usId || title, titulo: value.resumo?.titulo || title, escopo: value.resumo?.escopo || 'Não classificado', status: value.resumo?.status || 'Requer revisão', estrategia: value.resumo?.estrategia || 'Consulte o relatório técnico.' },
    revisaoIndependente: {
      osOriginalRevisada: value.revisaoIndependente?.osOriginalRevisada === true,
      analiseAgent1Revisada: value.revisaoIndependente?.analiseAgent1Revisada === true,
      conclusao: value.revisaoIndependente?.conclusao || 'Não disponível nesta versão.',
      decisaoNovosCasos: value.revisaoIndependente?.decisaoNovosCasos || 'Não registrado',
      justificativa: value.revisaoIndependente?.justificativa || 'Este plano foi gerado antes da revisão independente da OS original.',
      divergencias: Array.isArray(value.revisaoIndependente?.divergencias) ? value.revisaoIndependente.divergencias : [],
    },
    cobertura, rastreabilidade: Array.isArray(value.rastreabilidade) ? value.rastreabilidade : [], gaps: Array.isArray(value.gaps) ? value.gaps : [],
    casosRecomendados: Array.isArray(value.casosRecomendados) ? value.casosRecomendados : [], bloqueadores: Array.isArray(value.bloqueadores) ? value.bloqueadores : [],
    checklist: { bloqueadores: Array.isArray(value.checklist?.bloqueadores) ? value.checklist.bloqueadores : [], ordemImplementacao: Array.isArray(value.checklist?.ordemImplementacao) ? value.checklist.ordemImplementacao : [] },
    frontendForaEscopo: Array.isArray(value.frontendForaEscopo) ? value.frontendForaEscopo : [],
    totais: value.totais ?? { requisitos: 0, cobertos: 0, gaps: 0, casosRecomendados: 0, bloqueadores: 0, frontend: 0 },
  };

  if (jsonValid) {
    const requiredArrays: Array<[keyof TestPlan, unknown]> = [
      ['cobertura', value.cobertura], ['rastreabilidade', value.rastreabilidade], ['gaps', value.gaps],
      ['casosRecomendados', value.casosRecomendados], ['bloqueadores', value.bloqueadores], ['frontendForaEscopo', value.frontendForaEscopo],
    ];
    for (const [field, fieldValue] of requiredArrays) if (!Array.isArray(fieldValue)) validationErrors.push(`Campo obrigatório ausente ou inválido: ${field}.`);
    if (!value.resumo || !value.checklist || !value.totais) validationErrors.push('Blocos obrigatórios resumo, checklist e totais devem estar presentes.');
    if (requireIndependentReview && (!value.revisaoIndependente || value.revisaoIndependente.osOriginalRevisada !== true || value.revisaoIndependente.analiseAgent1Revisada !== true)) validationErrors.push('A revisão independente da OS original e da análise do Agent 1 não foi comprovada.');
    if (plan.cobertura.length !== 6) validationErrors.push(`Cobertura incompleta: recebidas ${plan.cobertura.length} de 6 categorias.`);
    if (plan.gaps.length > 0 && plan.casosRecomendados.length === 0) validationErrors.push('Foram recebidos gaps sem casos recomendados.');
    const totals: Array<[string, number, number]> = [
      ['gaps', plan.totais.gaps, plan.gaps.length], ['casos recomendados', plan.totais.casosRecomendados, plan.casosRecomendados.length],
      ['bloqueadores', plan.totais.bloqueadores, plan.bloqueadores.length], ['frontend', plan.totais.frontend, plan.frontendForaEscopo.length],
    ];
    for (const [label, declared, actual] of totals) if (declared !== actual) validationErrors.push(`Total de ${label} divergente: declarado ${declared}, recebido ${actual}.`);
  }
  return { plan, jsonValid, contractValid: jsonValid && validationErrors.length === 0, validationErrors };
}

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
      progress: 3, message: 'Preparando o desenho dos testes...', partialContent: '', createdAt: now, updatedAt: now, monitoring: emptyMonitoring(),
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
    return rows.map(({ result, requisito, ...row }) => {
      const normalized = this.hydrateResult(result, row.titulo || 'Requisito funcional');
      const invalid = Boolean(normalized && !normalized.monitoramento.contractValid);
      return { ...row, status: invalid ? 'failed' : row.status, phase: invalid ? (normalized?.monitoramento.finishReason === 'length' ? 'truncated' : 'invalid-output') : row.phase, sourceExecutionId: requisito, hasResult: normalized !== undefined, parcial: Boolean(normalized?.parcial) };
    });
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
      job.status = 'failed'; job.error = reason;
      if (error instanceof InvalidPlanOutputError) {
        job.phase = error.phase; job.result = error.preservedResult;
        job.message = error.phase === 'truncated' ? 'O provedor interrompeu a resposta por limite de saída.' : 'A resposta foi preservada, mas não contém um plano JSON válido e completo.';
      } else {
        job.phase = 'failed'; job.message = job.partialContent ? 'Execução interrompida; o conteúdo recebido foi preservado.' : 'Não foi possível desenhar os testes.';
        if (job.partialContent) job.result = this.makeResult(job, source, job.partialContent, true, reason);
      }
    } finally {
      job.updatedAt = new Date().toISOString(); job.completedAt = job.updatedAt; await this.persist(job);
    }
  }

  private async runCopilot(job: PlanJob, source: Awaited<ReturnType<TestDesignerService['getSource']>>, update: (phase: string, progress: number, message: string, delta?: string) => Promise<void>) {
    const { workingDirectory, prompt } = this.loadPrompt();
    const client = new CopilotClient({ workingDirectory, useLoggedInUser: true, logLevel: 'error' });
    let session: CopilotSession | undefined; const unsubscribers: Array<() => void> = []; let content = '';
    try {
      await client.start();
      session = await client.createSession({ customAgents: [{ name: AGENT_NAME, displayName: 'Desenhista de Testes', description: 'Transforma uma análise de US em cobertura e plano de testes.', tools: [], prompt }], agent: AGENT_NAME, workingDirectory, onPermissionRequest: DENY_ALL_TOOLS, streaming: true });
      unsubscribers.push(session.on('assistant.message_delta', (event) => {
        const delta = event.data.deltaContent; content += delta;
        job.monitoring.streamedCharacters = content.length; job.monitoring.lastChunkAt = new Date().toISOString();
        const phase = content.includes('"casosRecomendados"') ? 'test-cases' : content.includes('"gaps"') ? 'gaps' : content.includes('"rastreabilidade"') ? 'traceability' : 'coverage';
        void update(phase, Math.min(91, 18 + Math.floor(content.length / 350)), 'Recebendo o plano estruturado do Agent...', delta);
      }));
      unsubscribers.push(session.on('assistant.streaming_delta', (event) => { job.monitoring.streamedBytes = event.data.totalResponseSizeBytes; }));
      unsubscribers.push(session.on('assistant.usage', (event) => {
        const usage = event.data;
        job.monitoring.model = usage.model; job.monitoring.finishReason = usage.finishReason;
        job.monitoring.inputTokens = usage.inputTokens; job.monitoring.outputTokens = usage.outputTokens;
        job.monitoring.providerDurationMs = usage.duration; job.monitoring.requestId = usage.providerCallId; job.monitoring.serviceRequestId = usage.serviceRequestId;
      }));
      unsubscribers.push(session.on('session.truncation', () => { job.monitoring.contextTruncations += 1; }));
      unsubscribers.push(session.on('session.idle', (event) => { job.monitoring.idleAborted = Boolean(event.data.aborted); }));
      unsubscribers.push(session.on('model.call_failure', (event) => {
        job.monitoring.modelFailure = event.data.errorCode || event.data.errorMessage || event.data.failureKind || 'Falha não especificada do modelo';
      }));
      const startedAt = Date.now();
      const response = await session.sendAndWait({ prompt: this.executionPrompt(source, job.actorEmail) }, this.timeoutMs());
      if (!response) throw new Error('O GitHub Copilot concluiu sem retornar uma mensagem final.');
      const raw = response.data.content?.trim();
      if (!raw) throw new Error('O GitHub Copilot concluiu sem retornar conteúdo.');
      job.monitoring.finalCharacters = raw.length; job.monitoring.finalReceivedAt = new Date().toISOString();
      job.monitoring.model ??= response.data.model; job.monitoring.outputTokens ??= response.data.outputTokens;
      job.monitoring.requestId ??= response.data.requestId; job.monitoring.serviceRequestId ??= response.data.serviceRequestId;
      await update('structuring', 96, 'Organizando matriz, gaps e casos recomendados...');
      const result = { ...this.makeResult(job, source, raw), duracaoMs: Date.now() - startedAt };
      if (content && content.trim() !== raw) {
        result.monitoramento.validationErrors.push('O conteúdo final diverge dos fragmentos recebidos por streaming.');
        result.monitoramento.contractValid = false;
      }
      if (result.monitoramento.finishReason === 'length') {
        result.monitoramento.validationErrors.unshift('O provedor encerrou a geração por limite de saída (finishReason=length).');
        result.monitoramento.contractValid = false; result.parcial = true; result.motivoInterrupcao = result.monitoramento.validationErrors[0];
        throw new InvalidPlanOutputError('truncated', result, result.motivoInterrupcao);
      }
      if (result.monitoramento.finishReason === 'content_filter' || result.monitoramento.idleAborted || !result.monitoramento.contractValid) {
        const reason = result.monitoramento.validationErrors[0] || (result.monitoramento.idleAborted ? 'A sessão foi abortada antes da conclusão.' : 'A resposta foi interrompida por filtro de conteúdo.');
        if (result.monitoramento.validationErrors.length === 0) result.monitoramento.validationErrors.push(reason);
        result.monitoramento.contractValid = false; result.parcial = true; result.motivoInterrupcao = reason;
        throw new InvalidPlanOutputError('invalid-output', result, reason);
      }
      return result;
    } catch (error) {
      if (error instanceof InvalidPlanOutputError) throw error;
      const message = error instanceof Error ? error.message : 'Falha desconhecida';
      throw new InternalServerErrorException(`Não foi possível executar o Desenhista de Testes pelo GitHub Copilot: ${message}`);
    } finally {
      unsubscribers.forEach((unsubscribe) => unsubscribe()); if (session) await session.disconnect().catch(() => undefined); await client.stop().catch(() => undefined);
    }
  }

  private makeResult(job: PlanJob, source: Awaited<ReturnType<TestDesignerService['getSource']>>, raw: string, parcial = false, reason?: string): PlanResult {
    const parsed = parseAndValidateTestPlan(raw, job.titulo, true);
    const monitoring: TestPlanMonitoring = {
      ...job.monitoring, finalCharacters: raw.length, jsonValid: parsed.jsonValid, contractValid: parsed.contractValid,
      validationErrors: [...job.monitoring.validationErrors, ...parsed.validationErrors],
      detected: { gaps: countIds(raw, 'GAP'), cases: countIds(raw, 'CTR'), blockers: countIds(raw, 'BLQ') },
      structured: { gaps: parsed.plan.gaps.length, cases: parsed.plan.casosRecomendados.length, blockers: parsed.plan.bloqueadores.length, frontend: parsed.plan.frontendForaEscopo.length },
    };
    return { agent: AGENT_NAME, provider: 'GitHub Copilot', projeto: { id: source.projeto.id, nome: source.projeto.nome, codigo: source.projeto.codigo }, sourceExecutionId: source.id, titulo: job.titulo, resultado: raw, plano: parsed.plan, monitoramento: monitoring, duracaoMs: Date.now() - new Date(job.createdAt).getTime(), executadoEm: new Date().toISOString(), ...(parcial ? { parcial: true, motivoInterrupcao: reason } : {}) };
  }

  private executionPrompt(source: Awaited<ReturnType<TestDesignerService['getSource']>>, actorEmail: string) {
    const sourceResult = source.result as { analise?: unknown; parcial?: boolean; motivoInterrupcao?: string };
    const contract = {
      resumo: { usId: 'string', titulo: 'string', escopo: 'Backend | Frontend | Misto', status: 'Pronto | Requer refinamento', estrategia: 'string' },
      revisaoIndependente: {
        osOriginalRevisada: true, analiseAgent1Revisada: true,
        conclusao: 'Análise suficiente | Análise parcialmente suficiente | Análise insuficiente',
        decisaoNovosCasos: 'Gerar novos casos | Não gerar novos casos', justificativa: 'string',
        divergencias: [{ id: 'REV-01', tipo: 'Omissão | Divergência | Ambiguidade | Premissa sem evidência', descricao: 'string', impacto: 'string' }],
      },
      cobertura: [{ categoria: 'Happy Path | Casos de borda | Tratamento de erros | Segurança | Performance | Variações de UX', requisitos: 0, cobertos: 0, percentual: 0, avaliacao: 'string' }],
      rastreabilidade: [{ requisitoId: 'AC01', requisito: 'string', cenarioIds: ['TC-B001'], cobertura: 'Coberto | Gap' }],
      gaps: [{ id: 'GAP-01', categoria: 'string', severidade: 'Crítica | Alta | Média | Baixa', descricao: 'string', requisitoRelacionado: 'string', assuncao: false }],
      casosRecomendados: [{ id: 'CTR-01', gapId: 'GAP-01', nome: 'string', categoria: 'string', escopo: 'Backend | Frontend', precondicoes: ['string'], passos: ['string'], resultadoEsperado: 'string', automacao: 'Automatizável | Manual | Ambos', prioridade: 'Alta | Média | Baixa' }],
      bloqueadores: [{ id: 'BLQ-01', descricao: 'string', afeta: ['CTR-01'] }], checklist: { bloqueadores: ['string'], ordemImplementacao: ['string'] },
      frontendForaEscopo: [{ cenarioId: 'string', titulo: 'string', motivo: 'string' }],
      totais: { requisitos: 0, cobertos: 0, gaps: 0, casosRecomendados: 0, bloqueadores: 0, frontend: 0 },
    };
    return `Execute uma revisão independente de QA e, somente depois, desenhe o plano de testes em PT-BR. A pré-condição P1 está satisfeita pelo conteúdo do banco.

ORDEM OBRIGATÓRIA:
1. Leia a OS/US ORIGINAL integralmente e extraia seus requisitos sem usar a análise do Agent 1 como verdade.
2. Leia a ANÁLISE ESTRUTURADA DO AGENT 1 e compare-a com a OS/US original.
3. Identifique omissões, divergências, ambiguidades e premissas sem evidência em revisaoIndependente.
4. Reavalie os cenários TC-* existentes contra as duas fontes.
5. Decida explicitamente se há gaps reais. Gere casos CTR-* somente quando um gap real exigir cobertura adicional; se os casos existentes forem suficientes, use arrays vazios e justifique "Não gerar novos casos".

RESTRIÇÕES:
- Não use ferramentas, não leia nem grave arquivos e não gere código ou scaffold nesta versão.
- Recalcule a cobertura de forma independente nas seis categorias obrigatórias.
- Não invente requisitos genéricos apenas para preencher categorias; diferencie requisito explícito, inferência e ausência de evidência.
- Escreva todos os textos em português do Brasil.
- Retorne SOMENTE JSON válido e completo, na ordem do contrato.
- Todo gap listado deve ter ao menos um caso recomendado e rastreável.
- Cenários de frontend devem ser planejados, mas marcados em frontendForaEscopo para futura automação separada.
- Seja objetivo e priorize fechar o JSON antes de atingir o limite de saída.

CONTRATO JSON:
${JSON.stringify(contract, null, 2)}

PROJETO: ${source.projeto.nome} (${source.projeto.codigo})
SOLICITANTE: ${actorEmail}

OS/US ORIGINAL — FONTE PRIMÁRIA:
${source.requisito}

ANÁLISE ESTRUTURADA DO AGENT 1 — FONTE SECUNDÁRIA A SER REVISADA:
${JSON.stringify(sourceResult.analise ?? source.result)}

ESTADO DA ANÁLISE DO AGENT 1:
${JSON.stringify({ parcial: sourceResult.parcial === true, motivoInterrupcao: sourceResult.motivoInterrupcao ?? null })}`;
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

  private hydrateResult(value: AgentExecution['result'], title: string): PlanResult | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const result = value as unknown as PlanResult;
    if (result.monitoramento) return result;
    const parsed = parseAndValidateTestPlan(result.resultado || '', title);
    result.plano = parsed.plan;
    result.monitoramento = {
      ...emptyMonitoring(), finalCharacters: result.resultado?.length ?? 0, jsonValid: parsed.jsonValid, contractValid: parsed.contractValid,
      validationErrors: parsed.validationErrors, detected: { gaps: countIds(result.resultado || '', 'GAP'), cases: countIds(result.resultado || '', 'CTR'), blockers: countIds(result.resultado || '', 'BLQ') },
      structured: { gaps: parsed.plan.gaps.length, cases: parsed.plan.casosRecomendados.length, blockers: parsed.plan.bloqueadores.length, frontend: parsed.plan.frontendForaEscopo.length },
    };
    if (!parsed.contractValid) { result.parcial = true; result.motivoInterrupcao ||= parsed.validationErrors[0] || 'Saída histórica inválida.'; }
    return result;
  }

  private fromRecord(record: AgentExecution): PlanJob {
    const result = this.hydrateResult(record.result, record.titulo || 'Requisito funcional');
    const invalid = Boolean(result && !result.monitoramento.contractValid);
    return { id: record.id, actorUserId: record.actorUserId, actorEmail: '', sourceExecutionId: record.requisito, projetoId: record.projetoId, titulo: record.titulo || 'Requisito funcional', status: invalid ? 'failed' : record.status as PlanJob['status'], phase: invalid ? (result?.monitoramento.finishReason === 'length' ? 'truncated' : 'invalid-output') : record.phase, progress: record.progress, message: invalid ? 'A resposta preservada não contém um plano JSON válido e completo.' : record.message, partialContent: record.partialContent, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), startedAt: record.startedAt?.toISOString(), completedAt: record.completedAt?.toISOString(), result, monitoring: result?.monitoramento ?? emptyMonitoring(), error: invalid ? result?.motivoInterrupcao : record.error ?? undefined };
  }

  private publicJob(job: PlanJob) { return { id: job.id, status: job.status, phase: job.phase, progress: job.progress, message: job.message, createdAt: job.createdAt, updatedAt: job.updatedAt, live: { characters: job.partialContent.length, gaps: countIds(job.partialContent, 'GAP'), cases: countIds(job.partialContent, 'CTR'), blockers: countIds(job.partialContent, 'BLQ'), lastChunkAt: job.monitoring.lastChunkAt, model: job.monitoring.model, inputTokens: job.monitoring.inputTokens, outputTokens: job.monitoring.outputTokens, finishReason: job.monitoring.finishReason }, result: job.result, error: job.error } }
}
