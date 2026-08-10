import { useNavigate, useParams } from 'react-router-dom';
import { ProjetoSetupSectionPage } from './ProjetoSetupSectionPage';
import { ProdutosSetupContent } from './ProdutosSetupContent';

export function ProdutosSetupPage() {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();

  if (!projetoId) return null;

  return (
    <ProjetoSetupSectionPage projetoId={projetoId} section="produtos" onBack={() => navigate(`/projetos/${projetoId}`)}>
      <ProdutosSetupContent projetoId={projetoId} />
    </ProjetoSetupSectionPage>
  );
}
