type StatusType = "critical" | "on-mission" | "ready" | "standby" | "completed" | "open" | "verified" | "assigned" | "en_route" | "arrived" | "resolved" | "failed" | "pending";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  critical: { bg: "bg-alert/15", text: "text-red-400", dot: "bg-alert", pulse: true },
  "on-mission": { bg: "bg-orange-dim", text: "text-orange", dot: "bg-orange" },
  ready: { bg: "bg-ops/10", text: "text-ops", dot: "bg-ops" },
  standby: { bg: "bg-surface-3", text: "text-muted", dot: "bg-dim" },
  completed: { bg: "bg-intel/10", text: "text-intel", dot: "bg-intel" },
  open: { bg: "bg-alert/10", text: "text-alert", dot: "bg-alert", pulse: true },
  verified: { bg: "bg-ops/10", text: "text-ops", dot: "bg-ops" },
  assigned: { bg: "bg-orange-dim", text: "text-orange", dot: "bg-orange" },
  en_route: { bg: "bg-orange-dim", text: "text-orange", dot: "bg-orange", pulse: true },
  on_my_way: { bg: "bg-orange-dim", text: "text-orange", dot: "bg-orange", pulse: true },
  arrived: { bg: "bg-ops/20", text: "text-ops", dot: "bg-ops" },
  resolved: { bg: "bg-intel/10", text: "text-intel", dot: "bg-intel" },
  failed: { bg: "bg-alert/10", text: "text-alert", dot: "bg-alert" },
  pending: { bg: "bg-surface-3", text: "text-muted", dot: "bg-dim" },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.standby;
  const displayLabel = label || status.toUpperCase().replace("-", " ").replace("_", " ");

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
