import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, FuncionalidadeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreateFuncionalidadeDto } from './dto/create-funcionalidade.dto';
import { UpdateFuncionalidadeDto } from './dto/update-funcionalidade.dto';
import { QueryFuncionalidadeDto } from './dto/query-funcionalidade.dto';

const ENTITY_TYPE = 'Funcionalidade';

@Injectable()
export class FuncionalidadesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  private async assertProdutoExists(produtoId: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new NotFoundException(`Produto ${produtoId} não encontrado`);
  }

  private async assertModuloBelongsToProduto(produtoId: string, moduloId: string | undefined | null) {
    if (!moduloId) return;
    const modulo = await this.prisma.modulo.findFirst({ where: { id: moduloId, produtoId } });
    if (!modulo) throw new BadRequestException(`Módulo ${moduloId} não pertence a este produto`);
  }

  async findAll(produtoId: string, query: QueryFuncionalidadeDto) {
    await this.assertProdutoExists(produtoId);
    const where: Prisma.FuncionalidadeWhereInput = {
      produtoId,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as FuncionalidadeStatus }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.funcionalidade.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.funcionalidade.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  async findOneOrThrow(produtoId: string, id: string) {
    const funcionalidade = await this.prisma.funcionalidade.findFirst({ where: { id, produtoId } });
    if (!funcionalidade) throw new NotFoundException(`Funcionalidade ${id} não encontrada`);
    return funcionalidade;
  }

  async create(produtoId: string, dto: CreateFuncionalidadeDto, actorUserId?: string) {
    await this.assertProdutoExists(produtoId);
    await this.assertModuloBelongsToProduto(produtoId, dto.moduloId);
    const funcionalidade = await this.prisma.funcionalidade.create({
      data: { ...dto, produtoId, status: (dto.status as FuncionalidadeStatus) ?? FuncionalidadeStatus.Ativo },
    });
    await this.history.record(ENTITY_TYPE, funcionalidade.id, `Registro criado: "${funcionalidade.nome}"`, actorUserId);
    return funcionalidade;
  }

  async update(produtoId: string, id: string, dto: UpdateFuncionalidadeDto, actorUserId?: string) {
    await this.findOneOrThrow(produtoId, id);
    if (dto.moduloId !== undefined) await this.assertModuloBelongsToProduto(produtoId, dto.moduloId);
    const funcionalidade = await this.prisma.funcionalidade.update({
      where: { id },
      data: { ...dto, status: dto.status as FuncionalidadeStatus | undefined },
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${funcionalidade.nome}"`, actorUserId);
    return funcionalidade;
  }

  async toggleStatus(produtoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(produtoId, id);
    const novoStatus: FuncionalidadeStatus = atual.status === FuncionalidadeStatus.Ativo ? FuncionalidadeStatus.Inativo : FuncionalidadeStatus.Ativo;
    const funcionalidade = await this.prisma.funcionalidade.update({ where: { id }, data: { status: novoStatus } });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return funcionalidade;
  }

  async historico(produtoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(produtoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }
}
