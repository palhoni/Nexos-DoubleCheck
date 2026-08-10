import { Icon, type IconName } from '../Icon/Icon';

export type StepperStepState = 'done' | 'current' | 'upcoming';

export interface StepperStep {
  key: string;
  label: string;
  icon: IconName;
  state: StepperStepState;
  /** Ausente = etapa informativa/não clicável porque ainda não existe destino real. */
  onClick?: () => void;
}

export interface StepperProps {
  steps: StepperStep[];
  ariaLabel?: string;
}

/**
 * Stepper visual do Design System. Não conhece rotas nem APIs; recebe estado e navegação
 * resolvidos pelo container. O layout é horizontal e rolável, com estados claros de
 * concluído / atual / futuro e foco acessível.
 */
export function Stepper({ steps, ariaLabel = 'Etapas do Setup' }: StepperProps) {
  return (
    <nav className="setup-stepper" aria-label={ariaLabel}>
      <ol className="setup-stepper__list">
        {steps.map((step, idx) => {
          const connectorDone = idx > 0 && steps[idx - 1].state !== 'upcoming';

          return (
            <li key={step.key} className="setup-stepper__item" data-state={step.state}>
              {idx > 0 && <span className={`setup-stepper__connector${connectorDone ? ' setup-stepper__connector--done' : ''}`} aria-hidden />}

              <button
                type="button"
                className="setup-stepper__button"
                aria-current={step.state === 'current' ? 'step' : undefined}
                onClick={step.onClick}
                disabled={!step.onClick}
              >
                <span className="setup-stepper__icon" aria-hidden>
                  {step.state === 'done' ? <Icon name="check" size={14} stroke="currentColor" width={2.4} /> : <Icon name={step.icon} size={14} stroke="currentColor" width={2} />}
                </span>
                <span className="setup-stepper__label">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
