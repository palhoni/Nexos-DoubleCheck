import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

type Pending = {
  id: string;
  kind: 'source-review' | 'document-review' | 'project-ownership' | 'product-ownership' | 'module-ownership' | 'function-ownership';
  priority: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  projectId: string;
  projectName: string;
  route: string;
};

type OwnerIdentity = {
  nome?: string | null;
  email: string;
};

@Injectable()
export class MinhaAreaService {
  constructor(private readonly prisma: PrismaService) {}

  private ownerMatches(value: string | null | undefined, user: OwnerIdentity) {
    if (!value) return false;
    const normalized = value.trim().toLocaleLowerCase('pt-BR');
    const candidates = [user.nome, user.email].filter(Boolean).map((item) => String(item).trim().toLocaleLowerCase('pt-BR'));
    return candidates.some((candidate) => candidate && (normalized === candidate || normalized.includes(candidate)));
  }

  async resumo(authUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: authUser.userId }, select: { id: true, nome: true, email: true } });
    const now = new Date();
    const staleLimit = new Date(now);
    staleLimit.setDate(staleLimit.getDate() - 90);

    const pessoas = await this.prisma.pessoa.findMany({
      where: { emailCorporativo: { equals: user.email, mode: 'insensitive' } },
      include: { projeto: { select: { id: true, nome: true, codigo: true } }, time: { select: { id: true, nome: true } } },
    });
    const [projects, products, modules, functions, sources, documents, recentActivity] = await Promise.all([
      this.prisma.projeto.findMany({ select: { id: true, nome: true, codigo: true, responsavelPrincipal: true } }),
      this.prisma.produto.findMany({ include: { projeto: { select: { id: true, nome: true } } } }),
      this.prisma.modulo.findMany({ include: { produto: { include: { projeto: { select: { id: true, nome: true } } } } } }),
      this.prisma.funcionalidade.findMany({ include: { produto: { include: { projeto: { select: { id: true, nome: true } } } } } }),
      this.prisma.fonteConhecimento.findMany({ include: { projeto: { select: { id: true, nome: true } } } }),
      this.prisma.documentoConhecimento.findMany({ include: { projeto: { select: { id: true, nome: true } } } }),
      this.prisma.historyEntry.findMany({
        where: { actorUserId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, entityType: true, entityId: true, label: true, createdAt: true },
      }),
    ]);

    const pendings: Pending[] = [];
    const push = (item: Pending) => pendings.push(item);

    for (const source of sources) {
      if (!this.ownerMatches(source.responsavel, user)) continue;
      const stale = !source.ultimaVerificacao || source.ultimaVerificacao < staleLimit;
      if (source.status === 'Revisao' || stale) {
        push({
          id: `source:${source.id}`,
          kind: 'source-review',
          priority: source.oficial && stale ? 'critical' : 'warning',
          title: stale ? 'Fonte sob sua responsabilidade precisa de verificação' : 'Fonte sob sua responsabilidade está em revisão',
          description: stale ? `${source.nome} não possui verificação registrada nos últimos 90 dias.` : `${source.nome} permanece com status de revisão.`,
          entityType: 'Fonte', entityId: source.id, projectId: source.projeto.id, projectName: source.projeto.nome,
          route: `/projetos/${source.projeto.id}/fontes?fonte=${source.id}`,
        });
      }
    }

    for (const document of documents) {
      if (!this.ownerMatches(document.responsavel, user)) continue;
      if (document.status === 'Revisao' || document.status === 'Rascunho') {
        push({
          id: `document:${document.id}`,
          kind: 'document-review',
          priority: document.status === 'Revisao' ? 'warning' : 'info',
          title: document.status === 'Revisao' ? 'Documento sob sua responsabilidade aguarda publicação' : 'Documento sob sua responsabilidade está em rascunho',
          description: `${document.codigo} · ${document.titulo} · versão ${document.versao}.`,
          entityType: 'Documento', entityId: document.id, projectId: document.projeto.id, projectName: document.projeto.nome,
          route: `/projetos/${document.projeto.id}/documentos/${document.id}`,
        });
      }
    }

    const ownedProjects = projects.filter((item) => this.ownerMatches(item.responsavelPrincipal, user));
    const ownedProducts = products.filter((item) => this.ownerMatches(item.responsavelPrincipal, user));
    const ownedModules = modules.filter((item) => this.ownerMatches(item.responsavelPrincipal, user));
    const ownedFunctions = functions.filter((item) => this.ownerMatches(item.responsavelPrincipal, user));

    const linkedProjects = new Map<string, { id: string; nome: string; codigo?: string; reasons: string[] }>();
    for (const pessoa of pessoas) linkedProjects.set(pessoa.projeto.id, { ...pessoa.projeto, reasons: ['Pessoa vinculada ao Projeto'] });
    for (const project of ownedProjects) {
      const current = linkedProjects.get(project.id) ?? { id: project.id, nome: project.nome, codigo: project.codigo, reasons: [] };
      current.reasons.push('Responsável principal'); linkedProjects.set(project.id, current);
    }
    for (const product of ownedProducts) {
      const current = linkedProjects.get(product.projeto.id) ?? { id: product.projeto.id, nome: product.projeto.nome, reasons: [] };
      current.reasons.push(`Responsável por Produto: ${product.nome}`); linkedProjects.set(product.projeto.id, current);
    }

    pendings.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.priority] - { critical: 0, warning: 1, info: 2 }[b.priority]));

    return {
      identity: {
        userId: user.id,
        nome: user.nome,
        email: user.email,
        pessoaLinked: pessoas.length > 0,
        pessoaIds: pessoas.map((item) => item.id),
        teams: pessoas.filter((item) => item.time).map((item) => ({ id: item.time!.id, nome: item.time!.nome, projetoId: item.projetoId })),
      },
      summary: {
        pending: pendings.length,
        critical: pendings.filter((item) => item.priority === 'critical').length,
        sourcesToReview: pendings.filter((item) => item.kind === 'source-review').length,
        documentsToReview: pendings.filter((item) => item.kind === 'document-review').length,
        projects: linkedProjects.size,
        ownedKnowledge: ownedProducts.length + ownedModules.length + ownedFunctions.length + sources.filter((item) => this.ownerMatches(item.responsavel, user)).length + documents.filter((item) => this.ownerMatches(item.responsavel, user)).length,
      },
      pendings,
      responsibilities: {
        projects: ownedProjects.map((item) => ({ id: item.id, nome: item.nome, projectId: item.id, projectName: item.nome, route: `/projetos/${item.id}` })),
        products: ownedProducts.map((item) => ({ id: item.id, nome: item.nome, projectId: item.projeto.id, projectName: item.projeto.nome, route: `/projetos/${item.projeto.id}/produtos/${item.id}` })),
        modules: ownedModules.map((item) => ({ id: item.id, nome: item.nome, projectId: item.produto.projeto.id, projectName: item.produto.projeto.nome, route: `/projetos/${item.produto.projeto.id}/produtos/${item.produtoId}/modulos/${item.id}` })),
        functions: ownedFunctions.map((item) => ({ id: item.id, nome: item.nome, projectId: item.produto.projeto.id, projectName: item.produto.projeto.nome, route: `/projetos/${item.produto.projeto.id}/produtos/${item.produtoId}/funcionalidades/${item.id}` })),
      },
      projects: [...linkedProjects.values()],
      recentActivity: recentActivity.map((item) => ({ id: item.id, entity: item.entityType, entityId: item.entityId, action: item.label, description: item.label, createdAt: item.createdAt.toISOString() })),
      generatedAt: now.toISOString(),
      linkageNote: pessoas.length
        ? null
        : 'Seu usuário ainda não está vinculado a uma Pessoa pelo mesmo e-mail corporativo. A área continua mostrando responsabilidades explícitas pelo seu nome/e-mail, mas o contexto de Time e Projeto pode ficar incompleto.',
    };
  }
}
