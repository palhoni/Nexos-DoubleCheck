import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RegraStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreateRegraDto } from './dto/create-regra.dto';
import { UpdateRegraDto } from './dto/update-regra.dto';
import { QueryRegraDto } from './dto/query-regra.dto';

const ENTITY_TYPE = 'Regra';
type ListField = 'excecoes' | 'exemplos';

const RELATIONS_INCLUDE = {
  modulos: { select: { id: true } },
  funcionalidades: { select: { id: true } },
  jornadas: { select: { id: true } },
} satisfies Prisma.RegraInclude;

type RegraWithRelations = Prisma.RegraGetPayload<{ include: typeof RELATIONS_INCLUDE }>;

function serialize(regra: RegraWithRelations) {
  const { modulos, funcionalidades, jornadas, ...rest } = regra;
  return {
    ...rest,
    moduloIds: modulos.map((m) => m.id),
    funcionalidadeIds: funcionalidades.map((f) => f.id),
    jornadaIds: jornadas.map((j) => j.id),
  };
}

@Injectable()
export class RegrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  private async assertProdutoExists(produtoId: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new NotFoundException(`Produto ${produtoId} não encontrado`);
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

  private async assertJornadasBelongToProduto(produtoId: string, jornadaIds: string[] | undefined) {
    if (!jornadaIds?.length) return;
    const count = await this.prisma.jornada.count({ where: { id: { in: jornadaIds }, produtoId } });
    if (count !== new Set(jornadaIds).size) throw new BadRequestException('Uma ou mais jornadas não pertencem a este produto');
  }

  /** Lista só as versões atuais — o usuário pensa em "regras" como uma lista de regras
   *  vigentes, não uma lista de toda linha histórica de cada uma. */
  async findAll(produtoId: string, query: QueryRegraDto) {
    await this.assertProdutoExists(produtoId);
    const where: Prisma.RegraWhereInput = {
      produtoId,
      versaoAtual: true,
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.status && { status: query.status as RegraStatus }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.regra.findMany({
        where,
        include: RELATIONS_INCLUDE,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.regra.count({ where }),
    ]);

    return {
      data: data.map(serialize),
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  }

  async findOneOrThrow(produtoId: string, id: string) {
    const regra = await this.prisma.regra.findFirst({ where: { id, produtoId }, include: RELATIONS_INCLUDE });
    if (!regra) throw new NotFoundException(`Regra ${id} não encontrada`);
    return serialize(regra);
  }

  async create(produtoId: string, dto: CreateRegraDto, actorUserId?: string) {
    await this.assertProdutoExists(produtoId);
    await this.assertModulosBelongToProduto(produtoId, dto.moduloIds);
    await this.assertFuncionalidadesBelongToProduto(produtoId, dto.funcionalidadeIds);
    await this.assertJornadasBelongToProduto(produtoId, dto.jornadaIds);

    const { moduloIds, funcionalidadeIds, jornadaIds, ...rest } = dto;
    const criada = await this.prisma.regra.create({
      data: {
        ...rest,
        produtoId,
        grupoId: '',
        status: (dto.status as RegraStatus) ?? RegraStatus.Ativo,
        modulos: moduloIds ? { connect: moduloIds.map((id) => ({ id })) } : undefined,
        funcionalidades: funcionalidadeIds ? { connect: funcionalidadeIds.map((id) => ({ id })) } : undefined,
        jornadas: jornadaIds ? { connect: jornadaIds.map((id) => ({ id })) } : undefined,
      },
    });
    // grupoId da v1 é o próprio id — só sabemos o id depois do insert.
    const regra = await this.prisma.regra.update({ where: { id: criada.id }, data: { grupoId: criada.id }, include: RELATIONS_INCLUDE });
    await this.history.record(ENTITY_TYPE, regra.id, `Registro criado: "${regra.nome}"`, actorUserId);
    return serialize(regra);
  }

  async update(produtoId: string, id: string, dto: UpdateRegraDto, actorUserId?: string) {
    await this.findOneOrThrow(produtoId, id);
    if (dto.moduloIds !== undefined) await this.assertModulosBelongToProduto(produtoId, dto.moduloIds);
    if (dto.funcionalidadeIds !== undefined) await this.assertFuncionalidadesBelongToProduto(produtoId, dto.funcionalidadeIds);
    if (dto.jornadaIds !== undefined) await this.assertJornadasBelongToProduto(produtoId, dto.jornadaIds);

    const { moduloIds, funcionalidadeIds, jornadaIds, ...rest } = dto;
    const regra = await this.prisma.regra.update({
      where: { id },
      data: {
        ...rest,
        status: dto.status as RegraStatus | undefined,
        modulos: moduloIds !== undefined ? { set: moduloIds.map((mid) => ({ id: mid })) } : undefined,
        funcionalidades: funcionalidadeIds !== undefined ? { set: funcionalidadeIds.map((fid) => ({ id: fid })) } : undefined,
        jornadas: jornadaIds !== undefined ? { set: jornadaIds.map((jid) => ({ id: jid })) } : undefined,
      },
      include: RELATIONS_INCLUDE,
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${regra.nome}"`, actorUserId);
    return serialize(regra);
  }

  async toggleStatus(produtoId: string, id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(produtoId, id);
    const novoStatus: RegraStatus = atual.status === RegraStatus.Ativo ? RegraStatus.Inativo : RegraStatus.Ativo;
    const regra = await this.prisma.regra.update({ where: { id }, data: { status: novoStatus }, include: RELATIONS_INCLUDE });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return serialize(regra);
  }

  async historico(produtoId: string, id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(produtoId, id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  /** Total de regras vigentes de um projeto, somando todos os seus produtos — Regra só
   *  tem produtoId, então precisa desse join para responder "o projeto já tem regra?". */
  async resumoPorProjeto(projetoId: string) {
    if (!projetoId) throw new BadRequestException('projetoId é obrigatório.');
    const projeto = await this.prisma.projeto.findUnique({ where: { id: projetoId }, select: { id: true } });
    if (!projeto) throw new NotFoundException(`Projeto ${projetoId} não encontrado`);

    const total = await this.prisma.regra.count({ where: { versaoAtual: true, produto: { projetoId } } });
    return { total };
  }

  async addListItem(produtoId: string, id: string, field: ListField, valor: string) {
    const regra = await this.findOneOrThrow(produtoId, id);
    const atuais = regra[field];
    if (atuais.includes(valor)) return { [field]: atuais };
    const atualizado = await this.prisma.regra.update({ where: { id }, data: { [field]: { push: valor } } });
    return { [field]: atualizado[field] };
  }

  async removeListItem(produtoId: string, id: string, field: ListField, valor: string) {
    const regra = await this.findOneOrThrow(produtoId, id);
    const atualizado = await this.prisma.regra.update({
      where: { id },
      data: { [field]: regra[field].filter((v) => v !== valor) },
    });
    return { [field]: atualizado[field] };
  }

  /** Cria uma nova versão clonando os campos da versão informada, marcando-a como a nova
   *  versão atual e desmarcando todas as demais linhas do mesmo grupo. */
  async criarNovaVersao(produtoId: string, id: string, actorUserId?: string) {
    const atual = await this.prisma.regra.findFirst({ where: { id, produtoId }, include: RELATIONS_INCLUDE });
    if (!atual) throw new NotFoundException(`Regra ${id} não encontrada`);

    const maxVersao = await this.prisma.regra.aggregate({
      where: { grupoId: atual.grupoId },
      _max: { numeroVersao: true },
    });
    const proximaVersao = (maxVersao._max.numeroVersao ?? atual.numeroVersao) + 1;

    await this.prisma.regra.updateMany({ where: { grupoId: atual.grupoId }, data: { versaoAtual: false } });

    const nova = await this.prisma.regra.create({
      data: {
        produtoId,
        grupoId: atual.grupoId,
        numeroVersao: proximaVersao,
        versaoAtual: true,
        nome: atual.nome,
        status: atual.status,
        condicao: atual.condicao,
        resultadoEsperado: atual.resultadoEsperado,
        excecoes: atual.excecoes,
        exemplos: atual.exemplos,
        prioridade: atual.prioridade,
        vigenciaInicio: atual.vigenciaInicio,
        vigenciaFim: atual.vigenciaFim,
        observacoes: atual.observacoes,
        modulos: { connect: atual.modulos.map((m) => ({ id: m.id })) },
        funcionalidades: { connect: atual.funcionalidades.map((f) => ({ id: f.id })) },
        jornadas: { connect: atual.jornadas.map((j) => ({ id: j.id })) },
      },
      include: RELATIONS_INCLUDE,
    });
    await this.history.record(ENTITY_TYPE, nova.id, `Nova versão criada (v${proximaVersao}, a partir da v${atual.numeroVersao})`, actorUserId);
    await this.history.record(ENTITY_TYPE, atual.id, `Substituída pela v${proximaVersao}`, actorUserId);
    return serialize(nova);
  }

  /** Lista resumida de todas as versões do mesmo grupo (para o seletor de versões da UI). */
  async listarVersoes(produtoId: string, id: string) {
    const atual = await this.findOneOrThrow(produtoId, id);
    const versoes = await this.prisma.regra.findMany({
      where: { grupoId: atual.grupoId, produtoId },
      orderBy: { numeroVersao: 'asc' },
      select: { id: true, numeroVersao: true, versaoAtual: true, nome: true, status: true, createdAt: true },
    });
    return versoes;
  }
}
