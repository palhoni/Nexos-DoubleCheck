import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryBuscaDto } from './dto/query-busca.dto';

type SearchType =
  | 'Projeto'
  | 'Time'
  | 'Pessoa'
  | 'Produto'
  | 'PublicoAlvo'
  | 'Modulo'
  | 'Funcionalidade'
  | 'Jornada'
  | 'Regra'
  | 'Integracao'
  | 'Fonte'
  | 'Documento';

export interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  code: string | null;
  status: string | null;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  productId: string | null;
  productName: string | null;
  route: string;
  updatedAt: Date | null;
  meta: Record<string, string | number | boolean | null>;
}

const ALL_TYPES: SearchType[] = [
  'Projeto', 'Time', 'Pessoa', 'Produto', 'PublicoAlvo', 'Modulo',
  'Funcionalidade', 'Jornada', 'Regra', 'Integracao', 'Fonte', 'Documento',
];

function text(value: string | null | undefined) {
  return value?.trim() || null;
}

@Injectable()
export class BuscaService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: QueryBuscaDto) {
    const q = query.q.trim();
    const limit = query.limit ?? 8;
    const requested = new Set(
      (query.tipos?.split(',').map((value) => value.trim()).filter(Boolean) ?? ALL_TYPES)
        .filter((value): value is SearchType => ALL_TYPES.includes(value as SearchType)),
    );
    const enabled = (type: SearchType) => requested.has(type);
    const contains = { contains: q, mode: 'insensitive' as const };

    const tasks: Array<Promise<SearchResult[]>> = [];

