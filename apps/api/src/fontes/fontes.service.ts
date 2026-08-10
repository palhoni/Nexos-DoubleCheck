import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FonteStatus, Prisma } from '@prisma/client';
import { HistoryService } from '../common/history/history.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFonteDto } from './dto/create-fonte.dto';
import { CreateFonteVinculoDto } from './dto/create-fonte-vinculo.dto';
import { QueryFonteDto } from './dto/query-fonte.dto';
import { UpdateFonteDto } from './dto/update-fonte.dto';
import type { FonteEntityType } from './fontes.constants';

const ENTITY_TYPE = 'FonteConhecimento';

type TargetContext = {
  projetoId: string;
  label: string;
};

@Injectable()
export class FontesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findAll(query: QueryFonteDto) {
    const where: Prisma.FonteConhecimentoWhereInput = {
      ...(query.projetoId && { projetoId: query.projetoId }),
      ...(query.consumidorProjetoId && { vinculos: { some: { projetoContextoId: query.consumidorProjetoId } } }),
      ...(query.tipo && { tipo: query.tipo }),
      ...(query.status && { status: query.status as FonteStatus }),
      ...(query.oficial !== undefined && { oficial: query.oficial }),
      ...(query.busca && {
        OR: [
          { nome: { contains: query.busca, mode: 'insensitive' } },
          { referencia: { contains: query.busca, mode: 'insensitive' } },
          { responsavel: { contains: query.busca, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fonteConhecimento.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          projeto: { select: { id: true, nome: true, codigo: true } },
          vinculos: { select: { projetoContextoId: true } },
        },
      }),
      this.prisma.fonteConhecimento.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        ...row,
        vinculosTotal: row.vinculos.length,
        vinculosCrossProject: row.vinculos.filter((vinculo) => vinculo.projetoContextoId !== row.projetoId).length,
        vinculos: undefined,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async resumo(projetoId: string) {
    if (!projetoId) throw new BadRequestException('projetoId é obrigatório.');
    await this.ensureProject(projetoId);
    const [total, ativas, oficiais, emRevisao, semVerificacao, consumosCrossProject, fontesExternasConsumidas] = await Promise.all([
      this.prisma.fonteConhecimento.count({ where: { projetoId } }),
      this.prisma.fonteConhecimento.count({ where: { projetoId, status: FonteStatus.Ativa } }),
      this.prisma.fonteConhecimento.count({ where: { projetoId, oficial: true, status: { not: FonteStatus.Inativa } } }),
      this.prisma.fonteConhecimento.count({ where: { projetoId, status: FonteStatus.Revisao } }),
      this.prisma.fonteConhecimento.count({ where: { projetoId, ultimaVerificacao: null, status: { not: FonteStatus.Inativa } } }),
      this.prisma.fonteVinculo.count({
        where: {
          fonte: { projetoId },
          projetoContextoId: { not: projetoId },
        },
      }),
      this.prisma.fonteConhecimento.count({
        where: {
          projetoId: { not: projetoId },
          vinculos: { some: { projetoContextoId: projetoId } },
        },
      }),
    ]);
    return { total, ativas, oficiais, emRevisao, semVerificacao, consumosCrossProject, fontesExternasConsumidas };
  }

  async findOneOrThrow(id: string) {
    const fonte = await this.prisma.fonteConhecimento.findUnique({
      where: { id },
      include: {
        projeto: { select: { id: true, nome: true, codigo: true } },
        vinculos: {
          orderBy: { createdAt: 'desc' },
          include: { projetoContexto: { select: { id: true, nome: true, codigo: true } } },
        },
      },
    });
    if (!fonte) throw new NotFoundException(`Fonte ${id} não encontrada`);
    return {
      ...fonte,
      vinculosTotal: fonte.vinculos.length,
      vinculosCrossProject: fonte.vinculos.filter((vinculo) => vinculo.projetoContextoId !== fonte.projetoId).length,
    };
  }

  async create(dto: CreateFonteDto, actorUserId?: string) {
    await this.ensureProject(dto.projetoId);
    if (dto.oficial && !dto.responsavel?.trim()) {
      throw new BadRequestException('Informe o responsável antes de marcar uma fonte como oficial.');
    }
    try {
      const fonte = await this.prisma.fonteConhecimento.create({
        data: {
          projetoId: dto.projetoId,
          nome: dto.nome.trim(),
          tipo: dto.tipo.trim(),
          referencia: dto.referencia.trim(),
          status: (dto.status as FonteStatus | undefined) ?? FonteStatus.Ativa,
          oficial: dto.oficial ?? false,
          responsavel: dto.responsavel?.trim() || null,
          descricao: dto.descricao?.trim() || null,
          ultimaVerificacao: dto.ultimaVerificacao ? new Date(dto.ultimaVerificacao) : null,
          observacoes: dto.observacoes?.trim() || null,
        },
        include: { projeto: { select: { id: true, nome: true, codigo: true } } },
      });
      await this.history.record(ENTITY_TYPE, fonte.id, `Fonte criada: "${fonte.nome}"`, actorUserId);
      return fonte;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma fonte com essa referência neste Projeto.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateFonteDto, actorUserId?: string) {
    const atual = await this.findOneOrThrow(id);
    const proximoOficial = dto.oficial ?? atual.oficial;
    const proximoResponsavel = dto.responsavel !== undefined ? dto.responsavel.trim() : atual.responsavel;
    if (proximoOficial && !proximoResponsavel) {
      throw new BadRequestException('Informe o responsável antes de marcar uma fonte como oficial.');
    }

    try {
      const fonte = await this.prisma.fonteConhecimento.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined && { nome: dto.nome.trim() }),
          ...(dto.tipo !== undefined && { tipo: dto.tipo.trim() }),
          ...(dto.referencia !== undefined && { referencia: dto.referencia.trim() }),
          ...(dto.status !== undefined && { status: dto.status as FonteStatus }),
          ...(dto.oficial !== undefined && { oficial: dto.oficial }),
          ...(dto.responsavel !== undefined && { responsavel: dto.responsavel.trim() || null }),
          ...(dto.descricao !== undefined && { descricao: dto.descricao.trim() || null }),
          ...(dto.ultimaVerificacao !== undefined && { ultimaVerificacao: dto.ultimaVerificacao ? new Date(dto.ultimaVerificacao) : null }),
          ...(dto.observacoes !== undefined && { observacoes: dto.observacoes.trim() || null }),
        },
        include: { projeto: { select: { id: true, nome: true, codigo: true } } },
      });
      await this.history.record(ENTITY_TYPE, fonte.id, `Fonte atualizada: "${fonte.nome}"`, actorUserId);
      return fonte;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma fonte com essa referência neste Projeto.');
      }
      throw error;
    }
  }

  async toggleStatus(id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(id);
    const status = atual.status === FonteStatus.Ativa ? FonteStatus.Inativa : FonteStatus.Ativa;
    const fonte = await this.prisma.fonteConhecimento.update({ where: { id }, data: { status } });
    await this.history.record(ENTITY_TYPE, id, `Status da fonte alterado para "${status}": "${atual.nome}"`, actorUserId);
    return fonte;
  }

  async historico(id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  async listLinksByEntity(entityType: FonteEntityType, entityId: string) {
    await this.resolveTarget(entityType, entityId);
    return this.prisma.fonteVinculo.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        fonte: {
          include: { projeto: { select: { id: true, nome: true, codigo: true } } },
        },
        projetoContexto: { select: { id: true, nome: true, codigo: true } },
      },
    });
  }

  async createLink(fonteId: string, dto: CreateFonteVinculoDto, actorUserId?: string) {
    const fonte = await this.findOneOrThrow(fonteId);
    if (fonte.status === FonteStatus.Inativa) {
      throw new BadRequestException('Uma fonte inativa não pode receber novos vínculos. Reative ou revise a fonte antes de reutilizá-la.');
    }
    const target = await this.resolveTarget(dto.entityType as FonteEntityType, dto.entityId);

    try {
      const vinculo = await this.prisma.fonteVinculo.create({
        data: {
          fonteId,
          projetoContextoId: target.projetoId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          contexto: dto.contexto?.trim() || null,
        },
        include: {
          fonte: { include: { projeto: { select: { id: true, nome: true, codigo: true } } } },
          projetoContexto: { select: { id: true, nome: true, codigo: true } },
        },
      });
      await Promise.all([
        this.history.record(ENTITY_TYPE, fonteId, `Fonte vinculada a ${dto.entityType}: "${target.label}"`, actorUserId),
        this.history.record(dto.entityType, dto.entityId, `Fonte de conhecimento vinculada: "${fonte.nome}"`, actorUserId),
      ]);
      return vinculo;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esta fonte já está vinculada a esse conhecimento.');
      }
      throw error;
    }
  }

  async removeLink(fonteId: string, vinculoId: string, actorUserId?: string) {
    const fonte = await this.findOneOrThrow(fonteId);
    const vinculo = await this.prisma.fonteVinculo.findFirst({ where: { id: vinculoId, fonteId } });
    if (!vinculo) throw new NotFoundException('Vínculo de fonte não encontrado.');
    const target = await this.resolveTarget(vinculo.entityType as FonteEntityType, vinculo.entityId);
    await this.prisma.fonteVinculo.delete({ where: { id: vinculo.id } });
    await Promise.all([
      this.history.record(ENTITY_TYPE, fonteId, `Fonte desvinculada de ${vinculo.entityType}: "${target.label}"`, actorUserId),
      this.history.record(vinculo.entityType, vinculo.entityId, `Fonte de conhecimento desvinculada: "${fonte.nome}"`, actorUserId),
    ]);
    return { ok: true };
  }

  private async ensureProject(id: string) {
    const projeto = await this.prisma.projeto.findUnique({ where: { id }, select: { id: true } });
    if (!projeto) throw new NotFoundException(`Projeto ${id} não encontrado`);
  }

  private async resolveTarget(entityType: FonteEntityType, entityId: string): Promise<TargetContext> {
    switch (entityType) {
      case 'Projeto': {
        const row = await this.prisma.projeto.findUnique({ where: { id: entityId }, select: { id: true, nome: true } });
        if (!row) break;
        return { projetoId: row.id, label: row.nome };
      }
      case 'Time': {
        const row = await this.prisma.time.findUnique({ where: { id: entityId }, select: { nome: true, projetoId: true } });
        if (!row) break;
        return { projetoId: row.projetoId, label: row.nome };
      }
      case 'Pessoa': {
        const row = await this.prisma.pessoa.findUnique({ where: { id: entityId }, select: { nome: true, projetoId: true } });
        if (!row) break;
        return { projetoId: row.projetoId, label: row.nome };
      }
      case 'Produto': {
        const row = await this.prisma.produto.findUnique({ where: { id: entityId }, select: { nome: true, projetoId: true } });
        if (!row) break;
        return { projetoId: row.projetoId, label: row.nome };
      }
      case 'PublicoAlvo': {
        const row = await this.prisma.publicoAlvo.findUnique({ where: { id: entityId }, select: { nome: true, produto: { select: { projetoId: true } } } });
        if (!row) break;
        return { projetoId: row.produto.projetoId, label: row.nome };
      }
      case 'Modulo': {
        const row = await this.prisma.modulo.findUnique({ where: { id: entityId }, select: { nome: true, produto: { select: { projetoId: true } } } });
        if (!row) break;
        return { projetoId: row.produto.projetoId, label: row.nome };
      }
      case 'Funcionalidade': {
        const row = await this.prisma.funcionalidade.findUnique({ where: { id: entityId }, select: { nome: true, produto: { select: { projetoId: true } } } });
        if (!row) break;
        return { projetoId: row.produto.projetoId, label: row.nome };
      }
      case 'Jornada': {
        const row = await this.prisma.jornada.findUnique({ where: { id: entityId }, select: { nome: true, produto: { select: { projetoId: true } } } });
        if (!row) break;
        return { projetoId: row.produto.projetoId, label: row.nome };
      }
      case 'Regra': {
        const row = await this.prisma.regra.findUnique({ where: { id: entityId }, select: { nome: true, produto: { select: { projetoId: true } } } });
        if (!row) break;
        return { projetoId: row.produto.projetoId, label: row.nome };
      }
      case 'Integracao': {
        const row = await this.prisma.integracao.findUnique({ where: { id: entityId }, select: { nome: true, produto: { select: { projetoId: true } } } });
        if (!row) break;
        return { projetoId: row.produto.projetoId, label: row.nome };
      }
      case 'Documento': {
        const row = await this.prisma.documentoConhecimento.findUnique({ where: { id: entityId }, select: { titulo: true, projetoId: true } });
        if (!row) break;
        return { projetoId: row.projetoId, label: row.titulo };
      }
    }
    throw new NotFoundException(`${entityType} ${entityId} não encontrado`);
  }
}
