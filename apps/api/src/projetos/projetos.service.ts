import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjetoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { QueryProjetoDto } from './dto/query-projeto.dto';

const ENTITY_TYPE = 'Projeto';

@Injectable()
export class ProjetosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findAll(query: QueryProjetoDto) {
    const where: Prisma.ProjetoWhereInput = {
      ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
      ...(query.areaNegocio && { areaNegocio: query.areaNegocio }),
      ...(query.status && { status: query.status as ProjetoStatus }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.projeto.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.projeto.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async findOneOrThrow(id: string) {
    const projeto = await this.prisma.projeto.findUnique({ where: { id } });
    if (!projeto) throw new NotFoundException(`Projeto ${id} não encontrado`);
    return projeto;
  }

  /**
   * Visão derivada do ecossistema do Projeto.
   * Não cria relacionamento paralelo: usa Integrações reais entre Produtos como fonte da verdade.
   * Uma conexão é cross-project quando origem e destino pertencem a Projetos diferentes.
   */
  async ecossistema(id: string) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      select: { id: true, nome: true, codigo: true, status: true, areaNegocio: true },
    });
    if (!projeto) throw new NotFoundException(`Projeto ${id} não encontrado`);

    const produtosDoProjeto = await this.prisma.produto.findMany({
      where: { projetoId: id },
      select: { id: true },
    });
    const produtoIds = produtosDoProjeto.map((produto) => produto.id);

    if (produtoIds.length === 0) {
      return {
        projeto: { ...projeto, principal: true },
        projetosRelacionados: [],
        conexoes: [],
        resumo: {
          totalConexoes: 0,
          conexoesCrossProject: 0,
          projetosRelacionados: 0,
          produtosDoProjetoConectados: 0,
          entradas: 0,
          saidas: 0,
          altaCriticidade: 0,
        },
      };
    }

