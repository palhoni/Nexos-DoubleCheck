import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProdutoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { QueryProdutoDto } from './dto/query-produto.dto';

const ENTITY_TYPE = 'Produto';

@Injectable()
export class ProdutosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  private async assertProjetoExists(projetoId: string) {
    const projeto = await this.prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) throw new NotFoundException(`Projeto ${projetoId} não encontrado`);
  }

  private async assertTimeBelongsToProjeto(projetoId: string, timeId: string | undefined | null) {
    if (!timeId) return;
    const time = await this.prisma.time.findFirst({ where: { id: timeId, projetoId } });
    if (!time) throw new BadRequestException(`Time ${timeId} não pertence a este projeto`);
  }

  async findAll(projetoId: string, query: QueryProdutoDto) {
    await this.assertProjetoExists(projetoId);
    const where: Prisma.ProdutoWhereInput = {
      projetoId,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as ProdutoStatus }),
      ...(query.areaNegocio && { areaNegocio: query.areaNegocio }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.produto.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.produto.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  /** Listagem global (todos os projetos) usada para popular seletores cross-projeto,
   *  ex.: "produtos participantes" de uma Jornada. */
  async findAllGlobal(nome?: string) {
    return this.prisma.produto.findMany({
      where: nome ? { nome: { contains: nome, mode: 'insensitive' } } : undefined,
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        codigo: true,
        status: true,
        projetoId: true,
        createdAt: true,
        projeto: { select: { nome: true } },
        timeResponsavel: { select: { id: true, nome: true, pessoas: { select: { id: true, nome: true }, take: 5 } } },
      },
      take: 200,
    });
  }

  async findOneOrThrow(projetoId: string, id: string) {
    const produto = await this.prisma.produto.findFirst({ where: { id, projetoId } });
    if (!produto) throw new NotFoundException(`Produto ${id} não encontrado`);
    return produto;
  }

  async create(projetoId: string, dto: CreateProdutoDto, actorUserId?: string) {
    await this.assertProjetoExists(projetoId);
    await this.assertTimeBelongsToProjeto(projetoId, dto.timeResponsavelId);
    const produto = await this.prisma.produto.create({
      data: { ...dto, projetoId, status: (dto.status as ProdutoStatus) ?? ProdutoStatus.Planejamento },
    });
    await this.history.record(ENTITY_TYPE, produto.id, `Registro criado: "${produto.nome}"`, actorUserId);
    return produto;
  }

  async update(projetoId: string, id: string, dto: UpdateProdutoDto, actorUserId?: string) {
    await this.findOneOrThrow(projetoId, id);
    if (dto.timeResponsavelId !== undefined) await this.assertTimeBelongsToProjeto(projetoId, dto.timeResponsavelId);
    const produto = await this.prisma.produto.update({
      where: { id },
      data: { ...dto, status: dto.status as ProdutoStatus | undefined },
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${produto.nome}"`, actorUserId);
    return produto;
  }

  async toggleStatus(projetoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(projetoId, id);
    const novoStatus: ProdutoStatus = atual.status === ProdutoStatus.Ativo ? ProdutoStatus.Inativo : ProdutoStatus.Ativo;
    const produto = await this.prisma.produto.update({ where: { id }, data: { status: novoStatus } });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return produto;
  }

  async historico(projetoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(projetoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  async addPais(projetoId: string, id: string, valor: string) {
    const produto = await this.findOneOrThrow(projetoId, id);
    if (produto.paises.includes(valor)) return { paises: produto.paises };
    const atualizado = await this.prisma.produto.update({ where: { id }, data: { paises: { push: valor } } });
    return { paises: atualizado.paises };
  }

  async removePais(projetoId: string, id: string, valor: string) {
    const produto = await this.findOneOrThrow(projetoId, id);
    const atualizado = await this.prisma.produto.update({
      where: { id },
      data: { paises: produto.paises.filter((v) => v !== valor) },
    });
    return { paises: atualizado.paises };
  }

  /** Maturidade de documentação — mede o quanto o Produto está estruturado no Nexus, não a
   *  qualidade em produção (isso é `estabilidadeStatus`, campo separado e manual). É o
   *  indicador que diz se há base suficiente para um agent raciocinar com segurança sobre
   *  o impacto de uma mudança neste Produto. */
  async calcularMaturidade(projetoId: string, id: string) {
    const produto = await this.findOneOrThrow(projetoId, id);

    const [publicosAlvoCount, modulos, funcionalidades, jornadasCount, integracoesCount] = await Promise.all([
      this.prisma.publicoAlvo.count({ where: { produtoId: id } }),
      this.prisma.modulo.findMany({ where: { produtoId: id }, select: { _count: { select: { funcionalidades: true } } } }),
      this.prisma.funcionalidade.findMany({ where: { produtoId: id }, select: { _count: { select: { regras: true } } } }),
      this.prisma.jornada.count({ where: { produtoId: id } }),
      this.prisma.integracao.count({ where: { OR: [{ produtoId: id }, { produtoRelacionadoId: id }] } }),
    ]);

    const camposPerfil = [
      produto.descricao,
      produto.objetivo,
      produto.problemaResolve,
      produto.usuariosPrincipais,
      produto.areaNegocio,
      produto.responsavelPrincipal,
      produto.paises.length > 0 ? 'ok' : null,
    ];
    const perfil = Math.round((camposPerfil.filter((c) => !!c).length / camposPerfil.length) * 100);

    const modulosComFuncionalidade = modulos.filter((m) => m._count.funcionalidades > 0).length;
    const modulosPct = modulos.length > 0 ? Math.round((modulosComFuncionalidade / modulos.length) * 100) : 0;

    const funcionalidadesComRegra = funcionalidades.filter((f) => f._count.regras > 0).length;
    const regrasPct = funcionalidades.length > 0 ? Math.round((funcionalidadesComRegra / funcionalidades.length) * 100) : 0;

    const categorias = [
      { chave: 'perfil', label: 'Perfil do Produto', percentual: perfil },
      { chave: 'publicoAlvo', label: 'Público-alvo', percentual: publicosAlvoCount > 0 ? 100 : 0 },
      { chave: 'modulos', label: 'Módulos → Funcionalidades', percentual: modulosPct },
      { chave: 'regras', label: 'Regras', percentual: regrasPct },
      { chave: 'jornadas', label: 'Jornadas', percentual: jornadasCount > 0 ? 100 : 0 },
      { chave: 'integracoes', label: 'Integrações', percentual: integracoesCount > 0 ? 100 : 0 },
      { chave: 'responsaveis', label: 'Responsáveis', percentual: produto.timeResponsavelId ? 100 : 0 },
    ];
    const geral = Math.round(categorias.reduce((acc, c) => acc + c.percentual, 0) / categorias.length);

    return {
      produtoId: id,
      categorias,
      geral,
      estabilidadeStatus: produto.estabilidadeStatus,
      estabilidadeObservacao: produto.estabilidadeObservacao,
    };
  }
}
