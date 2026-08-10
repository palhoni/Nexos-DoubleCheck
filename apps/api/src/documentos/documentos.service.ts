import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentoStatus, Prisma } from '@prisma/client';
import { HistoryService } from '../common/history/history.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { CreateDocumentoVersaoDto } from './dto/create-documento-versao.dto';
import { CreateDocumentoVinculoDto } from './dto/create-documento-vinculo.dto';
import { QueryDocumentoDto } from './dto/query-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import type { DocumentoEntityType } from './documentos.constants';

const ENTITY_TYPE = 'Documento';

type TargetContext = {
  projetoId: string;
  label: string;
  path: string;
};

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findAll(query: QueryDocumentoDto) {
    const catalogScope: Prisma.DocumentoConhecimentoWhereInput | undefined = query.disponivelParaProjetoId
      ? {
          OR: [
            { projetoId: query.disponivelParaProjetoId },
            { projetoId: { not: query.disponivelParaProjetoId }, versaoPublicada: { not: null }, publicadoEm: { not: null }, status: { not: DocumentoStatus.Arquivado } },
          ],
        }
      : undefined;

    const searchScope: Prisma.DocumentoConhecimentoWhereInput | undefined = query.busca
      ? {
          OR: [
            { titulo: { contains: query.busca, mode: 'insensitive' } },
            { codigo: { contains: query.busca, mode: 'insensitive' } },
            { resumo: { contains: query.busca, mode: 'insensitive' } },
            { responsavel: { contains: query.busca, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const where: Prisma.DocumentoConhecimentoWhereInput = {
      ...(query.projetoId && { projetoId: query.projetoId }),
      ...(query.consumidorProjetoId && { vinculos: { some: { projetoContextoId: query.consumidorProjetoId } } }),
      ...(query.tipo && { tipo: query.tipo }),
      ...(query.status && { status: query.status as DocumentoStatus }),
      ...((catalogScope || searchScope) && { AND: [catalogScope, searchScope].filter(Boolean) as Prisma.DocumentoConhecimentoWhereInput[] }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.documentoConhecimento.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          projeto: { select: { id: true, nome: true, codigo: true } },
          vinculos: { select: { projetoContextoId: true } },
        },
      }),
      this.prisma.documentoConhecimento.count({ where }),
    ]);

    const ids = rows.map((row) => row.id);
    const sourceCounts = ids.length
      ? await this.prisma.fonteVinculo.groupBy({
          by: ['entityId'],
          where: { entityType: ENTITY_TYPE, entityId: { in: ids } },
          _count: { _all: true },
        })
      : [];
    const sourceCountMap = new Map(sourceCounts.map((row) => [row.entityId, row._count._all]));

    return {
      data: rows.map((row) => ({
        ...row,
        vinculosTotal: row.vinculos.length,
        vinculosCrossProject: row.vinculos.filter((vinculo) => vinculo.projetoContextoId !== row.projetoId).length,
        fontesTotal: sourceCountMap.get(row.id) ?? 0,
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

    const docs = await this.prisma.documentoConhecimento.findMany({
      where: { projetoId },
      select: { id: true, status: true, versaoPublicada: true, publicadoEm: true },
    });
    const ids = docs.map((item) => item.id);
    const sourceEntityIds = ids.length
      ? await this.prisma.fonteVinculo.findMany({
          where: { entityType: ENTITY_TYPE, entityId: { in: ids } },
          select: { entityId: true },
          distinct: ['entityId'],
        })
      : [];
    const withSource = new Set(sourceEntityIds.map((item) => item.entityId));

    const [consumosCrossProject, documentosExternosConsumidos] = await Promise.all([
      this.prisma.documentoVinculo.count({
        where: { documento: { projetoId }, projetoContextoId: { not: projetoId } },
      }),
      this.prisma.documentoConhecimento.count({
        where: { projetoId: { not: projetoId }, vinculos: { some: { projetoContextoId: projetoId } } },
      }),
    ]);

    return {
      total: docs.length,
      rascunhos: docs.filter((item) => item.status === DocumentoStatus.Rascunho).length,
      emRevisao: docs.filter((item) => item.status === DocumentoStatus.Revisao).length,
      publicados: docs.filter((item) => item.versaoPublicada !== null && item.publicadoEm !== null).length,
      arquivados: docs.filter((item) => item.status === DocumentoStatus.Arquivado).length,
      semFonte: docs.filter((item) => !withSource.has(item.id)).length,
      consumosCrossProject,
      documentosExternosConsumidos,
    };
  }

  async findOneOrThrow(id: string) {
    const documento = await this.prisma.documentoConhecimento.findUnique({
      where: { id },
      include: {
        projeto: { select: { id: true, nome: true, codigo: true } },
        createdBy: { select: { id: true, nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          take: 20,
          include: { createdBy: { select: { id: true, nome: true } } },
        },
        vinculos: {
          orderBy: { createdAt: 'desc' },
          include: { projetoContexto: { select: { id: true, nome: true, codigo: true } } },
        },
      },
    });
    if (!documento) throw new NotFoundException(`Documento ${id} não encontrado`);

    const [fontesTotal, enrichedLinks, versaoPublicadaSnapshot] = await Promise.all([
      this.prisma.fonteVinculo.count({ where: { entityType: ENTITY_TYPE, entityId: id } }),
      Promise.all(documento.vinculos.map(async (vinculo) => {
        try {
          const target = await this.resolveTarget(vinculo.entityType as DocumentoEntityType, vinculo.entityId);
          return { ...vinculo, entityLabel: target.label, entityPath: target.path, targetAvailable: true };
        } catch {
          return { ...vinculo, entityLabel: 'Registro indisponível', entityPath: null, targetAvailable: false };
        }
      })),
      documento.versaoPublicada
        ? this.prisma.documentoVersao.findUnique({
            where: { documentoId_numero: { documentoId: id, numero: documento.versaoPublicada } },
            include: { createdBy: { select: { id: true, nome: true } } },
          })
        : Promise.resolve(null),
    ]);
    return {
      ...documento,
      versaoPublicadaSnapshot,
      vinculos: enrichedLinks,
      vinculosTotal: documento.vinculos.length,
      vinculosCrossProject: documento.vinculos.filter((vinculo) => vinculo.projetoContextoId !== documento.projetoId).length,
      fontesTotal,
    };
  }

  async create(dto: CreateDocumentoDto, actorUserId?: string) {
    await this.ensureProject(dto.projetoId);
    const status = (dto.status as DocumentoStatus | undefined) ?? DocumentoStatus.Rascunho;
    if (status === DocumentoStatus.Arquivado) throw new BadRequestException('Um novo documento não pode nascer arquivado.');
    this.validatePublication(status, dto.conteudo, dto.responsavel);

    try {
      const documento = await this.prisma.$transaction(async (tx) => {
        const created = await tx.documentoConhecimento.create({
          data: {
            projetoId: dto.projetoId,
            codigo: dto.codigo.trim(),
            titulo: dto.titulo.trim(),
            tipo: dto.tipo.trim(),
            status,
            resumo: dto.resumo?.trim() || null,
            conteudo: dto.conteudo?.trim() || null,
            responsavel: dto.responsavel?.trim() || null,
            versao: 1,
            versaoPublicada: status === DocumentoStatus.Publicado ? 1 : null,
            publicadoEm: status === DocumentoStatus.Publicado ? new Date() : null,
            createdByUserId: actorUserId ?? null,
          },
          include: { projeto: { select: { id: true, nome: true, codigo: true } } },
        });

        await tx.documentoVersao.create({
          data: {
            documentoId: created.id,
            numero: 1,
            titulo: created.titulo,
            resumo: created.resumo,
            conteudo: created.conteudo,
            motivoAlteracao: 'Versão inicial',
            createdByUserId: actorUserId ?? null,
          },
        });
        return created;
      });
      await this.history.record(ENTITY_TYPE, documento.id, `Documento criado: "${documento.titulo}" · v1`, actorUserId);
      return documento;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um documento com esse código neste Projeto.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateDocumentoDto, actorUserId?: string) {
    const atual = await this.findOneOrThrow(id);
    const status = (dto.status as DocumentoStatus | undefined) ?? atual.status;
    const responsavel = dto.responsavel !== undefined ? dto.responsavel.trim() : atual.responsavel;
    this.validatePublication(status, atual.conteudo, responsavel);

    const statusChanged = dto.status !== undefined && status !== atual.status;
    const documento = await this.prisma.documentoConhecimento.update({
      where: { id },
      data: {
        ...(dto.tipo !== undefined && { tipo: dto.tipo.trim() }),
        ...(statusChanged && {
          status,
          ...(status === DocumentoStatus.Publicado && { versaoPublicada: atual.versao, publicadoEm: new Date() }),
          ...(status === DocumentoStatus.Arquivado && { publicadoEm: null }),
        }),
        ...(dto.responsavel !== undefined && { responsavel: responsavel || null }),
      },
      include: { projeto: { select: { id: true, nome: true, codigo: true } } },
    });

    if (statusChanged) {
      await this.history.record(ENTITY_TYPE, id, `Status do documento alterado para "${dto.status}": "${atual.titulo}"`, actorUserId);
    } else {
      await this.history.record(ENTITY_TYPE, id, `Metadados do documento atualizados: "${atual.titulo}"`, actorUserId);
    }
    return documento;
  }

  async createVersion(id: string, dto: CreateDocumentoVersaoDto, actorUserId?: string) {
    const atual = await this.findOneOrThrow(id);
    if (atual.status === DocumentoStatus.Arquivado) {
      throw new BadRequestException('Documento arquivado não recebe novas versões. Reabra-o em revisão antes de editar o conteúdo.');
    }

    const nextVersion = atual.versao + 1;
    const title = dto.titulo?.trim() || atual.titulo;
    const resumo = dto.resumo !== undefined ? dto.resumo.trim() || null : atual.resumo;
    const conteudo = dto.conteudo.trim();
    const nextStatus = atual.status === DocumentoStatus.Publicado ? DocumentoStatus.Revisao : atual.status;

    try {
      const documento = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.documentoConhecimento.update({
          where: { id },
          data: {
            titulo: title,
            resumo,
            conteudo,
            versao: nextVersion,
            status: nextStatus,
            // Se a versão anterior estava publicada, ela continua sendo a versão estável
            // para consumidores enquanto a nova versão passa por revisão.
          },
          include: { projeto: { select: { id: true, nome: true, codigo: true } } },
        });
        await tx.documentoVersao.create({
          data: {
            documentoId: id,
            numero: nextVersion,
            titulo: title,
            resumo,
            conteudo,
            motivoAlteracao: dto.motivoAlteracao?.trim() || null,
            createdByUserId: actorUserId ?? null,
          },
        });
        return updated;
      });

      const suffix = atual.status === DocumentoStatus.Publicado ? ' · publicação anterior preservada; nova versão entrou em revisão' : '';
      await this.history.record(ENTITY_TYPE, id, `Nova versão criada: v${nextVersion} · "${title}"${suffix}`, actorUserId);
      return documento;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Outra versão foi criada ao mesmo tempo. Atualize a página e tente novamente.');
      }
      throw error;
    }
  }

  async listVersions(id: string) {
    await this.ensureDocument(id);
    return this.prisma.documentoVersao.findMany({
      where: { documentoId: id },
      orderBy: { numero: 'desc' },
      include: { createdBy: { select: { id: true, nome: true } } },
    });
  }

  historico(id: string, page = 1, pageSize = 10) {
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  async listLinksByEntity(entityType: DocumentoEntityType, entityId: string) {
    await this.resolveTarget(entityType, entityId);
    return this.prisma.documentoVinculo.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        documento: {
          include: { projeto: { select: { id: true, nome: true, codigo: true } } },
        },
        projetoContexto: { select: { id: true, nome: true, codigo: true } },
      },
    });
  }

  async createLink(documentoId: string, dto: CreateDocumentoVinculoDto, actorUserId?: string) {
    const documento = await this.findOneOrThrow(documentoId);
    const target = await this.resolveTarget(dto.entityType as DocumentoEntityType, dto.entityId);

    if (documento.status === DocumentoStatus.Arquivado) {
      throw new BadRequestException('Documento arquivado não pode receber novos vínculos.');
    }
    const crossProject = target.projetoId !== documento.projetoId;
    if (crossProject && (!documento.versaoPublicada || !documento.publicadoEm)) {
      throw new BadRequestException('Outro Projeto só pode consumir um documento que possua uma versão publicada ativa.');
    }

    try {
      const vinculo = await this.prisma.documentoVinculo.create({
        data: {
          documentoId,
          projetoContextoId: target.projetoId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          contexto: dto.contexto?.trim() || null,
        },
        include: {
          documento: { include: { projeto: { select: { id: true, nome: true, codigo: true } } } },
          projetoContexto: { select: { id: true, nome: true, codigo: true } },
        },
      });
      await Promise.all([
        this.history.record(ENTITY_TYPE, documentoId, `Documento vinculado a ${dto.entityType}: "${target.label}"${crossProject ? ' · cross-project' : ''}`, actorUserId),
        this.history.record(dto.entityType, dto.entityId, `Documento de conhecimento vinculado: "${documento.titulo}"`, actorUserId),
      ]);
      return vinculo;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Este documento já está vinculado a esse conhecimento.');
      }
      throw error;
    }
  }

  async removeLink(documentoId: string, vinculoId: string, actorUserId?: string) {
    const documento = await this.findOneOrThrow(documentoId);
    const vinculo = await this.prisma.documentoVinculo.findFirst({ where: { id: vinculoId, documentoId } });
    if (!vinculo) throw new NotFoundException('Vínculo de documento não encontrado.');
    let targetLabel = 'registro indisponível';
    try {
      targetLabel = (await this.resolveTarget(vinculo.entityType as DocumentoEntityType, vinculo.entityId)).label;
    } catch {
      // Vínculos polimórficos podem sobreviver à remoção do alvo. Ainda assim permitimos limpeza do vínculo.
    }
    await this.prisma.documentoVinculo.delete({ where: { id: vinculo.id } });
    await Promise.all([
      this.history.record(ENTITY_TYPE, documentoId, `Documento desvinculado de ${vinculo.entityType}: "${targetLabel}"`, actorUserId),
      this.history.record(vinculo.entityType, vinculo.entityId, `Documento de conhecimento desvinculado: "${documento.titulo}"`, actorUserId),
    ]);
    return { ok: true };
  }

  private validatePublication(status: DocumentoStatus, conteudo?: string | null, responsavel?: string | null) {
    if (status !== DocumentoStatus.Publicado) return;
    if (!conteudo?.trim()) throw new BadRequestException('Documento publicado precisa ter conteúdo documentado.');
    if (!responsavel?.trim()) throw new BadRequestException('Documento publicado precisa ter um responsável definido.');
  }

  private async ensureProject(id: string) {
    const projeto = await this.prisma.projeto.findUnique({ where: { id }, select: { id: true } });
    if (!projeto) throw new NotFoundException(`Projeto ${id} não encontrado`);
  }

  private async ensureDocument(id: string) {
    const documento = await this.prisma.documentoConhecimento.findUnique({ where: { id }, select: { id: true } });
    if (!documento) throw new NotFoundException(`Documento ${id} não encontrado`);
  }

  private async resolveTarget(entityType: DocumentoEntityType, entityId: string): Promise<TargetContext> {
    switch (entityType) {
      case 'Projeto': {
        const row = await this.prisma.projeto.findUnique({ where: { id: entityId }, select: { id: true, nome: true } });
        if (row) return { projetoId: row.id, label: row.nome, path: `/projetos/${row.id}` };
        break;
      }
      case 'Time': {
        const row = await this.prisma.time.findUnique({ where: { id: entityId }, select: { id: true, nome: true, projetoId: true } });
        if (row) return { projetoId: row.projetoId, label: row.nome, path: `/projetos/${row.projetoId}/times/${row.id}` };
        break;
      }
      case 'Pessoa': {
        const row = await this.prisma.pessoa.findUnique({ where: { id: entityId }, select: { id: true, nome: true, projetoId: true } });
        if (row) return { projetoId: row.projetoId, label: row.nome, path: `/projetos/${row.projetoId}/pessoas/${row.id}` };
        break;
      }
      case 'Produto': {
        const row = await this.prisma.produto.findUnique({ where: { id: entityId }, select: { id: true, nome: true, projetoId: true } });
        if (row) return { projetoId: row.projetoId, label: row.nome, path: `/projetos/${row.projetoId}/produtos/${row.id}` };
        break;
      }
      case 'PublicoAlvo': {
        const row = await this.prisma.publicoAlvo.findUnique({ where: { id: entityId }, select: { id: true, nome: true, produtoId: true, produto: { select: { projetoId: true } } } });
        if (row) return { projetoId: row.produto.projetoId, label: row.nome, path: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/publico-alvo/${row.id}` };
        break;
      }
      case 'Modulo': {
        const row = await this.prisma.modulo.findUnique({ where: { id: entityId }, select: { id: true, nome: true, produtoId: true, produto: { select: { projetoId: true } } } });
        if (row) return { projetoId: row.produto.projetoId, label: row.nome, path: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/modulos/${row.id}` };
        break;
      }
      case 'Funcionalidade': {
        const row = await this.prisma.funcionalidade.findUnique({ where: { id: entityId }, select: { id: true, nome: true, produtoId: true, produto: { select: { projetoId: true } } } });
        if (row) return { projetoId: row.produto.projetoId, label: row.nome, path: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/funcionalidades/${row.id}` };
        break;
      }
      case 'Jornada': {
        const row = await this.prisma.jornada.findUnique({ where: { id: entityId }, select: { id: true, nome: true, produtoId: true, produto: { select: { projetoId: true } } } });
        if (row) return { projetoId: row.produto.projetoId, label: row.nome, path: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/jornadas/${row.id}` };
        break;
      }
      case 'Regra': {
        const row = await this.prisma.regra.findUnique({ where: { id: entityId }, select: { id: true, nome: true, produtoId: true, produto: { select: { projetoId: true } } } });
        if (row) return { projetoId: row.produto.projetoId, label: row.nome, path: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/regras/${row.id}` };
        break;
      }
      case 'Integracao': {
        const row = await this.prisma.integracao.findUnique({ where: { id: entityId }, select: { id: true, nome: true, produtoId: true, produto: { select: { projetoId: true } } } });
        if (row) return { projetoId: row.produto.projetoId, label: row.nome, path: `/projetos/${row.produto.projetoId}/produtos/${row.produtoId}/integracoes/${row.id}` };
        break;
      }
    }
    throw new NotFoundException(`${entityType} ${entityId} não encontrado`);
  }
}
