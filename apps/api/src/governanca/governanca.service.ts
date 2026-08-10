import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Severity = 'critical' | 'warning' | 'info';
type EntityType = 'Projeto' | 'Produto' | 'PublicoAlvo' | 'Modulo' | 'Funcionalidade' | 'Jornada' | 'Regra' | 'Integracao' | 'Fonte' | 'Documento';

interface KnowledgeEntity {
  type: EntityType;
  id: string;
  label: string;
  projectId: string;
  route: string;
  ownerOk: boolean;
}

export interface GovernanceIssue {
  id: string;
  severity: Severity;
  category: 'evidence' | 'ownership' | 'freshness' | 'publication' | 'consistency';
  title: string;
  description: string;
  entityType: EntityType;
  entityId: string;
  projectId: string;
  route: string;
}

function percent(ok: number, total: number) {
  return total > 0 ? Math.round((ok / total) * 100) : 100;
}

function isBlank(value: unknown) {
  return typeof value !== 'string' || !value.trim();
}

@Injectable()
export class GovernancaService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo(projetoId?: string) {
    if (projetoId) {
      const exists = await this.prisma.projeto.findUnique({ where: { id: projetoId }, select: { id: true } });
      if (!exists) throw new NotFoundException(`Projeto ${projetoId} não encontrado`);
    }

    const [
      projects,
      products,
      audiences,
      modules,
      features,
      journeys,
      rules,
      integrations,
      sources,
      sourceLinks,
      documents,
      documentLinks,
    ] = await Promise.all([
      this.prisma.projeto.findMany({
        where: projetoId ? { id: projetoId } : undefined,
        select: { id: true, nome: true, codigo: true, status: true, responsavelPrincipal: true },
        orderBy: { nome: 'asc' },
      }),
      this.prisma.produto.findMany({
        where: projetoId ? { projetoId } : undefined,
        select: { id: true, projetoId: true, nome: true, responsavelPrincipal: true, timeResponsavelId: true },
      }),
      this.prisma.publicoAlvo.findMany({
        where: projetoId ? { produto: { projetoId } } : undefined,
        select: { id: true, nome: true, produtoId: true, produto: { select: { projetoId: true } } },
      }),
      this.prisma.modulo.findMany({
        where: projetoId ? { produto: { projetoId } } : undefined,
        select: { id: true, nome: true, responsavelPrincipal: true, produtoId: true, produto: { select: { projetoId: true } } },
      }),
      this.prisma.funcionalidade.findMany({
        where: projetoId ? { produto: { projetoId } } : undefined,
        select: { id: true, nome: true, responsavelPrincipal: true, produtoId: true, produto: { select: { projetoId: true } } },
      }),
      this.prisma.jornada.findMany({
        where: projetoId ? { produto: { projetoId } } : undefined,
        select: { id: true, nome: true, produtoId: true, produto: { select: { projetoId: true } } },
      }),
      this.prisma.regra.findMany({
        where: { ...(projetoId ? { produto: { projetoId } } : {}), versaoAtual: true },
        select: {
          id: true,
          nome: true,
          produtoId: true,
          condicao: true,
          resultadoEsperado: true,
          prioridade: true,
          produto: { select: { projetoId: true } },
          modulos: { select: { id: true } },
          funcionalidades: { select: { id: true } },
          jornadas: { select: { id: true } },
        },
      }),
      this.prisma.integracao.findMany({
        where: projetoId ? { OR: [{ produto: { projetoId } }, { produtoRelacionado: { projetoId } }] } : undefined,
        select: {
          id: true,
          nome: true,
          produtoId: true,
          timeProprietarioId: true,
          produto: { select: { projetoId: true } },
          produtoRelacionado: { select: { projetoId: true } },
          funcionalidades: { select: { id: true } },
        },
      }),
      this.prisma.fonteConhecimento.findMany({
        where: projetoId ? { OR: [{ projetoId }, { vinculos: { some: { projetoContextoId: projetoId } } }] } : undefined,
        select: { id: true, projetoId: true, nome: true, status: true, oficial: true, responsavel: true, ultimaVerificacao: true },
      }),
      this.prisma.fonteVinculo.findMany({
        where: projetoId ? { projetoContextoId: projetoId } : undefined,
        select: { fonteId: true, projetoContextoId: true, entityType: true, entityId: true, fonte: { select: { projetoId: true } } },
      }),
      this.prisma.documentoConhecimento.findMany({
        where: projetoId ? { OR: [{ projetoId }, { vinculos: { some: { projetoContextoId: projetoId } } }] } : undefined,
        select: { id: true, projetoId: true, codigo: true, titulo: true, status: true, responsavel: true, versaoPublicada: true },
      }),
      this.prisma.documentoVinculo.findMany({
        where: projetoId ? { projetoContextoId: projetoId } : undefined,
        select: { documentoId: true, projetoContextoId: true, entityType: true, entityId: true, documento: { select: { projetoId: true } } },
      }),
    ]);

