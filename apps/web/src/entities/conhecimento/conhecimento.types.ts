export type KnowledgeNodeType =
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

export type KnowledgeEdgeKind = 'hierarchy' | 'knowledge' | 'dependency' | 'evidence' | 'governance';

export interface KnowledgeGraphNode {
  key: string;
  id: string;
  type: KnowledgeNodeType;
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

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  kind: KnowledgeEdgeKind;
  crossProject: boolean;
  ownerProjectIds: string[];
}

export interface KnowledgeGraphResponse {
  scope: {
    mode: 'global' | 'project';
    projetoId: string | null;
    projetoNome: string | null;
    produtoId: string | null;
    produtoNome: string | null;
  };
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  summary: {
    entities: number;
    relations: number;
    projects: number;
    crossProjectRelations: number;
    withoutDirectEvidence: number;
    lowConnectivity: number;
  };
  truncated: boolean;
}
