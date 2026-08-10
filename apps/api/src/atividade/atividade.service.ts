import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAtividadeDto } from './dto/query-atividade.dto';

const SUPPORTED_TYPES = [
  'Projeto', 'Time', 'Pessoa', 'Produto', 'PublicoAlvo', 'Modulo',
  'Funcionalidade', 'Jornada', 'Regra', 'Integracao', 'Fonte', 'Documento',
] as const;

type EntityContext = {
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  projectId: string | null;
  projectName: string | null;
  productId: string | null;
  productName: string | null;
  route: string | null;
  crossProject: boolean;
};

function parseTypes(raw?: string): string[] {
  if (!raw) return [];
  const allowed = new Set<string>(SUPPORTED_TYPES);
  return raw.split(',').map((v) => v.trim()).filter((v) => allowed.has(v));
}

function dayStart(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

@Injectable()
export class AtividadeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryAtividadeDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;
    const selectedTypes = parseTypes(query.tipos);
    const now = new Date();
    const today = dayStart(now);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const and: Prisma.HistoryEntryWhereInput[] = [];

    if (query.projetoId) {
      const exists = await this.prisma.projeto.findUnique({ where: { id: query.projetoId }, select: { id: true } });
      if (!exists) throw new NotFoundException(`Projeto ${query.projetoId} não encontrado`);
      const projectScope = await this.buildProjectScope(query.projetoId);
      and.push({ OR: projectScope });
    }

    if (selectedTypes.length) and.push({ entityType: { in: selectedTypes } });
    if (query.actorUserId) and.push({ actorUserId: query.actorUserId });
    if (query.q?.trim()) {
      const contains = { contains: query.q.trim(), mode: 'insensitive' as const };
      and.push({ OR: [{ label: contains }, { actor: { is: { nome: contains } } }] });
    }

    if (query.de || query.ate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.de) createdAt.gte = new Date(query.de);
      if (query.ate) {
        const end = new Date(query.ate);
        if (/^\d{4}-\d{2}-\d{2}$/.test(query.ate)) end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      and.push({ createdAt });
    }

    const where: Prisma.HistoryEntryWhereInput = and.length ? { AND: and } : {};

    const [rows, total, todayCount, weekCount, facetRows, actorRows] = await Promise.all([
      this.prisma.historyEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, nome: true, email: true } } },
      }),
      this.prisma.historyEntry.count({ where }),
      this.prisma.historyEntry.count({ where: { AND: [where, { createdAt: { gte: today } }] } }),
      this.prisma.historyEntry.count({ where: { AND: [where, { createdAt: { gte: sevenDaysAgo } }] } }),
      this.prisma.historyEntry.groupBy({ by: ['entityType'], where, _count: { _all: true } }),
      this.prisma.historyEntry.findMany({
        where: { AND: [where, { actorUserId: { not: null } }] },
        distinct: ['actorUserId'],
        select: { actorUserId: true, actor: { select: { nome: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const contexts = await this.resolveContexts(rows.map((row) => ({ entityType: row.entityType, entityId: row.entityId })));

    const data = rows.map((row) => {
      const context = contexts.get(`${row.entityType}:${row.entityId}`) ?? this.emptyContext(row.entityType, row.entityId);
      return {
        id: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        label: row.label,
        createdAt: row.createdAt,
        actor: row.actor ? { id: row.actor.id, nome: row.actor.nome, email: row.actor.email } : null,
        context,
      };
    });

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      summary: {
        total,
        today: todayCount,
        last7Days: weekCount,
        actors: actorRows.length,
      },
      facets: {
        entityTypes: facetRows.map((item) => ({ type: item.entityType, count: item._count._all })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, 'pt-BR')),
        actors: actorRows
          .filter((item) => item.actorUserId)
          .map((item) => ({ id: item.actorUserId as string, nome: item.actor?.nome ?? 'Usuário não identificado' })),
      },
      filters: {
        projetoId: query.projetoId ?? null,
        tipos: selectedTypes,
        actorUserId: query.actorUserId ?? null,
        q: query.q?.trim() ?? null,
        de: query.de ?? null,
        ate: query.ate ?? null,
      },
    };
  }

  private async buildProjectScope(projetoId: string): Promise<Prisma.HistoryEntryWhereInput[]> {
    const [times, pessoas, produtos, publicos, modulos, funcionalidades, jornadas, regras, integracoes, fontes, documentos] = await Promise.all([
      this.prisma.time.findMany({ where: { projetoId }, select: { id: true } }),
      this.prisma.pessoa.findMany({ where: { projetoId }, select: { id: true } }),
      this.prisma.produto.findMany({ where: { projetoId }, select: { id: true } }),
      this.prisma.publicoAlvo.findMany({ where: { produto: { projetoId } }, select: { id: true } }),
      this.prisma.modulo.findMany({ where: { produto: { projetoId } }, select: { id: true } }),
      this.prisma.funcionalidade.findMany({ where: { produto: { projetoId } }, select: { id: true } }),
      this.prisma.jornada.findMany({ where: { produto: { projetoId } }, select: { id: true } }),
      this.prisma.regra.findMany({ where: { produto: { projetoId } }, select: { id: true } }),
      this.prisma.integracao.findMany({ where: { OR: [{ produto: { projetoId } }, { produtoRelacionado: { projetoId } }] }, select: { id: true } }),
      this.prisma.fonteConhecimento.findMany({ where: { OR: [{ projetoId }, { vinculos: { some: { projetoContextoId: projetoId } } }] }, select: { id: true } }),
      this.prisma.documentoConhecimento.findMany({ where: { OR: [{ projetoId }, { vinculos: { some: { projetoContextoId: projetoId } } }] }, select: { id: true } }),
    ]);

    const scopes: Array<[string, string[]]> = [
      ['Projeto', [projetoId]],
      ['Time', times.map((x) => x.id)],
      ['Pessoa', pessoas.map((x) => x.id)],
      ['Produto', produtos.map((x) => x.id)],
      ['PublicoAlvo', publicos.map((x) => x.id)],
      ['Modulo', modulos.map((x) => x.id)],
      ['Funcionalidade', funcionalidades.map((x) => x.id)],
      ['Jornada', jornadas.map((x) => x.id)],
      ['Regra', regras.map((x) => x.id)],
      ['Integracao', integracoes.map((x) => x.id)],
      ['Fonte', fontes.map((x) => x.id)],
      ['Documento', documentos.map((x) => x.id)],
    ];

    return scopes.filter(([, ids]) => ids.length).map(([entityType, ids]) => ({ entityType, entityId: { in: ids } }));
  }

  private async resolveContexts(items: Array<{ entityType: string; entityId: string }>) {
    const idsByType = new Map<string, string[]>();
    items.forEach((item) => {
      const list = idsByType.get(item.entityType) ?? [];
      if (!list.includes(item.entityId)) list.push(item.entityId);
      idsByType.set(item.entityType, list);
    });
    const result = new Map<string, EntityContext>();
    const add = (type: string, id: string, context: Omit<EntityContext, 'entityType' | 'entityId'>) => result.set(`${type}:${id}`, { entityType: type, entityId: id, ...context });

    const ids = (type: string) => idsByType.get(type) ?? [];
    const tasks: Promise<void>[] = [];

    if (ids('Projeto').length) tasks.push(this.prisma.projeto.findMany({ where: { id: { in: ids('Projeto') } }, select: { id: true, nome: true } }).then((rows) => rows.forEach((row) => add('Projeto', row.id, { entityLabel: row.nome, projectId: row.id, projectName: row.nome, productId: null, productName: null, route: `/projetos/${row.id}`, crossProject: false }))));
    if (ids('Time').length) tasks.push(this.prisma.time.findMany({ where: { id: { in: ids('Time') } }, include: { projeto: { select: { nome: true } } } }).then((rows) => rows.forEach((row) => add('Time', row.id, { entityLabel: row.nome, projectId: row.projetoId, projectName: row.projeto.nome, productId: null, productName: null, route: `/projetos/${row.projetoId}/times/${row.id}`, crossProject: false }))));
    if (ids('Pessoa').length) tasks.push(this.prisma.pessoa.findMany({ where: { id: { in: ids('Pessoa') } }, include: { projeto: { select: { nome: true } } } }).then((rows) => rows.forEach((row) => add('Pessoa', row.id, { entityLabel: row.nome, projectId: row.projetoId, projectName: row.projeto.nome, productId: null, productName: null, route: `/projetos/${row.projetoId}/pessoas/${row.id}`, crossProject: false }))));
    if (ids('Produto').length) tasks.push(this.prisma.produto.findMany({ where: { id: { in: ids('Produto') } }, include: { projeto: { select: { nome: true } } } }).then((rows) => rows.forEach((row) => add('Produto', row.id, { entityLabel: row.nome, projectId: row.projetoId, projectName: row.projeto.nome, productId: row.id, productName: row.nome, route: `/projetos/${row.projetoId}/produtos/${row.id}`, crossProject: false }))));
    if (ids('PublicoAlvo').length) tasks.push(this.prisma.publicoAlvo.findMany({ where: { id: { in: ids('PublicoAlvo') } }, include: { produto: { include: { projeto: { select: { nome: true } } } } } }).then((rows) => rows.forEach((row) => add('PublicoAlvo', row.id, { entityLabel: row.nome, projectId: row.produto.projetoId, projectName: row.produto.projeto.nome, productId: row.produtoId, productName: row.produto.nome, route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/publico-alvo/${row.id}`, crossProject: false }))));
    if (ids('Modulo').length) tasks.push(this.prisma.modulo.findMany({ where: { id: { in: ids('Modulo') } }, include: { produto: { include: { projeto: { select: { nome: true } } } } } }).then((rows) => rows.forEach((row) => add('Modulo', row.id, { entityLabel: row.nome, projectId: row.produto.projetoId, projectName: row.produto.projeto.nome, productId: row.produtoId, productName: row.produto.nome, route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/modulos/${row.id}`, crossProject: false }))));
    if (ids('Funcionalidade').length) tasks.push(this.prisma.funcionalidade.findMany({ where: { id: { in: ids('Funcionalidade') } }, include: { produto: { include: { projeto: { select: { nome: true } } } } } }).then((rows) => rows.forEach((row) => add('Funcionalidade', row.id, { entityLabel: row.nome, projectId: row.produto.projetoId, projectName: row.produto.projeto.nome, productId: row.produtoId, productName: row.produto.nome, route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/funcionalidades/${row.id}`, crossProject: false }))));
    if (ids('Jornada').length) tasks.push(this.prisma.jornada.findMany({ where: { id: { in: ids('Jornada') } }, include: { produto: { include: { projeto: { select: { nome: true } } } } } }).then((rows) => rows.forEach((row) => add('Jornada', row.id, { entityLabel: row.nome, projectId: row.produto.projetoId, projectName: row.produto.projeto.nome, productId: row.produtoId, productName: row.produto.nome, route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/jornadas/${row.id}`, crossProject: false }))));
    if (ids('Regra').length) tasks.push(this.prisma.regra.findMany({ where: { id: { in: ids('Regra') } }, include: { produto: { include: { projeto: { select: { nome: true } } } } } }).then((rows) => rows.forEach((row) => add('Regra', row.id, { entityLabel: row.nome, projectId: row.produto.projetoId, projectName: row.produto.projeto.nome, productId: row.produtoId, productName: row.produto.nome, route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/regras/${row.id}`, crossProject: false }))));
    if (ids('Integracao').length) tasks.push(this.prisma.integracao.findMany({ where: { id: { in: ids('Integracao') } }, include: { produto: { include: { projeto: { select: { nome: true } } } }, produtoRelacionado: { include: { projeto: { select: { nome: true } } } } } }).then((rows) => rows.forEach((row) => add('Integracao', row.id, { entityLabel: row.nome, projectId: row.produto.projetoId, projectName: row.produto.projeto.nome, productId: row.produtoId, productName: row.produto.nome, route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/integracoes/${row.id}`, crossProject: !!row.produtoRelacionado && row.produtoRelacionado.projetoId !== row.produto.projetoId }))));
    if (ids('Fonte').length) tasks.push(this.prisma.fonteConhecimento.findMany({ where: { id: { in: ids('Fonte') } }, include: { projeto: { select: { nome: true } } } }).then((rows) => rows.forEach((row) => add('Fonte', row.id, { entityLabel: row.nome, projectId: row.projetoId, projectName: row.projeto.nome, productId: null, productName: null, route: `/projetos/${row.projetoId}/fontes?fonte=${row.id}`, crossProject: false }))));
    if (ids('Documento').length) tasks.push(this.prisma.documentoConhecimento.findMany({ where: { id: { in: ids('Documento') } }, include: { projeto: { select: { nome: true } } } }).then((rows) => rows.forEach((row) => add('Documento', row.id, { entityLabel: row.titulo, projectId: row.projetoId, projectName: row.projeto.nome, productId: null, productName: null, route: `/projetos/${row.projetoId}/documentos/${row.id}`, crossProject: false }))));

    await Promise.all(tasks);
    return result;
  }

  private emptyContext(entityType: string, entityId: string): EntityContext {
    return { entityType, entityId, entityLabel: null, projectId: null, projectName: null, productId: null, productName: null, route: null, crossProject: false };
  }
}
