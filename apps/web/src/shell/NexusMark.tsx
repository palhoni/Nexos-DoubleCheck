export interface NexusMarkProps {
  size?: number;
  className?: string;
}

export function NexusMark({ size = 32, className = '' }: NexusMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      style={{ color: 'currentColor', flexShrink: 0 }}
    >
      <path d="M5 27 14 36 32 14" stroke="currentColor" strokeOpacity=".45" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 24 20 33 43 9" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
