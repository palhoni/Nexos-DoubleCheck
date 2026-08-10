import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ModuloStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';
import { QueryModuloDto } from './dto/query-modulo.dto';

const ENTITY_TYPE = 'Modulo';

@Injectable()
export class ModulosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  private async assertProdutoExists(produtoId: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new NotFoundException(`Produto ${produtoId} não encontrado`);
  }

  async findAll(produtoId: string, query: QueryModuloDto) {
    await this.assertProdutoExists(produtoId);
    const where: Prisma.ModuloWhereInput = {
      produtoId,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as ModuloStatus }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.modulo.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.modulo.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  async findOneOrThrow(produtoId: string, id: string) {
    const modulo = await this.prisma.modulo.findFirst({ where: { id, produtoId } });
    if (!modulo) throw new NotFoundException(`Módulo ${id} não encontrado`);
    return modulo;
  }

  async create(produtoId: string, dto: CreateModuloDto, actorUserId?: string) {
    await this.assertProdutoExists(produtoId);
    const modulo = await this.prisma.modulo.create({
      data: { ...dto, produtoId, status: (dto.status as ModuloStatus) ?? ModuloStatus.Ativo },
    });
    await this.history.record(ENTITY_TYPE, modulo.id, `Registro criado: "${modulo.nome}"`, actorUserId);
    return modulo;
  }

  async update(produtoId: string, id: string, dto: UpdateModuloDto, actorUserId?: string) {
    await this.findOneOrThrow(produtoId, id);
    const modulo = await this.prisma.modulo.update({
      where: { id },
      data: { ...dto, status: dto.status as ModuloStatus | undefined },
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${modulo.nome}"`, actorUserId);
    return modulo;
  }

  async toggleStatus(produtoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(produtoId, id);
    const novoStatus: ModuloStatus = atual.status === ModuloStatus.Ativo ? ModuloStatus.Inativo : ModuloStatus.Ativo;
    const modulo = await this.prisma.modulo.update({ where: { id }, data: { status: novoStatus } });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return modulo;
  }

  async historico(produtoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(produtoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }
}
