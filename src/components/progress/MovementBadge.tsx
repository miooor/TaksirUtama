import type { EvidenceLabel, MovementDirection } from "@/types/progress";

const directionConfig: Record<MovementDirection, { label: string; className: string }> = {
  improved: { label: "Meningkat", className: "bg-success/10 text-success border-success/20" },
  stable: { label: "Stabil", className: "bg-surface-inset text-text-secondary border-border-default" },
  declined: { label: "Menurun", className: "bg-warning/10 text-warning border-warning/20" },
  incomplete: { label: "Tidak lengkap", className: "bg-surface-inset text-text-disabled border-border-default" },
};

const evidenceConfig: Record<EvidenceLabel, { label: string; className: string }> = {
  improving: { label: "Meningkat", className: "bg-success/10 text-success border-success/20" },
  declining: { label: "Menurun", className: "bg-warning/10 text-warning border-warning/20" },
  stable: { label: "Stabil", className: "bg-surface-inset text-text-secondary border-border-default" },
  mixed: { label: "Bercampur", className: "bg-primary-50 text-primary-700 border-primary-200" },
  incomplete: { label: "Tidak lengkap", className: "bg-surface-inset text-text-disabled border-border-default" },
};

export function MovementBadge({ direction }: { direction: MovementDirection }) {
  const config = directionConfig[direction];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export function EvidenceBadge({ label }: { label: EvidenceLabel }) {
  const config = evidenceConfig[label];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
