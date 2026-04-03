type StatusType = "critical" | "on-mission" | "ready" | "standby" | "completed";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  critical: { bg: "bg-alert/15", text: "text-red-400", dot: "bg-alert", pulse: true },
  "on-mission": { bg: "bg-orange-dim", text: "text-orange", dot: "bg-orange" },
  ready: { bg: "bg-ops/10", text: "text-ops", dot: "bg-ops" },
  standby: { bg: "bg-surface-3", text: "text-muted", dot: "bg-dim" },
  completed: { bg: "bg-intel/10", text: "text-intel", dot: "bg-intel" },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || status.toUpperCase().replace("-", " ");

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-mono text-[10px] uppercase tracking-[0.1em]
        px-2 py-1 rounded-none
        ${config.bg} ${config.text}
      `}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.pulse ? "animate-pulse" : ""}`}
      />
      {displayLabel}
    </span>
  );
}
