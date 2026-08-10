export interface NexusMarkProps {
  size?: number;
}

export function NexusMark({ size = 32 }: NexusMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 56"
      fill="none"
      aria-hidden="true"
      style={{ color: 'currentColor', flexShrink: 0 }}
    >
      <path d="M22 2 41 28 22 54 3 28 22 2Z" stroke="currentColor" strokeWidth="4" />
      <path d="m22 8 10 20-10 20-10-20L22 8Z" stroke="currentColor" strokeWidth="3" />
      <path d="m3 28 9 0M32 28h9" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