    const projectById = new Map(projects.map((project) => [project.id, project]));
    const entities: KnowledgeEntity[] = [];

    projects.forEach((project) => entities.push({
      type: 'Projeto', id: project.id, label: project.nome, projectId: project.id,
      route: `/projetos/${project.id}`, ownerOk: !isBlank(project.responsavelPrincipal),
    }));
    products.forEach((product) => entities.push({
      type: 'Produto', id: product.id, label: product.nome, projectId: product.projetoId,
      route: `/projetos/${product.projetoId}/produtos/${product.id}`,
      ownerOk: !!product.timeResponsavelId || !isBlank(product.responsavelPrincipal),
    }));
    audiences.forEach((item) => entities.push({
      type: 'PublicoAlvo', id: item.id, label: item.nome, projectId: item.produto.projetoId,
      route: `/projetos/${item.produto.projetoId}/produtos/${item.produtoId}/publico-alvo/${item.id}`,
      ownerOk: true,
    }));
    modules.forEach((item) => entities.push({
      type: 'Modulo', id: item.id, label: item.nome, projectId: item.produto.projetoId,
      route: `/projetos/${item.produto.projetoId}/produtos/${item.produtoId}/modulos/${item.id}`,
      ownerOk: !isBlank(item.responsavelPrincipal),
    }));
    features.forEach((item) => entities.push({
      type: 'Funcionalidade', id: item.id, label: item.nome, projectId: item.produto.projetoId,
      route: `/projetos/${item.produto.projetoId}/produtos/${item.produtoId}/funcionalidades/${item.id}`,
      ownerOk: !isBlank(item.responsavelPrincipal),
    }));
    journeys.forEach((item) => entities.push({
      type: 'Jornada', id: item.id, label: item.nome, projectId: item.produto.projetoId,
      route: `/projetos/${item.produto.projetoId}/produtos/${item.produtoId}/jornadas/${item.id}`,
      ownerOk: true,
    }));
    rules.forEach((item) => entities.push({
      type: 'Regra', id: item.id, label: item.nome, projectId: item.produto.projetoId,
      route: `/projetos/${item.produto.projetoId}/produtos/${item.produtoId}/regras/${item.id}`,
      ownerOk: true,
    }));
    integrations.forEach((item) => {
      const ownerProjectId = item.produto.projetoId;
      entities.push({
        type: 'Integracao', id: item.id, label: item.nome, projectId: ownerProjectId,
        route: `/projetos/${ownerProjectId}/produtos/${item.produtoId}/integracoes/${item.id}`,
        ownerOk: !!item.timeProprietarioId,
      });
    });

    const evidenceKeys = new Set<string>();
    sourceLinks.forEach((link) => evidenceKeys.add(`${link.entityType}:${link.entityId}`));
    documentLinks.forEach((link) => evidenceKeys.add(`${link.entityType}:${link.entityId}`));

    const governedEntities = entities.filter((entity) => !['Projeto', 'PublicoAlvo'].includes(entity.type));
    const entitiesWithEvidence = governedEntities.filter((entity) => evidenceKeys.has(`${entity.type}:${entity.id}`));
    const ownerTracked = entities.filter((entity) => ['Projeto', 'Produto', 'Modulo', 'Funcionalidade', 'Integracao'].includes(entity.type));
    const ownerOk = ownerTracked.filter((entity) => entity.ownerOk);

    const now = Date.now();
    const staleThreshold = now - 90 * 24 * 60 * 60 * 1000;
    const activeSources = sources.filter((source) => source.status === 'Ativa');
    const freshSources = activeSources.filter((source) => source.ultimaVerificacao && source.ultimaVerificacao.getTime() >= staleThreshold);
    const staleSources = activeSources.filter((source) => !source.ultimaVerificacao || source.ultimaVerificacao.getTime() < staleThreshold);
    const publishedDocuments = documents.filter((document) => document.status === 'Publicado' && document.versaoPublicada != null);
    const documentsPending = documents.filter((document) => document.status === 'Revisao' || document.status === 'Rascunho');

