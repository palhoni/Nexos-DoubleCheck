import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PublicoAlvoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreatePublicoAlvoDto } from './dto/create-publico-alvo.dto';
import { UpdatePublicoAlvoDto } from './dto/update-publico-alvo.dto';
import { QueryPublicoAlvoDto } from './dto/query-publico-alvo.dto';

const ENTITY_TYPE = 'PublicoAlvo';
type ListField = 'necessidades' | 'dores' | 'objetivos';

@Injectable()
export class PublicoAlvoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  private async assertProdutoExists(produtoId: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new NotFoundException(`Produto ${produtoId} não encontrado`);
  }

  async findAll(produtoId: string, query: QueryPublicoAlvoDto) {
    await this.assertProdutoExists(produtoId);
    const where: Prisma.PublicoAlvoWhereInput = {
      produtoId,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as PublicoAlvoStatus }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.publicoAlvo.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.publicoAlvo.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  async findOneOrThrow(produtoId: string, id: string) {
    const publicoAlvo = await this.prisma.publicoAlvo.findFirst({ where: { id, produtoId } });
    if (!publicoAlvo) throw new NotFoundException(`Público-alvo ${id} não encontrado`);
    return publicoAlvo;
  }

  async create(produtoId: string, dto: CreatePublicoAlvoDto, actorUserId?: string) {
    await this.assertProdutoExists(produtoId);
    const publicoAlvo = await this.prisma.publicoAlvo.create({
      data: { ...dto, produtoId, status: (dto.status as PublicoAlvoStatus) ?? PublicoAlvoStatus.Ativo },
    });
    await this.history.record(ENTITY_TYPE, publicoAlvo.id, `Registro criado: "${publicoAlvo.nome}"`, actorUserId);
    return publicoAlvo;
  }

  async update(produtoId: string, id: string, dto: UpdatePublicoAlvoDto, actorUserId?: string) {
    await this.findOneOrThrow(produtoId, id);
    const publicoAlvo = await this.prisma.publicoAlvo.update({
      where: { id },
      data: { ...dto, status: dto.status as PublicoAlvoStatus | undefined },
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${publicoAlvo.nome}"`, actorUserId);
    return publicoAlvo;
  }

  async toggleStatus(produtoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(produtoId, id);
    const novoStatus: PublicoAlvoStatus = atual.status === PublicoAlvoStatus.Ativo ? PublicoAlvoStatus.Inativo : PublicoAlvoStatus.Ativo;
    const publicoAlvo = await this.prisma.publicoAlvo.update({ where: { id }, data: { status: novoStatus } });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return publicoAlvo;
  }

  async historico(produtoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(produtoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  async addListItem(produtoId: string, id: string, field: ListField, valor: string) {
    const publicoAlvo = await this.findOneOrThrow(produtoId, id);
    const atuais = publicoAlvo[field];
    if (atuais.includes(valor)) return { [field]: atuais };
    const atualizado = await this.prisma.publicoAlvo.update({ where: { id }, data: { [field]: { push: valor } } });
    return { [field]: atualizado[field] };
  }

  async removeListItem(produtoId: string, id: string, field: ListField, valor: string) {
    const publicoAlvo = await this.findOneOrThrow(produtoId, id);
    const atualizado = await this.prisma.publicoAlvo.update({
      where: { id },
      data: { [field]: publicoAlvo[field].filter((v) => v !== valor) },
    });
    return { [field]: atualizado[field] };
  }
}
