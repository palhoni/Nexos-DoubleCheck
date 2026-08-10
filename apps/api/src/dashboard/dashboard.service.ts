import { Injectable } from '@nestjs/common';
import { ProjetoStatus, TimeStatus, PessoaStatus, ProdutoStatus, RegraStatus, IntegracaoStatus, DocumentoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../common/history/history.service';

export interface Pendencia {
  produtoId: string;
  projetoId: string;
  produtoNome: string;
  descricao: string;
  prioridade: 'Alta' | 'Média';
}

const ORDEM_PRIORIDADE: Record<Pendencia['prioridade'], number> = { Alta: 0, Média: 1 };

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  /** Contagens ativos/inativos por entidade-chave — alimenta os cards de estatística da Home. */
  async resumo() {
    const [
      projetosTotal,
      projetosAtivos,
      projetosInativos,
      timesTotal,
      timesAtivos,
      timesInativos,
      pessoasTotal,
      pessoasAtivas,
      pessoasInativas,
      produtosTotal,
      produtosAtivos,
      produtosInativos,
      regrasTotal,
      regrasAtivas,
      integracoesTotal,
      integracoesAtivas,
      documentosTotal,
      documentosPublicados,
    ] = await Promise.all([
      this.prisma.projeto.count(),
      this.prisma.projeto.count({ where: { status: ProjetoStatus.Ativo } }),
      this.prisma.projeto.count({ where: { status: ProjetoStatus.Inativo } }),
      this.prisma.time.count(),
      this.prisma.time.count({ where: { status: TimeStatus.Ativo } }),
      this.prisma.time.count({ where: { status: TimeStatus.Inativo } }),
      this.prisma.pessoa.count(),
      this.prisma.pessoa.count({ where: { status: PessoaStatus.Ativo } }),
      this.prisma.pessoa.count({ where: { status: PessoaStatus.Inativo } }),
      this.prisma.produto.count(),
      this.prisma.produto.count({ where: { status: ProdutoStatus.Ativo } }),
      this.prisma.produto.count({ where: { status: ProdutoStatus.Inativo } }),
      this.prisma.regra.count({ where: { versaoAtual: true } }),
      this.prisma.regra.count({ where: { versaoAtual: true, status: RegraStatus.Ativo } }),
      this.prisma.integracao.count(),
      this.prisma.integracao.count({ where: { status: IntegracaoStatus.Ativo } }),
      this.prisma.documentoConhecimento.count(),
      this.prisma.documentoConhecimento.count({ where: { status: DocumentoStatus.Publicado } }),
    ]);

    const percent = (ready: number, total: number) => total > 0 ? Math.round((ready / total) * 100) : 0;

    return {
      projetos: { total: projetosTotal, ativos: projetosAtivos, inativos: projetosInativos },
      times: { total: timesTotal, ativos: timesAtivos, inativos: timesInativos },
      pessoas: { total: pessoasTotal, ativos: pessoasAtivas, inativos: pessoasInativas },
      produtos: { total: produtosTotal, ativos: produtosAtivos, inativos: produtosInativos },
      prontidao: {
        produtos: percent(produtosTotal - produtosInativos, produtosTotal),
        regras: percent(regrasAtivas, regrasTotal),
        integracoes: percent(integracoesAtivas, integracoesTotal),
        documentos: percent(documentosPublicados, documentosTotal),
      },
    };
  }

  async atividadeRecente(limit = 8) {
    return this.history.listGlobal(limit);
  }

  /** Gera pendências reais a partir dos mesmos critérios do cálculo de Maturidade
   *  (produtos.service.ts#calcularMaturidade) — nenhum dado inventado, só agregado
   *  em formato de lista acionável para a Home. */
  async pendenciasDocumentacao(limit = 6) {
    const produtos = await this.prisma.produto.findMany({
      select: {
        id: true,
        nome: true,
        projetoId: true,
        timeResponsavelId: true,
        _count: { select: { publicosAlvo: true, jornadas: true } },
        modulos: { select: { id: true, nome: true, _count: { select: { funcionalidades: true } } } },
        funcionalidades: { select: { id: true, nome: true, _count: { select: { regras: true } } } },
      },
    });

    const pendencias: Pendencia[] = [];

    for (const p of produtos) {
      if (!p.timeResponsavelId) {
        pendencias.push({ produtoId: p.id, projetoId: p.projetoId, produtoNome: p.nome, descricao: `Produto "${p.nome}" sem Time responsável`, prioridade: 'Alta' });
      }
      if (p._count.publicosAlvo === 0) {
        pendencias.push({ produtoId: p.id, projetoId: p.projetoId, produtoNome: p.nome, descricao: `Produto "${p.nome}" sem Público-alvo definido`, prioridade: 'Alta' });
      }
      if (p._count.jornadas === 0) {
        pendencias.push({ produtoId: p.id, projetoId: p.projetoId, produtoNome: p.nome, descricao: `Produto "${p.nome}" sem Jornada mapeada`, prioridade: 'Média' });
      }
      for (const m of p.modulos) {
        if (m._count.funcionalidades === 0) {
          pendencias.push({ produtoId: p.id, projetoId: p.projetoId, produtoNome: p.nome, descricao: `Módulo "${m.nome}" (${p.nome}) sem Funcionalidade vinculada`, prioridade: 'Média' });
        }
      }
      for (const f of p.funcionalidades) {
        if (f._count.regras === 0) {
          pendencias.push({ produtoId: p.id, projetoId: p.projetoId, produtoNome: p.nome, descricao: `Funcionalidade "${f.nome}" (${p.nome}) sem Regra vinculada`, prioridade: 'Média' });
        }
      }
    }

    pendencias.sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade]);
    return { total: pendencias.length, itens: pendencias.slice(0, limit) };
  }
}
