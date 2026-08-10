import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, JornadaStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreateJornadaDto } from './dto/create-jornada.dto';
import { UpdateJornadaDto } from './dto/update-jornada.dto';
import { QueryJornadaDto } from './dto/query-jornada.dto';

const ENTITY_TYPE = 'Jornada';

const RELATIONS_INCLUDE = {
  modulos: { select: { id: true } },
  funcionalidades: { select: { id: true } },
  produtosParticipantes: { select: { id: true } },
} satisfies Prisma.JornadaInclude;

type JornadaWithRelations = Prisma.JornadaGetPayload<{ include: typeof RELATIONS_INCLUDE }>;

function serialize(jornada: JornadaWithRelations) {
  const { modulos, funcionalidades, produtosParticipantes, ...rest } = jornada;
  return {
    ...rest,
    moduloIds: modulos.map((m) => m.id),
    funcionalidadeIds: funcionalidades.map((f) => f.id),
    produtoParticipanteIds: produtosParticipantes.map((p) => p.id),
  };
}

@Injectable()
export class JornadasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  private async assertProdutoExists(produtoId: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new NotFoundException(`Produto ${produtoId} não encontrado`);
  }

  private async assertPublicoAlvoBelongsToProduto(produtoId: string, publicoAlvoId: string | undefined | null) {
    if (!publicoAlvoId) return;
    const publicoAlvo = await this.prisma.publicoAlvo.findFirst({ where: { id: publicoAlvoId, produtoId } });
    if (!publicoAlvo) throw new BadRequestException(`Público-alvo ${publicoAlvoId} não pertence a este produto`);
  }

  private async assertModulosBelongToProduto(produtoId: string, moduloIds: string[] | undefined) {
    if (!moduloIds?.length) return;
    const count = await this.prisma.modulo.count({ where: { id: { in: moduloIds }, produtoId } });
    if (count !== new Set(moduloIds).size) throw new BadRequestException('Um ou mais módulos não pertencem a este produto');
  }

  private async assertFuncionalidadesBelongToProduto(produtoId: string, funcionalidadeIds: string[] | undefined) {
    if (!funcionalidadeIds?.length) return;
    const count = await this.prisma.funcionalidade.count({ where: { id: { in: funcionalidadeIds }, produtoId } });
    if (count !== new Set(funcionalidadeIds).size) throw new BadRequestException('Uma ou mais funcionalidades não pertencem a este produto');
  }

  private async assertProdutosParticipantesExist(produtoIds: string[] | undefined) {
    if (!produtoIds?.length) return;
    const count = await this.prisma.produto.count({ where: { id: { in: produtoIds } } });
    if (count !== new Set(produtoIds).size) throw new BadRequestException('Um ou mais produtos participantes não existem');
  }

  async findAll(produtoId: string, query: QueryJornadaDto) {
    await this.assertProdutoExists(produtoId);
    const where: Prisma.JornadaWhereInput = {
      produtoId,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as JornadaStatus }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jornada.findMany({
        where,
        include: RELATIONS_INCLUDE,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.jornada.count({ where }),
    ]);

    return {
      data: data.map(serialize),
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  async findOneOrThrow(produtoId: string, id: string) {
    const jornada = await this.prisma.jornada.findFirst({ where: { id, produtoId }, include: RELATIONS_INCLUDE });
    if (!jornada) throw new NotFoundException(`Jornada ${id} não encontrada`);
    return serialize(jornada);
  }

  async create(produtoId: string, dto: CreateJornadaDto, actorUserId?: string) {
    await this.assertProdutoExists(produtoId);
    await this.assertPublicoAlvoBelongsToProduto(produtoId, dto.publicoAlvoId);
    await this.assertModulosBelongToProduto(produtoId, dto.moduloIds);
    await this.assertFuncionalidadesBelongToProduto(produtoId, dto.funcionalidadeIds);
    await this.assertProdutosParticipantesExist(dto.produtoParticipanteIds);

    const { moduloIds, funcionalidadeIds, produtoParticipanteIds, ...rest } = dto;
    const jornada = await this.prisma.jornada.create({
      data: {
        ...rest,
        produtoId,
        status: (dto.status as JornadaStatus) ?? JornadaStatus.Ativo,
        modulos: moduloIds ? { connect: moduloIds.map((id) => ({ id })) } : undefined,
        funcionalidades: funcionalidadeIds ? { connect: funcionalidadeIds.map((id) => ({ id })) } : undefined,
        produtosParticipantes: produtoParticipanteIds ? { connect: produtoParticipanteIds.map((id) => ({ id })) } : undefined,
      },
      include: RELATIONS_INCLUDE,
    });
    await this.history.record(ENTITY_TYPE, jornada.id, `Registro criado: "${jornada.nome}"`, actorUserId);
    return serialize(jornada);
  }

  async update(produtoId: string, id: string, dto: UpdateJornadaDto, actorUserId?: string) {
    await this.findOneOrThrow(produtoId, id);
    if (dto.publicoAlvoId !== undefined) await this.assertPublicoAlvoBelongsToProduto(produtoId, dto.publicoAlvoId);
    if (dto.moduloIds !== undefined) await this.assertModulosBelongToProduto(produtoId, dto.moduloIds);
    if (dto.funcionalidadeIds !== undefined) await this.assertFuncionalidadesBelongToProduto(produtoId, dto.funcionalidadeIds);
    if (dto.produtoParticipanteIds !== undefined) await this.assertProdutosParticipantesExist(dto.produtoParticipanteIds);

    const { moduloIds, funcionalidadeIds, produtoParticipanteIds, ...rest } = dto;
    const jornada = await this.prisma.jornada.update({
      where: { id },
      data: {
        ...rest,
        status: dto.status as JornadaStatus | undefined,
        modulos: moduloIds !== undefined ? { set: moduloIds.map((mid) => ({ id: mid })) } : undefined,
        funcionalidades: funcionalidadeIds !== undefined ? { set: funcionalidadeIds.map((fid) => ({ id: fid })) } : undefined,
        produtosParticipantes: produtoParticipanteIds !== undefined ? { set: produtoParticipanteIds.map((pid) => ({ id: pid })) } : undefined,
      },
      include: RELATIONS_INCLUDE,
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${jornada.nome}"`, actorUserId);
    return serialize(jornada);
  }

  async toggleStatus(produtoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(produtoId, id);
    const novoStatus: JornadaStatus = atual.status === JornadaStatus.Ativo ? JornadaStatus.Inativo : JornadaStatus.Ativo;
    const jornada = await this.prisma.jornada.update({ where: { id }, data: { status: novoStatus }, include: RELATIONS_INCLUDE });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return serialize(jornada);
  }

  async historico(produtoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(produtoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  async addEtapa(produtoId: string, id: string, valor: string) {
    const jornada = await this.findOneOrThrow(produtoId, id);
    if (jornada.etapas.includes(valor)) return { etapas: jornada.etapas };
    const atualizado = await this.prisma.jornada.update({ where: { id }, data: { etapas: { push: valor } } });
    return { etapas: atualizado.etapas };
  }

  async removeEtapa(produtoId: string, id: string, valor: string) {
    const jornada = await this.findOneOrThrow(produtoId, id);
    const atualizado = await this.prisma.jornada.update({
      where: { id },
      data: { etapas: jornada.etapas.filter((v) => v !== valor) },
    });
    return { etapas: atualizado.etapas };
  }
}
