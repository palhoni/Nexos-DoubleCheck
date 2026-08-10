import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryConhecimentoGrafoDto } from './dto/query-conhecimento-grafo.dto';

type NodeType =
  | 'Projeto'
  | 'Time'
  | 'Pessoa'
  | 'Produto'
  | 'PublicoAlvo'
  | 'Modulo'
  | 'Funcionalidade'
  | 'Jornada'
  | 'Regra'
  | 'Integracao'
  | 'Fonte'
  | 'Documento';

type EdgeKind = 'hierarchy' | 'knowledge' | 'dependency' | 'evidence' | 'governance';

export interface GraphNode {
  key: string;
  id: string;
  type: NodeType;
  label: string;
  code: string | null;
  status: string | null;
  ownerProjectId: string | null;
  ownerProjectName: string | null;
  parentProductId: string | null;
  parentProductName: string | null;
  route: string | null;
  external: boolean;
  relationCount: number;
  evidenceCount: number;
  documentCount: number;
  meta: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  kind: EdgeKind;
  crossProject: boolean;
  ownerProjectIds: string[];
}

const CORE_KNOWLEDGE_TYPES = new Set<NodeType>(['Produto', 'PublicoAlvo', 'Modulo', 'Funcionalidade', 'Jornada', 'Regra', 'Integracao', 'Documento']);

function nodeKey(type: NodeType, id: string) {
  return `${type}:${id}`;
}

