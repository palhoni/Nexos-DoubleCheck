export interface ActivityActor {
  id: string;
  nome: string;
  email: string;
}

export interface ActivityContext {
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  projectId: string | null;
  projectName: string | null;
  productId: string | null;
  productName: string | null;
  route: string | null;
  crossProject: boolean;
}

export interface ActivityItem {
  id: string;
  entityType: string;
  entityId: string;
  label: string;
  createdAt: string;
  actor: ActivityActor | null;
  context: ActivityContext;
}

export interface ActivityResponse {
  data: ActivityItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { total: number; today: number; last7Days: number; actors: number };
  facets: {
    entityTypes: Array<{ type: string; count: number }>;
    actors: Array<{ id: string; nome: string }>;
  };
  filters: {
    projetoId: string | null;
    tipos: string[];
    actorUserId: string | null;
    q: string | null;
    de: string | null;
    ate: string | null;
  };
}
