export type MyAreaPriority = 'critical' | 'warning' | 'info';

export interface MyAreaPending {
  id: string;
  kind: string;
  priority: MyAreaPriority;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  projectId: string;
  projectName: string;
  route: string;
}

export interface MyAreaResponsibility {
  id: string;
  nome: string;
  projectId: string;
  projectName: string;
  route: string;
}

export interface MyAreaResponse {
  identity: {
    userId: string;
    nome: string;
    email: string;
    pessoaLinked: boolean;
    pessoaIds: string[];
    teams: Array<{ id: string; nome: string; projetoId: string }>;
  };
  summary: { pending: number; critical: number; sourcesToReview: number; documentsToReview: number; projects: number; ownedKnowledge: number };
  pendings: MyAreaPending[];
  responsibilities: {
    projects: MyAreaResponsibility[];
    products: MyAreaResponsibility[];
    modules: MyAreaResponsibility[];
    functions: MyAreaResponsibility[];
  };
  projects: Array<{ id: string; nome: string; codigo?: string; reasons: string[] }>;
  recentActivity: Array<{ id: string; entity: string; entityId: string; action: string; description: string | null; createdAt: string }>;
  generatedAt: string;
  linkageNote: string | null;
}
