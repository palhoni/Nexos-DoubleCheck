import { Button, type ButtonSize } from './Button';

export interface AddButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  size?: ButtonSize;
  style?: React.CSSProperties;
}

export function AddButton({ children, onClick, size = 'md', style = {} }: AddButtonProps) {
  return (
    <Button variant="primary" size={size} icon="plus" onClick={onClick} style={style}>
      {children}
    </Button>
  );
}
