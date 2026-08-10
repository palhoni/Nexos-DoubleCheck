import { EmptyState } from '@/design-system';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

export type ProjetoSetupSection = 'times' | 'pessoas' | 'produtos' | 'regras';

const SECTION_COPY: Record<ProjetoSetupSection, { title: string; subtitle: (projetoNome: string) => string }> = {
  times: {
    title: 'Times do Projeto',
    subtitle: (projetoNome) => `Organize os times responsáveis por construir, operar e evoluir o projeto ${projetoNome}.`,
  },
  pessoas: {
    title: 'Pessoas, Papéis e Responsabilidades',
    subtitle: (projetoNome) => `Defina quem participa do projeto ${projetoNome}, seus papéis, times e responsabilidades.`,
  },
  produtos: {
    title: 'Produtos do Projeto',
    subtitle: (projetoNome) => `Cadastre e organize os produtos vinculados ao projeto ${projetoNome}.`,
  },
  regras: {
    title: 'Regras do Projeto',
    subtitle: (projetoNome) => `Documente e mantenha as regras de negócio dos produtos vinculados ao projeto ${projetoNome}.`,
  },
};

export interface ProjetoSetupSectionPageProps {
  projetoId: string;
  section: ProjetoSetupSection;
  onBack: () => void;
  children: React.ReactNode;
}

/**
 * Shell compartilhado das etapas escopadas ao Projeto.
 * Nesta sprint o conteúdo interno ainda pode reutilizar os CRUDs existentes; a composição
 * externa já passa a ser página/rota real do Setup, e não uma tab dentro do Projeto.
 */
export function ProjetoSetupSectionPage({ projetoId, section, onBack, children }: ProjetoSetupSectionPageProps) {
  const { data: projeto, isLoading } = projetoHooks.useDetail(projetoId);
  const copy = SECTION_COPY[section];

  if (isLoading) {
    return (
      <div className="setup-page" aria-live="polite">
        <span className="dbc-text-2">Carregando projeto...</span>
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="setup-page">
        <EmptyState title="Projeto não encontrado" message="O projeto pode ter sido removido ou você pode não ter mais acesso a ele." actionLabel="Voltar para projetos" onAction={onBack} />
      </div>
    );
  }

  return (
    <SetupPage
      header={
        <SetupPageHeader
          breadcrumb={['Setup', 'Projetos', projeto.nome, copy.title]}
          title={copy.title}
          subtitle={copy.subtitle(projeto.nome)}
          back={{ label: 'Voltar ao projeto', onClick: onBack }}
        />
      }
    >
      {children}
    </SetupPage>
  );
}
