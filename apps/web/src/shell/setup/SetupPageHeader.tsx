import { BackButton } from '@/design-system';
import { Breadcrumb } from '../Breadcrumb';

export interface SetupPageHeaderProps {
  breadcrumb?: React.ReactNode[];
  title: React.ReactNode;
  /** Texto explicativo abaixo do título. */
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  badges?: React.ReactNode;
  /** Botões à direita do título (ex.: “Editar”). */
  actions?: React.ReactNode;
  back?: { label: string; onClick: () => void };
  /** Compatibilidade com telas existentes: tratado como subtítulo/meta. */
  meta?: React.ReactNode;
  /** @deprecated O stepper pertence ao SetupPage. Mantido apenas por compatibilidade. */
  stepper?: React.ReactNode;
}

/**
 * Cabeçalho visual único do Setup. Ele não é um card: título, descrição, breadcrumb e ações
 * ficam diretamente sobre o fundo da página, mantendo a mesma linha de alinhamento do
 * stepper, tabs, cards e tabelas.
 */
export function SetupPageHeader({ breadcrumb, title, subtitle, description, badges, actions, back, meta, stepper }: SetupPageHeaderProps) {
  const supportingText = subtitle ?? description ?? meta;

  return (
    <header className="setup-page-header">
      {back && (
        <div className="setup-page-header__back">
          <BackButton label={back.label} onClick={back.onClick} />
        </div>
      )}

      {breadcrumb && breadcrumb.length > 0 && (
        <div className="setup-page-header__breadcrumb">
          <Breadcrumb parts={breadcrumb} />
        </div>
      )}

      <div className="setup-page-header__main">
        <div className="setup-page-header__copy">
          <div className="setup-page-header__title-row">
            <h1 className="setup-page-header__title">{title}</h1>
            {badges}
          </div>
          {supportingText && <div className="setup-page-header__meta">{supportingText}</div>}
        </div>

        {actions && <div className="setup-page-header__actions">{actions}</div>}
      </div>

      {stepper}
    </header>
  );
}
