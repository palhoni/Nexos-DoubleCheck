import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CopilotClient, type CopilotSession, type PermissionHandler } from '@github/copilot-sdk';
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
  actorEmail: string;
  status: ExecutionStatus;
  phase: ExecutionPhase;
  progress: number;
  message: string;
  partialContent: string;
  createdAt: string;
  updatedAt: string;
  result?: AnalysisResult;
  error?: string;
};

@Injectable()
export class AgentsService {
  private readonly jobs = new Map<string, AnalysisJob>();

  constructor(private readonly prisma: PrismaService) {}

  startUsAnalyser(dto: RunUsAnalyserDto, actorEmail: string) {
    this.pruneJobs();
    const now = new Date().toISOString();
    const job: AnalysisJob = {
      id: randomUUID(),
      actorEmail,
      status: 'queued',
      phase: 'queued',
      progress: 3,
      message: 'Preparando a análise...',
      partialContent: '',
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    void this.executeJob(job, dto);
    return this.publicJob(job);
  }

  getExecution(id: string, actorEmail: string) {
    const job = this.jobs.get(id);
    if (!job || job.actorEmail !== actorEmail) throw new NotFoundException('Execução do agent não encontrada');
    return this.publicJob(job);
  }

  async runUsAnalyser(dto: RunUsAnalyserDto, actorEmail: string) {
    return this.executeAnalysis(dto, actorEmail, () => undefined);
  }

  private async executeJob(job: AnalysisJob, dto: RunUsAnalyserDto) {
    try {
      const result = await this.executeAnalysis(dto, job.actorEmail, (phase, progress, message, delta) => {
        job.status = 'processing';
        job.phase = phase;
        job.progress = progress;
        job.message = message;
        if (delta) job.partialContent += delta;
        job.updatedAt = new Date().toISOString();
      });
      job.result = result;
      job.status = 'completed';
      job.phase = 'completed';
      job.progress = 100;
      job.message = 'Análise concluída.';
      job.updatedAt = new Date().toISOString();
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

    return {
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
    };
  }

  private parsePartialStructuredAnalysis(raw: string, dto: RunUsAnalyserDto): StructuredAnalysis {
    const base = this.parseStructuredAnalysis(raw, dto);
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

  private normalizeStructuredAnalysis(parsed: StructuredAnalysis, dto: RunUsAnalyserDto): StructuredAnalysis {
    return {
      requisito: {
        identificador: parsed.requisito.identificador || dto.titulo?.trim() || 'Não informado',
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
  "regrasNegocio": [{ "id": "RN01", "regra": "string", "origem": "trecho do requisito", "status": "Confirmada | Inferida | Requer confirmação", "risco": "string" }],
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