    const crossProjectIntegrations = integrations.filter((item) => item.produtoRelacionado && item.produtoRelacionado.projetoId !== item.produto.projetoId);
    const externalSourceLinks = sourceLinks.filter((link) => link.fonte.projetoId !== link.projetoContextoId);
    const externalDocumentLinks = documentLinks.filter((link) => link.documento.projetoId !== link.projetoContextoId);

    const issues: GovernanceIssue[] = [];
    governedEntities.forEach((entity) => {
      if (!evidenceKeys.has(`${entity.type}:${entity.id}`)) {
        issues.push({
          id: `evidence:${entity.type}:${entity.id}`, severity: 'warning', category: 'evidence',
          title: `${entity.type} sem evidência direta`,
          description: `“${entity.label}” ainda não possui Fonte ou Documento diretamente vinculado.`,
          entityType: entity.type, entityId: entity.id, projectId: entity.projectId, route: entity.route,
        });
      }
    });
    ownerTracked.forEach((entity) => {
      if (!entity.ownerOk) {
        issues.push({
          id: `owner:${entity.type}:${entity.id}`, severity: 'warning', category: 'ownership',
          title: `${entity.type} sem responsável claro`,
          description: `“${entity.label}” não possui responsável/time proprietário definido.`,
          entityType: entity.type, entityId: entity.id, projectId: entity.projectId, route: entity.route,
        });
      }
    });
    staleSources.forEach((source) => {
      issues.push({
        id: `source-stale:${source.id}`, severity: source.oficial ? 'critical' : 'warning', category: 'freshness',
        title: source.oficial ? 'Fonte oficial precisa de verificação' : 'Fonte precisa de verificação',
        description: source.ultimaVerificacao
          ? `“${source.nome}” não é verificada há mais de 90 dias.`
          : `“${source.nome}” ainda não possui data de verificação.`,
        entityType: 'Fonte', entityId: source.id, projectId: source.projetoId, route: `/projetos/${source.projetoId}/fontes?fonte=${source.id}`,
      });
    });
    sources.filter((source) => source.oficial && isBlank(source.responsavel)).forEach((source) => {
      issues.push({
        id: `source-owner:${source.id}`, severity: 'critical', category: 'ownership',
        title: 'Fonte oficial sem responsável',
        description: `“${source.nome}” está marcada como oficial, mas não possui responsável documentado.`,
        entityType: 'Fonte', entityId: source.id, projectId: source.projetoId, route: `/projetos/${source.projetoId}/fontes?fonte=${source.id}`,
      });
    });
    documentsPending.forEach((document) => {
      issues.push({
        id: `document-pending:${document.id}`, severity: document.status === 'Revisao' ? 'warning' : 'info', category: 'publication',
        title: document.status === 'Revisao' ? 'Documento aguardando revisão' : 'Documento em rascunho',
        description: `“${document.titulo}” está com status ${document.status}.`,
        entityType: 'Documento', entityId: document.id, projectId: document.projetoId,
        route: `/projetos/${document.projetoId}/documentos/${document.id}`,
      });
    });
    documents.filter((document) => document.status === 'Publicado' && document.versaoPublicada == null).forEach((document) => {
      issues.push({
        id: `document-published:${document.id}`, severity: 'critical', category: 'consistency',
        title: 'Documento publicado sem versão publicada',
        description: `“${document.titulo}” está Publicado, mas não possui versaoPublicada registrada.`,
        entityType: 'Documento', entityId: document.id, projectId: document.projetoId,
        route: `/projetos/${document.projetoId}/documentos/${document.id}`,
      });
    });
    rules.filter((rule) => isBlank(rule.condicao) || isBlank(rule.resultadoEsperado) || isBlank(rule.prioridade) || (rule.modulos.length + rule.funcionalidades.length + rule.jornadas.length === 0)).forEach((rule) => {
      issues.push({
        id: `rule-incomplete:${rule.id}`, severity: 'warning', category: 'consistency',
        title: 'Regra com documentação essencial incompleta',
        description: `“${rule.nome}” precisa revisar condição, resultado, prioridade ou relacionamentos estruturados.`,
        entityType: 'Regra', entityId: rule.id, projectId: rule.produto.projetoId,
        route: `/projetos/${rule.produto.projetoId}/produtos/${rule.produtoId}/regras/${rule.id}`,
      });
    });

