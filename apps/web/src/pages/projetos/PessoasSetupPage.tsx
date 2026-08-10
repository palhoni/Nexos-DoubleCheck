import { useNavigate, useParams } from 'react-router-dom';
import { ProjetoSetupSectionPage } from './ProjetoSetupSectionPage';
import { PessoasSetupContent } from './PessoasSetupContent';

export function PessoasSetupPage() {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();

  if (!projetoId) return null;

  return (
    <ProjetoSetupSectionPage projetoId={projetoId} section="pessoas" onBack={() => navigate(`/projetos/${projetoId}`)}>
      <PessoasSetupContent projetoId={projetoId} />
    </ProjetoSetupSectionPage>
  );
}
