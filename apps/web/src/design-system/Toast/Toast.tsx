import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Alert, type AlertType } from '../Alert/Alert';

export interface ToastProps {
  type?: AlertType;
  title?: React.ReactNode;
  message?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  duration?: number;
}

export function Toast({ type = 'info', title, message, open = true, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!open || !duration) return;
    const id = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose]);

  if (!open) return null;

  const node = (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, maxWidth: 360 }}>
      <div style={{ animation: 'dbcToastIn .35s cubic-bezier(.22,.9,.32,1.18) both', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
        <Alert type={type} title={title}>
          {message}
        </Alert>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
