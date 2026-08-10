import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { useDark } from '../hooks/useDark';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  danger?: boolean;
  secondaryLabel?: string | null;
  footer?: React.ReactNode;
  width?: number;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryLoading = false,
  primaryDisabled = false,
  danger = false,
  secondaryLabel = 'Fechar',
  footer,
  width = 480,
}: ModalProps) {
  const dark = useDark();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cardBg = dark ? 'var(--color-bg-container)' : '#fff';
  const divider = dark ? 'var(--color-border)' : '#f0f0f0';

  const node = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'dbcFadeIn .2s ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          background: cardBg,
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,.18), 0 4px 12px rgba(0,0,0,.06)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'dbcModalIn .22s cubic-bezier(.22,.9,.32,1.05) both',
        }}
      >
        <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div className="dbc-text" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>
              {title}
            </div>
            {subtitle && (
              <div className="dbc-text-2" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                {subtitle}
              </div>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: dark ? 'rgba(255,255,255,.5)' : 'rgba(5,5,5,.4)', padding: 4, display: 'flex' }}
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div style={{ height: 1, background: divider, flexShrink: 0 }} />
        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>{children}</div>
        {(footer || primaryLabel || secondaryLabel) && (
          <div style={{ padding: '16px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
            {footer || (
              <>
                {secondaryLabel && (
                  <Button variant="default" onClick={onClose}>
                    {secondaryLabel}
                  </Button>
                )}
                {primaryLabel && (
                  <Button
                    variant="primary"
                    loading={primaryLoading}
                    disabled={primaryDisabled}
                    onClick={onPrimary}
                    iconRight={danger ? undefined : 'arrowR'}
                    style={danger && !primaryDisabled ? { background: '#ff4d4f', border: '1px solid #ff4d4f' } : {}}
                  >
                    {primaryLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