    const integracoes = await this.prisma.integracao.findMany({
      where: {
        OR: [
          { produtoId: { in: produtoIds } },
          { produtoRelacionadoId: { in: produtoIds } },
        ],
        produtoRelacionadoId: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        nome: true,
        status: true,
        tipo: true,
        modo: true,
        criticidade: true,
        direcao: true,
        papelDependencia: true,
        dadosTrafegados: true,
        produtoId: true,
        produto: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            projetoId: true,
            projeto: { select: { id: true, nome: true, codigo: true, status: true, areaNegocio: true } },
          },
        },
        produtoRelacionadoId: true,
        produtoRelacionado: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            projetoId: true,
            projeto: { select: { id: true, nome: true, codigo: true, status: true, areaNegocio: true } },
          },
        },
      },
    });

    const projetosRelacionados = new Map<string, { id: string; nome: string; codigo: string; status: ProjetoStatus; areaNegocio: string | null; principal: boolean }>();
    const produtosConectados = new Set<string>();
    let entradas = 0;
    let saidas = 0;
    let altaCriticidade = 0;
    let conexoesCrossProject = 0;

    const conexoes = integracoes.flatMap((integracao) => {
      const destino = integracao.produtoRelacionado;
      if (!destino) return [];

      const origemProjeto = integracao.produto.projeto;
      const destinoProjeto = destino.projeto;
      const crossProject = origemProjeto.id !== destinoProjeto.id;

      if (origemProjeto.id === id) {
        saidas += 1;
        produtosConectados.add(integracao.produto.id);
      }
      if (destinoProjeto.id === id) {
        entradas += 1;
        produtosConectados.add(destino.id);
      }
      if (integracao.criticidade === 'Alta') altaCriticidade += 1;
      if (crossProject) conexoesCrossProject += 1;

      for (const projetoRelacionado of [origemProjeto, destinoProjeto]) {
        if (projetoRelacionado.id !== id) {
          projetosRelacionados.set(projetoRelacionado.id, { ...projetoRelacionado, principal: false });
        }
      }

      return [{
        id: integracao.id,
        nome: integracao.nome,
        status: integracao.status,
        tipo: integracao.tipo,
        modo: integracao.modo,
        criticidade: integracao.criticidade,
        direcao: integracao.direcao,
        papelDependencia: integracao.papelDependencia,
        dadosTrafegados: integracao.dadosTrafegados,
        crossProject,
        origem: {
          id: integracao.produto.id,
          nome: integracao.produto.nome,
          codigo: integracao.produto.codigo,
          projetoId: origemProjeto.id,
          projetoNome: origemProjeto.nome,
        },
        destino: {
          id: destino.id,
          nome: destino.nome,
          codigo: destino.codigo,
          projetoId: destinoProjeto.id,
          projetoNome: destinoProjeto.nome,
        },
      }];
    });

    return {
      projeto: { ...projeto, principal: true },
      projetosRelacionados: [...projetosRelacionados.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
      conexoes,
      resumo: {
        totalConexoes: conexoes.length,
        conexoesCrossProject,
        projetosRelacionados: projetosRelacionados.size,
        produtosDoProjetoConectados: produtosConectados.size,
        entradas,
        saidas,
        altaCriticidade,
      },
    };
  }

  async create(dto: CreateProjetoDto, actorUserId?: string) {
    const projeto = await this.prisma.projeto.create({
      data: { ...dto, status: (dto.status as ProjetoStatus) ?? ProjetoStatus.Ativo },
    });
    await this.history.record(ENTITY_TYPE, projeto.id, `Registro criado: "${projeto.nome}"`, actorUserId);
    return projeto;
  }

  async update(id: string, dto: UpdateProjetoDto, actorUserId?: string) {
    await this.findOneOrThrow(id);
    const projeto = await this.prisma.projeto.update({
      where: { id },
      data: { ...dto, status: dto.status as ProjetoStatus | undefined },
    });
    await this.history.record(ENTITY_TYPE, id, `Registro editado: "${projeto.nome}"`, actorUserId);
    return projeto;
  }

  async toggleStatus(id: string, actorUserId?: string) {
    const atual = await this.findOneOrThrow(id);
    const novoStatus: ProjetoStatus = atual.status === ProjetoStatus.Ativo ? ProjetoStatus.Inativo : ProjetoStatus.Ativo;
    const projeto = await this.prisma.projeto.update({ where: { id }, data: { status: novoStatus } });
    await this.history.record(ENTITY_TYPE, id, `Status alterado para "${novoStatus}": "${atual.nome}"`, actorUserId);
    return projeto;
  }

  async historico(id: string, page = 1, pageSize = 10) {
    await this.findOneOrThrow(id);
    return this.history.list(ENTITY_TYPE, id, page, pageSize);
  }

  async addPais(id: string, valor: string) {
    const projeto = await this.findOneOrThrow(id);
    if (projeto.paisesDisponiveis.includes(valor)) return { paisesDisponiveis: projeto.paisesDisponiveis };
    const atualizado = await this.prisma.projeto.update({
      where: { id },
      data: { paisesDisponiveis: { push: valor } },
    });
    return { paisesDisponiveis: atualizado.paisesDisponiveis };
  }

  async removePais(id: string, valor: string) {
    const projeto = await this.findOneOrThrow(id);
    const atualizado = await this.prisma.projeto.update({
      where: { id },
      data: { paisesDisponiveis: projeto.paisesDisponiveis.filter((v) => v !== valor) },
    });
    return { paisesDisponiveis: atualizado.paisesDisponiveis };
  }

  async addFonte(id: string, valor: string) {
    const projeto = await this.findOneOrThrow(id);
    if (projeto.fontesGerais.includes(valor)) return { fontesGerais: projeto.fontesGerais };
    const atualizado = await this.prisma.projeto.update({
      where: { id },
      data: { fontesGerais: { push: valor } },
    });
    return { fontesGerais: atualizado.fontesGerais };
  }

  async removeFonte(id: string, valor: string) {
    const projeto = await this.findOneOrThrow(id);
    const atualizado = await this.prisma.projeto.update({
      where: { id },
      data: { fontesGerais: projeto.fontesGerais.filter((v) => v !== valor) },
    });
    return { fontesGerais: atualizado.fontesGerais };
  }
}
