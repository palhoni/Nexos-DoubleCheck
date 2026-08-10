import { useNavigate, useParams } from 'react-router-dom';
import { ProjetoSetupSectionPage } from './ProjetoSetupSectionPage';
import { TimesSetupContent } from './TimesSetupContent';

export function TimesSetupPage() {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();

  if (!projetoId) return null;

  return (
    <ProjetoSetupSectionPage projetoId={projetoId} section="times" onBack={() => navigate(`/projetos/${projetoId}`)}>
      <TimesSetupContent projetoId={projetoId} />
    </ProjetoSetupSectionPage>
  );
}
