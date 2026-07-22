export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--surface-inset)_25%,var(--surface-sunken)_50%,var(--surface-inset)_75%)] bg-[length:200%_100%] ${className}`}
    />
  );
}
