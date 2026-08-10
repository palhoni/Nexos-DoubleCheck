import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, IntegracaoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreateIntegracaoDto } from './dto/create-integracao.dto';
import { UpdateIntegracaoDto } from './dto/update-integracao.dto';
import { QueryIntegracaoDto } from './dto/query-integracao.dto';

const ENTITY_TYPE = 'Integracao';

const RELATIONS_INCLUDE = {
  funcionalidades: { select: { id: true } },
} satisfies Prisma.IntegracaoInclude;

type IntegracaoWithRelations = Prisma.IntegracaoGetPayload<{ include: typeof RELATIONS_INCLUDE }>;

function serialize(integracao: IntegracaoWithRelations) {
  const { funcionalidades, ...rest } = integracao;
  return { ...rest, funcionalidadeIds: funcionalidades.map((f) => f.id) };
}

@Injectable()
export class IntegracoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  private async assertProdutoExists(produtoId: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new NotFoundException(`Produto ${produtoId} não encontrado`);
  }

  private async assertProdutoRelacionadoExists(produtoRelacionadoId: string | undefined | null) {
    if (!produtoRelacionadoId) return;
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoRelacionadoId } });
    if (!produto) throw new BadRequestException(`Produto relacionado ${produtoRelacionadoId} não existe`);
  }

  private async assertFuncionalidadesBelongToProduto(produtoId: string, funcionalidadeIds: string[] | undefined) {
    if (!funcionalidadeIds?.length) return;
    const count = await this.prisma.funcionalidade.count({ where: { id: { in: funcionalidadeIds }, produtoId } });
    if (count !== new Set(funcionalidadeIds).size) throw new BadRequestException('Uma ou mais funcionalidades não pertencem a este produto');
  }

  /** Time proprietário precisa pertencer ao mesmo Projeto do Produto — Integração só
   *  carrega produtoId, então buscamos o projetoId do produto antes de validar. */
  private async assertTimeBelongsToMesmoProjetoDoProduto(produtoId: string, timeId: string | undefined | null) {
    if (!timeId) return;
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId }, select: { projetoId: true } });
    if (!produto) throw new NotFoundException(`Produto ${produtoId} não encontrado`);
    const time = await this.prisma.time.findFirst({ where: { id: timeId, projetoId: produto.projetoId } });
    if (!time) throw new BadRequestException(`Time ${timeId} não pertence ao mesmo projeto deste produto`);
  }

  async findAll(produtoId: string, query: QueryIntegracaoDto) {
    await this.assertProdutoExists(produtoId);
    const where: Prisma.IntegracaoWhereInput = {
      produtoId,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as IntegracaoStatus }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.integracao.findMany({
        where,
        include: RELATIONS_INCLUDE,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.integracao.count({ where }),
    ]);

    return {
      data: data.map(serialize),
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  async findOneOrThrow(produtoId: string, id: string) {
    const integracao = await this.prisma.integracao.findFirst({ where: { id, produtoId }, include: RELATIONS_INCLUDE });
    if (!integracao) throw new NotFoundException(`Integração ${id} não encontrada`);
    return serialize(integracao);
  }

  async create(produtoId: string, dto: CreateIntegracaoDto, actorUserId?: string) {
    await this.assertProdutoExists(produtoId);
    await this.assertProdutoRelacionadoExists(dto.produtoRelacionadoId);
    await this.assertTimeBelongsToMesmoProjetoDoProduto(produtoId, dto.timeProprietarioId);
    await this.assertFuncionalidadesBelongToProduto(produtoId, dto.funcionalidadeIds);
    const { funcionalidadeIds, ...rest } = dto;
    const integracao = await this.prisma.integracao.create({
      data: {
        ...rest,
        produtoId,
        status: (dto.status as IntegracaoStatus) ?? IntegracaoStatus.Ativo,
        funcionalidades: funcionalidadeIds ? { connect: funcionalidadeIds.map((id) => ({ id })) } : undefined,
      },
      include: RELATIONS_INCLUDE,
    });
    await this.history.record(ENTITY_TYPE, integracao.id, `Registro criado: "${integracao.nome}"`, actorUserId);
    return serialize(integracao);
  }

  async update(produtoId: string, id: string, dto: UpdateIntegracaoDto, actorUserId?: string) {
    await this.findOneOrThrow(produtoId, id);
    if (dto.produtoRelacionadoId !== undefined) await this.assertProdutoRelacionadoExists(dto.produtoRelacionadoId);
    if (dto.timeProprietarioId !== undefined) await this.assertTimeBelongsToMesmoProjetoDoProduto(produtoId, dto.timeProprietarioId);
    if (dto.funcionalidadeIds !== undefined) await this.assertFuncionalidadesBelongToProduto(produtoId, dto.funcionalidadeIds);
    const { funcionalidadeIds, ...rest } = dto;
    const integracao = await this.prisma.integracao.update({
      where: { id },
      data: {
        ...rest,
        status: dto.status as IntegracaoStatus | undefined,
        funcionalidades: funcionalidadeIds !== undefined ? { set: funcionalidadeIds.map((fid) => ({ id: fid })) } : undefined,
      },
      include: RELATIONS_INCLUDE,
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${integracao.nome}"`, actorUserId);
    return serialize(integracao);
  }

  async toggleStatus(produtoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(produtoId, id);
    const novoStatus: IntegracaoStatus = atual.status === IntegracaoStatus.Ativo ? IntegracaoStatus.Inativo : IntegracaoStatus.Ativo;
    const integracao = await this.prisma.integracao.update({ where: { id }, data: { status: novoStatus }, include: RELATIONS_INCLUDE });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return serialize(integracao);
  }

  async historico(produtoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(produtoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  /** Listagem global (todos os produtos/projetos) usada pelo mapa visual de integrações. */
  async findAllGlobal() {
    return this.prisma.integracao.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        nome: true,
        status: true,
        direcao: true,
        papelDependencia: true,
        tipo: true,
        modo: true,
        criticidade: true,
        dadosTrafegados: true,
        updatedAt: true,
        timeProprietarioId: true,
        timeProprietario: { select: { id: true, nome: true } },
        produtoId: true,
        produto: { select: { nome: true, projetoId: true, projeto: { select: { nome: true } } } },
        produtoRelacionadoId: true,
        produtoRelacionado: { select: { nome: true, projetoId: true, projeto: { select: { nome: true } } } },
        funcionalidades: { select: { id: true, nome: true } },
      },
    });
  }
}
