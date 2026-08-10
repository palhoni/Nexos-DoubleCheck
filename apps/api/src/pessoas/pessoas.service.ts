import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PessoaStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { QueryPessoaDto } from './dto/query-pessoa.dto';

const ENTITY_TYPE = 'Pessoa';
type ListField = 'produtos' | 'responsabilidades' | 'especialidades';

@Injectable()
export class PessoasService {
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

  async findAll(projetoId: string, query: QueryPessoaDto) {
    await this.assertProjetoExists(projetoId);
    const where: Prisma.PessoaWhereInput = {
      projetoId,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as PessoaStatus }),
      ...(query.timeId && { timeId: query.timeId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pessoa.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.pessoa.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  async findOneOrThrow(projetoId: string, id: string) {
    const pessoa = await this.prisma.pessoa.findFirst({ where: { id, projetoId } });
    if (!pessoa) throw new NotFoundException(`Pessoa ${id} não encontrada`);
    return pessoa;
  }

  async create(projetoId: string, dto: CreatePessoaDto, actorUserId?: string) {
    await this.assertProjetoExists(projetoId);
    await this.assertTimeBelongsToProjeto(projetoId, dto.timeId);
    const pessoa = await this.prisma.pessoa.create({
      data: { ...dto, projetoId, status: (dto.status as PessoaStatus) ?? PessoaStatus.Ativo },
    });
    await this.history.record(ENTITY_TYPE, pessoa.id, `Registro criado: "${pessoa.nome}"`, actorUserId);
    return pessoa;
  }

  async update(projetoId: string, id: string, dto: UpdatePessoaDto, actorUserId?: string) {
    await this.findOneOrThrow(projetoId, id);
    if (dto.timeId !== undefined) await this.assertTimeBelongsToProjeto(projetoId, dto.timeId);
    const pessoa = await this.prisma.pessoa.update({
      where: { id },
      data: { ...dto, status: dto.status as PessoaStatus | undefined },
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${pessoa.nome}"`, actorUserId);
    return pessoa;
  }

  async toggleStatus(projetoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(projetoId, id);
    const novoStatus: PessoaStatus = atual.status === PessoaStatus.Ativo ? PessoaStatus.Inativo : PessoaStatus.Ativo;
    const pessoa = await this.prisma.pessoa.update({ where: { id }, data: { status: novoStatus } });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return pessoa;
  }

  async historico(projetoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(projetoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  async addListItem(projetoId: string, id: string, field: ListField, valor: string) {
    const pessoa = await this.findOneOrThrow(projetoId, id);
    const atuais = pessoa[field];
    if (atuais.includes(valor)) return { [field]: atuais };
    const atualizado = await this.prisma.pessoa.update({ where: { id }, data: { [field]: { push: valor } } });
    return { [field]: atualizado[field] };
  }

  async removeListItem(projetoId: string, id: string, field: ListField, valor: string) {
    const pessoa = await this.findOneOrThrow(projetoId, id);
    const atualizado = await this.prisma.pessoa.update({
      where: { id },
      data: { [field]: pessoa[field].filter((v) => v !== valor) },
    });
    return { [field]: atualizado[field] };
  }
}