    const projectSummaries = projects.map((project) => {
      const projectEntities = governedEntities.filter((entity) => entity.projectId === project.id);
      const projectEvidence = projectEntities.filter((entity) => evidenceKeys.has(`${entity.type}:${entity.id}`)).length;
      const projectOwnerTracked = ownerTracked.filter((entity) => entity.projectId === project.id);
      const projectOwnerOk = projectOwnerTracked.filter((entity) => entity.ownerOk).length;
      const projectSources = activeSources.filter((source) => source.projetoId === project.id);
      const projectFresh = projectSources.filter((source) => source.ultimaVerificacao && source.ultimaVerificacao.getTime() >= staleThreshold).length;
      const projectDocs = documents.filter((document) => document.projetoId === project.id && document.status !== 'Arquivado');
      const projectPublished = projectDocs.filter((document) => document.status === 'Publicado' && document.versaoPublicada != null).length;
      const projectIssues = issues.filter((issue) => issue.projectId === project.id);
      const scores = [
        percent(projectEvidence, projectEntities.length),
        percent(projectOwnerOk, projectOwnerTracked.length),
        percent(projectFresh, projectSources.length),
        percent(projectPublished, projectDocs.length),
      ];
      return {
        id: project.id,
        nome: project.nome,
        codigo: project.codigo,
        status: project.status,
        score: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
        issues: projectIssues.length,
        criticalIssues: projectIssues.filter((issue) => issue.severity === 'critical').length,
        withoutEvidence: projectEntities.length - projectEvidence,
        staleSources: projectSources.length - projectFresh,
        documentsPending: projectDocs.length - projectPublished,
        externalDependencies:
          crossProjectIntegrations.filter((item) => item.produto.projetoId === project.id || item.produtoRelacionado?.projetoId === project.id).length +
          externalSourceLinks.filter((link) => link.projetoContextoId === project.id).length +
          externalDocumentLinks.filter((link) => link.projetoContextoId === project.id).length,
      };
    });

    const scopedProjectIds = new Set(projects.map((project) => project.id));
    const visibleIssues = issues
      .filter((issue) => scopedProjectIds.has(issue.projectId))
      .sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]))
      .slice(0, 120);

    const evidenceCoverage = percent(entitiesWithEvidence.length, governedEntities.length);
    const ownershipCoverage = percent(ownerOk.length, ownerTracked.length);
    const sourceFreshness = percent(freshSources.length, activeSources.length);
    const documentPublication = percent(publishedDocuments.length, documents.filter((document) => document.status !== 'Arquivado').length);
    const overallScore = Math.round((evidenceCoverage + ownershipCoverage + sourceFreshness + documentPublication) / 4);

    return {
      scope: {
        projetoId: projetoId ?? null,
        projetoNome: projetoId ? projectById.get(projetoId)?.nome ?? null : null,
      },
      summary: {
        overallScore,
        knowledgeEntities: governedEntities.length,
        evidenceCoverage,
        ownershipCoverage,
        sourceFreshness,
        documentPublication,
        criticalIssues: visibleIssues.filter((issue) => issue.severity === 'critical').length,
        warnings: visibleIssues.filter((issue) => issue.severity === 'warning').length,
        externalDependencies: crossProjectIntegrations.length + externalSourceLinks.length + externalDocumentLinks.length,
      },
      coverage: {
        evidence: { ok: entitiesWithEvidence.length, total: governedEntities.length, percent: evidenceCoverage },
        ownership: { ok: ownerOk.length, total: ownerTracked.length, percent: ownershipCoverage },
        sources: { ok: freshSources.length, total: activeSources.length, percent: sourceFreshness },
        documents: { ok: publishedDocuments.length, total: documents.filter((document) => document.status !== 'Arquivado').length, percent: documentPublication },
      },
      issues: visibleIssues,
      projects: projectSummaries.sort((a, b) => a.score - b.score || b.criticalIssues - a.criticalIssues || a.nome.localeCompare(b.nome, 'pt-BR')),
      generatedAt: new Date().toISOString(),
    };
  }
}
