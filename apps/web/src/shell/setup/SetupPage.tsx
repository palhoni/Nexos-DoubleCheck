import { PageGrid } from '@/design-system';
import { SetupStepper } from './SetupStepper';

export interface SetupPageProps {
  step?: string;
  header: React.ReactNode;
  /** Coluna direita opcional (indicadores, progresso, ações rápidas). */
  rail?: React.ReactNode;
  children: React.ReactNode;
  /** true quando renderizado dentro de outra tela; remove o padding de página cheia. */
  embedded?: boolean;
  /**
   * Stepper customizado. Quando omitido, a página usa o SetupStepper contextual.
   * Passe `false` para ocultá-lo explicitamente.
   */
  stepper?: React.ReactNode | false;
  /** Conteúdo opcional entre o stepper e o grid (ex.: link “Voltar para produtos”). */
  afterStepper?: React.ReactNode;
}

/**
 * Wrapper canônico das páginas do Setup.
 * Ordem visual obrigatória: cabeçalho → stepper → conteúdo auxiliar → grid principal/rail.
 */
export function SetupPage({ header, rail, children, embedded = false, stepper, afterStepper }: SetupPageProps) {
  const resolvedStepper = stepper === false ? null : stepper ?? (!embedded ? <SetupStepper /> : null);

  return (
    <div className={`setup-page${embedded ? ' setup-page--embedded' : ''}`}>
      {header}
      {resolvedStepper}
      {afterStepper}
      <PageGrid rail={rail}>{children}</PageGrid>
    </div>
  );
}
