import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreateTimeDto } from './dto/create-time.dto';
import { UpdateTimeDto } from './dto/update-time.dto';
import { QueryTimeDto } from './dto/query-time.dto';

const ENTITY_TYPE = 'Time';

@Injectable()
export class TimesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  private async assertProjetoExists(projetoId: string) {
    const projeto = await this.prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) throw new NotFoundException(`Projeto ${projetoId} não encontrado`);
  }

  async findAll(projetoId: string, query: QueryTimeDto) {
    await this.assertProjetoExists(projetoId);
    const where: Prisma.TimeWhereInput = {
      projetoId,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as TimeStatus }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.time.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.time.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  async findOneOrThrow(projetoId: string, id: string) {
    const time = await this.prisma.time.findFirst({ where: { id, projetoId } });
    if (!time) throw new NotFoundException(`Time ${id} não encontrado`);
    return time;
  }

  async create(projetoId: string, dto: CreateTimeDto, actorUserId?: string) {
    await this.assertProjetoExists(projetoId);
    const time = await this.prisma.time.create({
      data: { ...dto, projetoId, status: (dto.status as TimeStatus) ?? TimeStatus.Ativo },
    });
    await this.history.record(ENTITY_TYPE, time.id, `Registro criado: "${time.nome}"`, actorUserId);
    return time;
  }

  async update(projetoId: string, id: string, dto: UpdateTimeDto, actorUserId?: string) {
    await this.findOneOrThrow(projetoId, id);
    const time = await this.prisma.time.update({
      where: { id },
      data: { ...dto, status: dto.status as TimeStatus | undefined },
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${time.nome}"`, actorUserId);
    return time;
  }

  async toggleStatus(projetoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(projetoId, id);
    const novoStatus: TimeStatus = atual.status === TimeStatus.Ativo ? TimeStatus.Inativo : TimeStatus.Ativo;
    const time = await this.prisma.time.update({ where: { id }, data: { status: novoStatus } });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return time;
  }

  async historico(projetoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(projetoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  async addProdutoAtendido(projetoId: string, id: string, valor: string) {
    const time = await this.findOneOrThrow(projetoId, id);
    if (time.produtosAtendidos.includes(valor)) return { produtosAtendidos: time.produtosAtendidos };
    const atualizado = await this.prisma.time.update({ where: { id }, data: { produtosAtendidos: { push: valor } } });
    return { produtosAtendidos: atualizado.produtosAtendidos };
  }

  async removeProdutoAtendido(projetoId: string, id: string, valor: string) {
    const time = await this.findOneOrThrow(projetoId, id);
    const atualizado = await this.prisma.time.update({
      where: { id },
      data: { produtosAtendidos: time.produtosAtendidos.filter((v) => v !== valor) },
    });
    return { produtosAtendidos: atualizado.produtosAtendidos };
  }
}
