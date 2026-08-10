export type GovernanceSeverity = 'critical' | 'warning' | 'info';
export type GovernanceCategory = 'evidence' | 'ownership' | 'freshness' | 'publication' | 'consistency';

export interface GovernanceIssue {
  id: string;
  severity: GovernanceSeverity;
  category: GovernanceCategory;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  projectId: string;
  route: string;
}

export interface GovernanceProjectSummary {
  id: string;
  nome: string;
  codigo: string;
  status: string;
  score: number;
  issues: number;
  criticalIssues: number;
  withoutEvidence: number;
  staleSources: number;
  documentsPending: number;
  externalDependencies: number;
}

export interface GovernanceResponse {
  scope: { projetoId: string | null; projetoNome: string | null };
  summary: {
    overallScore: number;
    knowledgeEntities: number;
    evidenceCoverage: number;
    ownershipCoverage: number;
    sourceFreshness: number;
    documentPublication: number;
    criticalIssues: number;
    warnings: number;
    externalDependencies: number;
  };
  coverage: {
    evidence: { ok: number; total: number; percent: number };
    ownership: { ok: number; total: number; percent: number };
    sources: { ok: number; total: number; percent: number };
    documents: { ok: number; total: number; percent: number };
  };
  issues: GovernanceIssue[];
  projects: GovernanceProjectSummary[];
  generatedAt: string;
}
