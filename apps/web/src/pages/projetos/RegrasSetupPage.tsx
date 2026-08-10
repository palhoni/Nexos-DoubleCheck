import { useNavigate, useParams } from 'react-router-dom';
import { ProjetoSetupSectionPage } from './ProjetoSetupSectionPage';
import { RegrasSetupContent } from './RegrasSetupContent';

export function RegrasSetupPage() {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();

  if (!projetoId) return null;

  return (
    <ProjetoSetupSectionPage projetoId={projetoId} section="regras" onBack={() => navigate(`/projetos/${projetoId}`)}>
      <RegrasSetupContent projetoId={projetoId} />
    </ProjetoSetupSectionPage>
  );
}