    if (enabled('Projeto')) tasks.push(this.prisma.projeto.findMany({
      where: {
        ...(query.projetoId ? { id: query.projetoId } : {}),
        OR: [{ nome: contains }, { codigo: contains }, { descricao: contains }, { objetivo: contains }, { areaNegocio: contains }],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Projeto' as const, title: row.nome, code: row.codigo, status: row.status,
      description: text(row.objetivo) ?? text(row.descricao), projectId: row.id, projectName: row.nome,
      productId: null, productName: null, route: `/projetos/${row.id}`, updatedAt: row.updatedAt,
      meta: { areaNegocio: text(row.areaNegocio), responsavel: text(row.responsavelPrincipal) },
    }))));

    if (enabled('Time')) tasks.push(this.prisma.time.findMany({
      where: { ...(query.projetoId ? { projetoId: query.projetoId } : {}), OR: [{ nome: contains }, { missao: contains }, { descricao: contains }, { responsavelPrincipal: contains }] },
      include: { projeto: { select: { nome: true } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Time' as const, title: row.nome, code: null, status: row.status,
      description: text(row.missao) ?? text(row.descricao), projectId: row.projetoId, projectName: row.projeto.nome,
      productId: null, productName: null, route: `/projetos/${row.projetoId}/times/${row.id}`, updatedAt: row.updatedAt,
      meta: { responsavel: text(row.responsavelPrincipal) },
    }))));

    if (enabled('Pessoa')) tasks.push(this.prisma.pessoa.findMany({
      where: { ...(query.projetoId ? { projetoId: query.projetoId } : {}), OR: [{ nome: contains }, { emailCorporativo: contains }, { papel: contains }, { cargo: contains }] },
      include: { projeto: { select: { nome: true } }, time: { select: { nome: true } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Pessoa' as const, title: row.nome, code: null, status: row.status,
      description: text(row.papel) ?? text(row.cargo), projectId: row.projetoId, projectName: row.projeto.nome,
      productId: null, productName: null, route: `/projetos/${row.projetoId}/pessoas/${row.id}`, updatedAt: row.updatedAt,
      meta: { email: text(row.emailCorporativo), time: text(row.time?.nome) },
    }))));

    if (enabled('Produto')) tasks.push(this.prisma.produto.findMany({
      where: { ...(query.projetoId ? { projetoId: query.projetoId } : {}), OR: [{ nome: contains }, { nomeCurto: contains }, { codigo: contains }, { descricao: contains }, { objetivo: contains }, { problemaResolve: contains }] },
      include: { projeto: { select: { nome: true } }, timeResponsavel: { select: { nome: true } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Produto' as const, title: row.nome, code: row.codigo, status: row.status,
      description: text(row.objetivo) ?? text(row.descricao), projectId: row.projetoId, projectName: row.projeto.nome,
      productId: row.id, productName: row.nome, route: `/projetos/${row.projetoId}/produtos/${row.id}`, updatedAt: row.updatedAt,
      meta: { areaNegocio: text(row.areaNegocio), time: text(row.timeResponsavel?.nome) },
    }))));

    if (enabled('PublicoAlvo')) tasks.push(this.prisma.publicoAlvo.findMany({
      where: { ...(query.projetoId ? { produto: { projetoId: query.projetoId } } : {}), OR: [{ nome: contains }, { perfil: contains }, { tipoUsuario: contains }, { descricao: contains }] },
      include: { produto: { include: { projeto: { select: { nome: true } } } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'PublicoAlvo' as const, title: row.nome, code: null, status: row.status,
      description: text(row.perfil) ?? text(row.descricao), projectId: row.produto.projetoId, projectName: row.produto.projeto.nome,
      productId: row.produtoId, productName: row.produto.nome,
      route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/publico-alvo/${row.id}`,
      updatedAt: row.updatedAt, meta: { tipoUsuario: text(row.tipoUsuario), frequenciaUso: text(row.frequenciaUso) },
    }))));

    if (enabled('Modulo')) tasks.push(this.prisma.modulo.findMany({
      where: { ...(query.projetoId ? { produto: { projetoId: query.projetoId } } : {}), OR: [{ nome: contains }, { codigo: contains }, { descricao: contains }, { objetivo: contains }] },
      include: { produto: { include: { projeto: { select: { nome: true } } } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Modulo' as const, title: row.nome, code: row.codigo, status: row.status,
      description: text(row.objetivo) ?? text(row.descricao), projectId: row.produto.projetoId, projectName: row.produto.projeto.nome,
      productId: row.produtoId, productName: row.produto.nome,
      route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/modulos/${row.id}`,
      updatedAt: row.updatedAt, meta: { responsavel: text(row.responsavelPrincipal) },
    }))));

    if (enabled('Funcionalidade')) tasks.push(this.prisma.funcionalidade.findMany({
      where: { ...(query.projetoId ? { produto: { projetoId: query.projetoId } } : {}), OR: [{ nome: contains }, { codigo: contains }, { descricao: contains }, { objetivo: contains }, { comportamentoEsperado: contains }] },
      include: { produto: { include: { projeto: { select: { nome: true } } } }, modulo: { select: { nome: true } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Funcionalidade' as const, title: row.nome, code: row.codigo, status: row.status,
      description: text(row.objetivo) ?? text(row.comportamentoEsperado) ?? text(row.descricao),
      projectId: row.produto.projetoId, projectName: row.produto.projeto.nome, productId: row.produtoId, productName: row.produto.nome,
      route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/funcionalidades/${row.id}`,
      updatedAt: row.updatedAt, meta: { modulo: text(row.modulo?.nome), responsavel: text(row.responsavelPrincipal) },
    }))));

    if (enabled('Jornada')) tasks.push(this.prisma.jornada.findMany({
      where: { ...(query.projetoId ? { produto: { projetoId: query.projetoId } } : {}), OR: [{ nome: contains }, { descricao: contains }, { objetivo: contains }, { eventoInicial: contains }, { resultadoEsperado: contains }] },
      include: { produto: { include: { projeto: { select: { nome: true } } } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Jornada' as const, title: row.nome, code: null, status: row.status,
      description: text(row.objetivo) ?? text(row.descricao), projectId: row.produto.projetoId, projectName: row.produto.projeto.nome,
      productId: row.produtoId, productName: row.produto.nome,
      route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/jornadas/${row.id}`,
      updatedAt: row.updatedAt, meta: { etapas: row.etapas.length },
    }))));

    if (enabled('Regra')) tasks.push(this.prisma.regra.findMany({
      where: { versaoAtual: true, ...(query.projetoId ? { produto: { projetoId: query.projetoId } } : {}), OR: [{ nome: contains }, { condicao: contains }, { resultadoEsperado: contains }, { prioridade: contains }] },
      include: { produto: { include: { projeto: { select: { nome: true } } } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Regra' as const, title: row.nome, code: `v${row.numeroVersao}`, status: row.status,
      description: text(row.condicao) ?? text(row.resultadoEsperado), projectId: row.produto.projetoId, projectName: row.produto.projeto.nome,
      productId: row.produtoId, productName: row.produto.nome,
      route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/regras/${row.id}`,
      updatedAt: row.updatedAt, meta: { prioridade: text(row.prioridade) },
    }))));

    if (enabled('Integracao')) tasks.push(this.prisma.integracao.findMany({
      where: { ...(query.projetoId ? { produto: { projetoId: query.projetoId } } : {}), OR: [{ nome: contains }, { tipo: contains }, { endpoint: contains }, { dadosTrafegados: contains }, { papelDependencia: contains }] },
      include: { produto: { include: { projeto: { select: { nome: true } } } }, produtoRelacionado: { include: { projeto: { select: { nome: true } } } } },
      take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Integracao' as const, title: row.nome, code: null, status: row.status,
      description: text(row.endpoint) ?? text(row.dadosTrafegados), projectId: row.produto.projetoId, projectName: row.produto.projeto.nome,
      productId: row.produtoId, productName: row.produto.nome,
      route: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/integracoes/${row.id}`,
      updatedAt: row.updatedAt,
      meta: { tipo: text(row.tipo), criticidade: text(row.criticidade), produtoRelacionado: text(row.produtoRelacionado?.nome), projetoRelacionado: text(row.produtoRelacionado?.projeto.nome) },
    }))));

    if (enabled('Fonte')) tasks.push(this.prisma.fonteConhecimento.findMany({
      where: {
        ...(query.projetoId ? { OR: [{ projetoId: query.projetoId }, { vinculos: { some: { projetoContextoId: query.projetoId } } }] } : {}),
        AND: [{ OR: [{ nome: contains }, { tipo: contains }, { referencia: contains }, { descricao: contains }, { responsavel: contains }] }],
      },
      include: { projeto: { select: { nome: true } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Fonte' as const, title: row.nome, code: null, status: row.status,
      description: text(row.descricao) ?? text(row.referencia), projectId: row.projetoId, projectName: row.projeto.nome,
      productId: null, productName: null, route: `/projetos/${row.projetoId}/fontes?fonte=${row.id}`, updatedAt: row.updatedAt,
      meta: { tipo: row.tipo, oficial: row.oficial, responsavel: text(row.responsavel) },
    }))));

    if (enabled('Documento')) tasks.push(this.prisma.documentoConhecimento.findMany({
      where: {
        ...(query.projetoId ? { OR: [{ projetoId: query.projetoId }, { vinculos: { some: { projetoContextoId: query.projetoId } } }] } : {}),
        AND: [{ OR: [{ titulo: contains }, { codigo: contains }, { tipo: contains }, { resumo: contains }, { conteudo: contains }, { responsavel: contains }] }],
      },
      include: { projeto: { select: { nome: true } } }, take: limit, orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map((row) => ({
      id: row.id, type: 'Documento' as const, title: row.titulo, code: row.codigo, status: row.status,
      description: text(row.resumo), projectId: row.projetoId, projectName: row.projeto.nome,
      productId: null, productName: null, route: `/projetos/${row.projetoId}/documentos/${row.id}`, updatedAt: row.updatedAt,
      meta: { tipo: row.tipo, versao: row.versao, versaoPublicada: row.versaoPublicada },
    }))));

    const grouped = await Promise.all(tasks);
    const results = grouped.flat().sort((a, b) => {
      const aTime = a.updatedAt?.getTime() ?? 0;
      const bTime = b.updatedAt?.getTime() ?? 0;
      return bTime - aTime || a.title.localeCompare(b.title, 'pt-BR');
    });

    const counts = results.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});

    return {
      query: q,
      projectId: query.projetoId ?? null,
      results,
      counts,
      total: results.length,
      types: ALL_TYPES,
    };
  }
}