function clean(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

@Injectable()
export class ConhecimentoService {
  constructor(private readonly prisma: PrismaService) {}

  async grafo(query: QueryConhecimentoGrafoDto) {
    let projetoId = query.projetoId;

    if (query.produtoId) {
      const produto = await this.prisma.produto.findUnique({ where: { id: query.produtoId }, select: { id: true, projetoId: true } });
      if (!produto) throw new NotFoundException(`Produto ${query.produtoId} não encontrado`);
      if (projetoId && projetoId !== produto.projetoId) {
        throw new BadRequestException('O produto informado não pertence ao projeto selecionado.');
      }
      projetoId = produto.projetoId;
    }

    if (!projetoId) return this.globalGraph(query.maxNodes);
    return this.projectGraph(projetoId, query.produtoId, query.maxNodes);
  }

  private createBuilder(maxNodes: number, principalProjectId?: string) {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    let truncated = false;

    const addNode = (node: Omit<GraphNode, 'relationCount' | 'evidenceCount' | 'documentCount' | 'external'> & { external?: boolean }) => {
      const existing = nodes.get(node.key);
      if (existing) {
        nodes.set(node.key, { ...existing, ...node, external: node.external ?? existing.external });
        return existing;
      }
      if (nodes.size >= maxNodes) {
        truncated = true;
        return null;
      }
      const finalNode: GraphNode = {
        ...node,
        external: node.external ?? (!!principalProjectId && !!node.ownerProjectId && node.ownerProjectId !== principalProjectId),
        relationCount: 0,
        evidenceCount: 0,
        documentCount: 0,
      };
      nodes.set(node.key, finalNode);
      return finalNode;
    };

    const addEdge = (edge: Omit<GraphEdge, 'id' | 'crossProject' | 'ownerProjectIds'> & { id?: string }) => {
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);
      if (!source || !target || edge.source === edge.target) return;
      const id = edge.id ?? `${edge.type}:${edge.source}:${edge.target}`;
      if (edges.has(id)) return;
      const owners = [...new Set([source.ownerProjectId, target.ownerProjectId].filter((value): value is string => !!value))];
      const finalEdge: GraphEdge = {
        ...edge,
        id,
        crossProject: owners.length > 1,
        ownerProjectIds: owners,
      };
      edges.set(id, finalEdge);
      source.relationCount += 1;
      target.relationCount += 1;
      if (edge.kind === 'evidence') target.evidenceCount += 1;
      if (source.type === 'Documento' && edge.type === 'documenta') target.documentCount += 1;
    };

    const result = () => {
      const nodeList = [...nodes.values()];
      const edgeList = [...edges.values()];
      const lowConnectivity = nodeList.filter((node) => CORE_KNOWLEDGE_TYPES.has(node.type) && node.relationCount <= 1).length;
      const withoutEvidence = nodeList.filter((node) => CORE_KNOWLEDGE_TYPES.has(node.type) && node.evidenceCount === 0 && node.documentCount === 0).length;
      const crossProjectEdges = edgeList.filter((edge) => edge.crossProject).length;
      const projectIds = new Set(nodeList.map((node) => node.ownerProjectId).filter(Boolean));

      return {
        nodes: nodeList,
        edges: edgeList,
        summary: {
          entities: nodeList.length,
          relations: edgeList.length,
          projects: projectIds.size,
          crossProjectRelations: crossProjectEdges,
          withoutDirectEvidence: withoutEvidence,
          lowConnectivity,
        },
        truncated,
      };
    };

    return { nodes, addNode, addEdge, result };
  }

  private projectRoute(projectId: string) {
    return `/projetos/${projectId}`;
  }

  private async globalGraph(maxNodes: number) {
    const builder = this.createBuilder(maxNodes);
    const [projects, products, integrations] = await Promise.all([
      this.prisma.projeto.findMany({
        orderBy: [{ status: 'asc' }, { nome: 'asc' }],
        select: { id: true, nome: true, codigo: true, status: true, areaNegocio: true },
      }),
      this.prisma.produto.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, codigo: true, status: true, projetoId: true, projeto: { select: { nome: true } } },
      }),
      this.prisma.integracao.findMany({
        where: { produtoRelacionadoId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          nome: true,
          status: true,
          tipo: true,
          criticidade: true,
          direcao: true,
          produtoId: true,
          produto: { select: { projetoId: true, projeto: { select: { nome: true } } } },
          produtoRelacionadoId: true,
          produtoRelacionado: { select: { projetoId: true, projeto: { select: { nome: true } } } },
        },
      }),
    ]);

    projects.forEach((project) => builder.addNode({
      key: nodeKey('Projeto', project.id),
      id: project.id,
      type: 'Projeto',
      label: project.nome,
      code: project.codigo,
      status: project.status,
      ownerProjectId: project.id,
      ownerProjectName: project.nome,
      parentProductId: null,
      parentProductName: null,
      route: this.projectRoute(project.id),
      meta: { areaNegocio: clean(project.areaNegocio) },
    }));

    products.forEach((product) => {
      builder.addNode({
        key: nodeKey('Produto', product.id),
        id: product.id,
        type: 'Produto',
        label: product.nome,
        code: product.codigo,
        status: product.status,
        ownerProjectId: product.projetoId,
        ownerProjectName: product.projeto.nome,
        parentProductId: product.id,
        parentProductName: product.nome,
        route: `/projetos/${product.projetoId}/produtos/${product.id}`,
        meta: {},
      });
      builder.addEdge({ source: nodeKey('Projeto', product.projetoId), target: nodeKey('Produto', product.id), type: 'possui', label: 'possui', kind: 'hierarchy' });
    });

    integrations.forEach((integration) => {
      if (!integration.produtoRelacionadoId || !integration.produtoRelacionado) return;
      const ownerProjectId = integration.produto.projetoId;
      const integrationNode = builder.addNode({
        key: nodeKey('Integracao', integration.id),
        id: integration.id,
        type: 'Integracao',
        label: integration.nome,
        code: null,
        status: integration.status,
        ownerProjectId,
        ownerProjectName: integration.produto.projeto.nome,
        parentProductId: integration.produtoId,
        parentProductName: null,
        route: `/projetos/${ownerProjectId}/produtos/${integration.produtoId}/integracoes/${integration.id}`,
        meta: { tipo: clean(integration.tipo), criticidade: clean(integration.criticidade), direcao: clean(integration.direcao) },
      });
      if (!integrationNode) return;
      builder.addEdge({ source: nodeKey('Produto', integration.produtoId), target: integrationNode.key, type: 'origina', label: 'origina', kind: 'dependency' });
      builder.addEdge({ source: integrationNode.key, target: nodeKey('Produto', integration.produtoRelacionadoId), type: 'conecta', label: integration.tipo ?? 'integra', kind: 'dependency' });
    });

    return {
      scope: { mode: 'global' as const, projetoId: null, produtoId: null, projetoNome: null, produtoNome: null },
      ...builder.result(),
    };
  }

  private async projectGraph(projetoId: string, produtoFocusId: string | undefined, maxNodes: number) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: projetoId },
      include: {
        times: { orderBy: { nome: 'asc' } },
        pessoas: { orderBy: { nome: 'asc' } },
        produtos: {
          orderBy: { nome: 'asc' },
          include: {
            timeResponsavel: true,
            publicosAlvo: { orderBy: { nome: 'asc' } },
            modulos: { orderBy: [{ ordemExibicao: 'asc' }, { nome: 'asc' }] },
            funcionalidades: { orderBy: { nome: 'asc' } },
            jornadas: {
              orderBy: { nome: 'asc' },
              include: {
                publicoAlvo: true,
                modulos: true,
                funcionalidades: true,
                produtosParticipantes: { include: { projeto: true } },
              },
            },
            regras: {
              where: { versaoAtual: true },
              orderBy: { nome: 'asc' },
              include: { modulos: true, funcionalidades: true, jornadas: true },
            },
            integracoes: {
              orderBy: { nome: 'asc' },
              include: {
                produtoRelacionado: { include: { projeto: true } },
                funcionalidades: true,
                timeProprietario: true,
              },
            },
          },
        },
      },
    });
    if (!projeto) throw new NotFoundException(`Projeto ${projetoId} não encontrado`);
    if (produtoFocusId && !projeto.produtos.some((product) => product.id === produtoFocusId)) {
      throw new BadRequestException('O produto informado não pertence ao projeto selecionado.');
    }

    const [sourceLinks, documentLinks] = await Promise.all([
      this.prisma.fonteVinculo.findMany({
        where: { projetoContextoId: projetoId },
        include: { fonte: { include: { projeto: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentoVinculo.findMany({
        where: { projetoContextoId: projetoId },
        include: { documento: { include: { projeto: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const builder = this.createBuilder(maxNodes, projetoId);
    builder.addNode({
      key: nodeKey('Projeto', projeto.id),
      id: projeto.id,
      type: 'Projeto',
      label: projeto.nome,
      code: projeto.codigo,
      status: projeto.status,
      ownerProjectId: projeto.id,
      ownerProjectName: projeto.nome,
      parentProductId: null,
      parentProductName: null,
      route: this.projectRoute(projeto.id),
      external: false,
      meta: { areaNegocio: clean(projeto.areaNegocio) },
    });

    for (const time of projeto.times) {
      builder.addNode({ key: nodeKey('Time', time.id), id: time.id, type: 'Time', label: time.nome, code: null, status: time.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: null, parentProductName: null, route: `/projetos/${projeto.id}/times/${time.id}`, meta: { responsavel: clean(time.responsavelPrincipal) } });
      builder.addEdge({ source: nodeKey('Projeto', projeto.id), target: nodeKey('Time', time.id), type: 'estrutura', label: 'estrutura', kind: 'hierarchy' });
    }

    for (const pessoa of projeto.pessoas) {
      builder.addNode({ key: nodeKey('Pessoa', pessoa.id), id: pessoa.id, type: 'Pessoa', label: pessoa.nome, code: null, status: pessoa.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: null, parentProductName: null, route: `/projetos/${projeto.id}/pessoas/${pessoa.id}`, meta: { papel: clean(pessoa.papel), nivelDecisao: clean(pessoa.nivelDecisao) } });
      builder.addEdge({ source: nodeKey('Projeto', projeto.id), target: nodeKey('Pessoa', pessoa.id), type: 'aloca', label: 'aloca', kind: 'hierarchy' });
      if (pessoa.timeId) builder.addEdge({ source: nodeKey('Time', pessoa.timeId), target: nodeKey('Pessoa', pessoa.id), type: 'compõe', label: 'compõe', kind: 'governance' });
    }


    // Pré-registra todos os Produtos para que relações entre produtos do mesmo Projeto
    // não dependam da ordem de iteração (ex.: Jornada A envolvendo Produto B).
    for (const product of projeto.produtos) {
      builder.addNode({ key: nodeKey('Produto', product.id), id: product.id, type: 'Produto', label: product.nome, code: product.codigo, status: product.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: product.id, parentProductName: product.nome, route: `/projetos/${projeto.id}/produtos/${product.id}`, meta: { areaNegocio: clean(product.areaNegocio), estabilidade: clean(product.estabilidadeStatus) } });
      builder.addEdge({ source: nodeKey('Projeto', projeto.id), target: nodeKey('Produto', product.id), type: 'possui', label: 'possui', kind: 'hierarchy' });
      if (product.timeResponsavelId) builder.addEdge({ source: nodeKey('Time', product.timeResponsavelId), target: nodeKey('Produto', product.id), type: 'responsável', label: 'responsável', kind: 'governance' });
    }

    for (const product of projeto.produtos) {
      builder.addNode({ key: nodeKey('Produto', product.id), id: product.id, type: 'Produto', label: product.nome, code: product.codigo, status: product.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: product.id, parentProductName: product.nome, route: `/projetos/${projeto.id}/produtos/${product.id}`, meta: { areaNegocio: clean(product.areaNegocio), estabilidade: clean(product.estabilidadeStatus) } });
      builder.addEdge({ source: nodeKey('Projeto', projeto.id), target: nodeKey('Produto', product.id), type: 'possui', label: 'possui', kind: 'hierarchy' });
      if (product.timeResponsavelId) builder.addEdge({ source: nodeKey('Time', product.timeResponsavelId), target: nodeKey('Produto', product.id), type: 'responsável', label: 'responsável', kind: 'governance' });

      for (const audience of product.publicosAlvo) {
        builder.addNode({ key: nodeKey('PublicoAlvo', audience.id), id: audience.id, type: 'PublicoAlvo', label: audience.nome, code: null, status: audience.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: product.id, parentProductName: product.nome, route: `/projetos/${projeto.id}/produtos/${product.id}/publico-alvo/${audience.id}`, meta: { tipoUsuario: clean(audience.tipoUsuario), frequenciaUso: clean(audience.frequenciaUso) } });
        builder.addEdge({ source: nodeKey('Produto', product.id), target: nodeKey('PublicoAlvo', audience.id), type: 'atende', label: 'atende', kind: 'knowledge' });
      }

      for (const module of product.modulos) {
        builder.addNode({ key: nodeKey('Modulo', module.id), id: module.id, type: 'Modulo', label: module.nome, code: module.codigo, status: module.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: product.id, parentProductName: product.nome, route: `/projetos/${projeto.id}/produtos/${product.id}/modulos/${module.id}`, meta: { responsavel: clean(module.responsavelPrincipal) } });
        builder.addEdge({ source: nodeKey('Produto', product.id), target: nodeKey('Modulo', module.id), type: 'organiza', label: 'organiza', kind: 'hierarchy' });
      }

      for (const feature of product.funcionalidades) {
        builder.addNode({ key: nodeKey('Funcionalidade', feature.id), id: feature.id, type: 'Funcionalidade', label: feature.nome, code: feature.codigo, status: feature.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: product.id, parentProductName: product.nome, route: `/projetos/${projeto.id}/produtos/${product.id}/funcionalidades/${feature.id}`, meta: { responsavel: clean(feature.responsavelPrincipal) } });
        if (feature.moduloId) builder.addEdge({ source: nodeKey('Modulo', feature.moduloId), target: nodeKey('Funcionalidade', feature.id), type: 'contém', label: 'contém', kind: 'hierarchy' });
        else builder.addEdge({ source: nodeKey('Produto', product.id), target: nodeKey('Funcionalidade', feature.id), type: 'possui', label: 'possui', kind: 'hierarchy' });
      }

      for (const journey of product.jornadas) {
        builder.addNode({ key: nodeKey('Jornada', journey.id), id: journey.id, type: 'Jornada', label: journey.nome, code: null, status: journey.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: product.id, parentProductName: product.nome, route: `/projetos/${projeto.id}/produtos/${product.id}/jornadas/${journey.id}`, meta: { etapas: journey.etapas.length } });
        builder.addEdge({ source: nodeKey('Produto', product.id), target: nodeKey('Jornada', journey.id), type: 'possui', label: 'possui', kind: 'hierarchy' });
        if (journey.publicoAlvoId) builder.addEdge({ source: nodeKey('PublicoAlvo', journey.publicoAlvoId), target: nodeKey('Jornada', journey.id), type: 'contextualiza', label: 'contextualiza', kind: 'knowledge' });
        journey.modulos.forEach((module) => builder.addEdge({ source: nodeKey('Jornada', journey.id), target: nodeKey('Modulo', module.id), type: 'percorre', label: 'percorre', kind: 'knowledge' }));
        journey.funcionalidades.forEach((feature) => builder.addEdge({ source: nodeKey('Jornada', journey.id), target: nodeKey('Funcionalidade', feature.id), type: 'utiliza', label: 'utiliza', kind: 'knowledge' }));
        for (const participant of journey.produtosParticipantes) {
          if (participant.projetoId !== projeto.id) {
            builder.addNode({ key: nodeKey('Projeto', participant.projeto.id), id: participant.projeto.id, type: 'Projeto', label: participant.projeto.nome, code: participant.projeto.codigo, status: participant.projeto.status, ownerProjectId: participant.projeto.id, ownerProjectName: participant.projeto.nome, parentProductId: null, parentProductName: null, route: this.projectRoute(participant.projeto.id), meta: { areaNegocio: clean(participant.projeto.areaNegocio) } });
            builder.addNode({ key: nodeKey('Produto', participant.id), id: participant.id, type: 'Produto', label: participant.nome, code: participant.codigo, status: participant.status, ownerProjectId: participant.projetoId, ownerProjectName: participant.projeto.nome, parentProductId: participant.id, parentProductName: participant.nome, route: `/projetos/${participant.projetoId}/produtos/${participant.id}`, meta: {} });
            builder.addEdge({ source: nodeKey('Projeto', participant.projeto.id), target: nodeKey('Produto', participant.id), type: 'possui', label: 'possui', kind: 'hierarchy' });
          }
          builder.addEdge({ source: nodeKey('Jornada', journey.id), target: nodeKey('Produto', participant.id), type: 'envolve', label: 'envolve', kind: 'knowledge' });
        }
      }

      for (const rule of product.regras) {
        builder.addNode({ key: nodeKey('Regra', rule.id), id: rule.id, type: 'Regra', label: rule.nome, code: `v${rule.numeroVersao}`, status: rule.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: product.id, parentProductName: product.nome, route: `/projetos/${projeto.id}/produtos/${product.id}/regras/${rule.id}`, meta: { prioridade: clean(rule.prioridade), versao: rule.numeroVersao } });
        builder.addEdge({ source: nodeKey('Produto', product.id), target: nodeKey('Regra', rule.id), type: 'possui', label: 'possui', kind: 'hierarchy' });
        rule.modulos.forEach((module) => builder.addEdge({ source: nodeKey('Regra', rule.id), target: nodeKey('Modulo', module.id), type: 'aplica-se', label: 'aplica-se', kind: 'knowledge' }));
        rule.funcionalidades.forEach((feature) => builder.addEdge({ source: nodeKey('Regra', rule.id), target: nodeKey('Funcionalidade', feature.id), type: 'relaciona', label: 'relaciona', kind: 'knowledge' }));
        rule.jornadas.forEach((journey) => builder.addEdge({ source: nodeKey('Regra', rule.id), target: nodeKey('Jornada', journey.id), type: 'aplica-se', label: 'aplica-se', kind: 'knowledge' }));
      }

      for (const integration of product.integracoes) {
        const integrationKey = nodeKey('Integracao', integration.id);
        builder.addNode({ key: integrationKey, id: integration.id, type: 'Integracao', label: integration.nome, code: null, status: integration.status, ownerProjectId: projeto.id, ownerProjectName: projeto.nome, parentProductId: product.id, parentProductName: product.nome, route: `/projetos/${projeto.id}/produtos/${product.id}/integracoes/${integration.id}`, meta: { tipo: clean(integration.tipo), criticidade: clean(integration.criticidade), direcao: clean(integration.direcao), modo: clean(integration.modo) } });
        builder.addEdge({ source: nodeKey('Produto', product.id), target: integrationKey, type: 'origina', label: 'origina', kind: 'dependency' });
        if (integration.timeProprietarioId) builder.addEdge({ source: nodeKey('Time', integration.timeProprietarioId), target: integrationKey, type: 'proprietário', label: 'proprietário', kind: 'governance' });
        integration.funcionalidades.forEach((feature) => builder.addEdge({ source: integrationKey, target: nodeKey('Funcionalidade', feature.id), type: 'suporta', label: 'suporta', kind: 'knowledge' }));

        const related = integration.produtoRelacionado;
        if (related) {
          if (related.projetoId !== projeto.id) {
            builder.addNode({ key: nodeKey('Projeto', related.projeto.id), id: related.projeto.id, type: 'Projeto', label: related.projeto.nome, code: related.projeto.codigo, status: related.projeto.status, ownerProjectId: related.projeto.id, ownerProjectName: related.projeto.nome, parentProductId: null, parentProductName: null, route: this.projectRoute(related.projeto.id), meta: { areaNegocio: clean(related.projeto.areaNegocio) } });
            builder.addNode({ key: nodeKey('Produto', related.id), id: related.id, type: 'Produto', label: related.nome, code: related.codigo, status: related.status, ownerProjectId: related.projetoId, ownerProjectName: related.projeto.nome, parentProductId: related.id, parentProductName: related.nome, route: `/projetos/${related.projetoId}/produtos/${related.id}`, meta: {} });
            builder.addEdge({ source: nodeKey('Projeto', related.projeto.id), target: nodeKey('Produto', related.id), type: 'possui', label: 'possui', kind: 'hierarchy' });
          }
          builder.addEdge({ source: integrationKey, target: nodeKey('Produto', related.id), type: 'conecta', label: integration.tipo ?? 'integra', kind: 'dependency' });
        }
      }
    }

    for (const link of sourceLinks) {
      const source = link.fonte;
      const sourceKey = nodeKey('Fonte', source.id);
      builder.addNode({ key: sourceKey, id: source.id, type: 'Fonte', label: source.nome, code: source.tipo, status: source.status, ownerProjectId: source.projetoId, ownerProjectName: source.projeto.nome, parentProductId: null, parentProductName: null, route: `/projetos/${source.projetoId}/fontes?fonte=${source.id}`, meta: { oficial: source.oficial, responsavel: clean(source.responsavel), ultimaVerificacao: source.ultimaVerificacao?.toISOString() ?? null } });
      if (!builder.nodes.has(nodeKey('Projeto', source.projetoId))) {
        builder.addNode({ key: nodeKey('Projeto', source.projeto.id), id: source.projeto.id, type: 'Projeto', label: source.projeto.nome, code: source.projeto.codigo, status: source.projeto.status, ownerProjectId: source.projeto.id, ownerProjectName: source.projeto.nome, parentProductId: null, parentProductName: null, route: this.projectRoute(source.projeto.id), meta: { areaNegocio: clean(source.projeto.areaNegocio) } });
      }
      builder.addEdge({ source: nodeKey('Projeto', source.projetoId), target: sourceKey, type: 'possui', label: 'possui', kind: 'hierarchy' });
      const targetType = link.entityType as NodeType;
      const targetKey = nodeKey(targetType, link.entityId);
      if (builder.nodes.has(targetKey)) builder.addEdge({ id: `fonte:${link.id}`, source: sourceKey, target: targetKey, type: 'evidencia', label: 'evidencia', kind: 'evidence' });
    }

    for (const link of documentLinks) {
      const document = link.documento;
      const documentKey = nodeKey('Documento', document.id);
      builder.addNode({ key: documentKey, id: document.id, type: 'Documento', label: document.titulo, code: document.codigo, status: document.status, ownerProjectId: document.projetoId, ownerProjectName: document.projeto.nome, parentProductId: null, parentProductName: null, route: `/projetos/${document.projetoId}/documentos/${document.id}`, meta: { tipo: document.tipo, versao: document.versao, versaoPublicada: document.versaoPublicada } });
      if (!builder.nodes.has(nodeKey('Projeto', document.projetoId))) {
        builder.addNode({ key: nodeKey('Projeto', document.projeto.id), id: document.projeto.id, type: 'Projeto', label: document.projeto.nome, code: document.projeto.codigo, status: document.projeto.status, ownerProjectId: document.projeto.id, ownerProjectName: document.projeto.nome, parentProductId: null, parentProductName: null, route: this.projectRoute(document.projeto.id), meta: { areaNegocio: clean(document.projeto.areaNegocio) } });
      }
      builder.addEdge({ source: nodeKey('Projeto', document.projetoId), target: documentKey, type: 'possui', label: 'possui', kind: 'hierarchy' });
      const targetType = link.entityType as NodeType;
      const targetKey = nodeKey(targetType, link.entityId);
      if (builder.nodes.has(targetKey)) builder.addEdge({ id: `documento:${link.id}`, source: documentKey, target: targetKey, type: 'documenta', label: 'documenta', kind: 'evidence' });
    }

    // Documentos são registrados depois das Fontes. Repassa os vínculos para garantir
    // que uma Fonte vinculada diretamente a um Documento também apareça no grafo.
    for (const link of sourceLinks) {
      const targetKey = nodeKey(link.entityType as NodeType, link.entityId);
      const sourceKey = nodeKey('Fonte', link.fonteId);
      if (builder.nodes.has(sourceKey) && builder.nodes.has(targetKey)) {
        builder.addEdge({ id: `fonte:${link.id}`, source: sourceKey, target: targetKey, type: 'evidencia', label: 'evidencia', kind: 'evidence' });
      }
    }

    const focusProduct = produtoFocusId ? projeto.produtos.find((product) => product.id === produtoFocusId) : null;
    return {
      scope: {
        mode: 'project' as const,
        projetoId: projeto.id,
        projetoNome: projeto.nome,
        produtoId: focusProduct?.id ?? null,
        produtoNome: focusProduct?.nome ?? null,
      },
      ...builder.result(),
    };
  }
}
