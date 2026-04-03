"use client";

import { useState, useEffect } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";

interface Responder {
  id: string;
  name: string;
  type: string;
  skills: string;
  status: string;
  last_seen: string | null;
}

interface MissionCounter {
  queue: number;
  active: number;
  duplicate: number;
  done: number;
}

interface RightSidebarProps {
  selectedReport: { id: string; phone_no: string; situation: string; urgency: string; city: string; district: string; created_at: string; custom_message?: string } | null;
  onCreateAssignment: (reportId: string) => void;
}

function timeAgo(timestamp: string | null): string {
  if (!timestamp) return "offline";
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function getResponderStatus(status: string): "on-mission" | "ready" | "standby" {
  if (status === "on-mission") return "on-mission";
  if (status === "active") return "ready";
  return "standby";
}

export default function RightSidebar({ selectedReport, onCreateAssignment }: RightSidebarProps) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [counters, setCounters] = useState<MissionCounter>({ queue: 0, active: 0, duplicate: 0, done: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [volRes, assignRes] = await Promise.all([
          fetch("/api/volunteer/list"),
          fetch("/api/dma/assignment/counts"),
        ]);

        if (volRes.ok) {
          const volData = await volRes.json();
          setResponders(volData);
        }
        if (assignRes.ok) {
          const assignData = await assignRes.json();
          setCounters(assignData);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedResponders = [...responders].sort((a, b) => {
    const order = { "on-mission": 0, ready: 1, standby: 2 };
    const statusA = getResponderStatus(a.status);
    const statusB = getResponderStatus(b.status);
    return (order[statusA] ?? 3) - (order[statusB] ?? 3);
  });

  return (
    <aside className="w-[320px] shrink-0 bg-surface-1 border-l border-border-dim overflow-y-auto">
      <div className="p-4 space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-orange">⚡</span>
            <h2 className="font-display text-[14px] font-bold uppercase tracking-wide text-ink">
              MISSION CONTROL
            </h2>
          </div>
          <p className="font-mono text-[10px] text-dim uppercase tracking-wider mb-3">
            {counters.active} ACTIVE REPORTS
          </p>

          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "queue", label: "QUEUE" },
              { key: "active", label: "ACTIVE" },
              { key: "duplicate", label: "DUPLICATE" },
              { key: "done", label: "DONE" },
            ].map((item) => (
              <div key={item.key} className="text-center">
                <div className="font-display text-[24px] font-bold text-ink">
                  {counters[item.key as keyof MissionCounter]}
                </div>
                <div className="font-mono text-[10px] text-dim uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedReport && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-alert">🆘</span>
              <h2 className="font-display text-[14px] font-bold uppercase tracking-wide text-ink">
                SELECTED REPORT
              </h2>
            </div>
            <div className="bg-surface-2 border-l-[3px] border-alert p-3 space-y-2">
              <div className="font-mono text-[10px] text-dim uppercase tracking-wider">
                {selectedReport.situation.toUpperCase()} · {selectedReport.urgency.toUpperCase()}
              </div>
              <div className="font-body text-[13px] text-ink">
                📍 {selectedReport.city}, {selectedReport.district}
              </div>
              <div className="font-mono text-[10px] text-dim">
                {selectedReport.phone_no}
              </div>
              {selectedReport.custom_message && (
                <div className="mt-2 p-2 bg-surface-3 border-l-2 border-orange/30">
                  <div className="font-mono text-[9px] text-dim uppercase tracking-wider mb-1">MESSAGE</div>
                  <div className="font-body text-[12px] text-ink/80 italic">
                    "{selectedReport.custom_message}"
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="small"
                  variant="primary"
                  onClick={() => onCreateAssignment(selectedReport.id)}
                >
                  ASSIGN →
                </Button>
                <a
                  href={`tel:${selectedReport.phone_no}`}
                  className="font-mono text-[10px] text-dim uppercase tracking-wider hover:text-orange transition-colors"
                >
                  📞 CALL
                </a>
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-ink">👥</span>
            <h2 className="font-display text-[14px] font-bold uppercase tracking-wide text-ink">
              LIVE RESPONDERS ({responders.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <span className="font-mono text-[10px] text-dim uppercase tracking-wider">
                LOADING...
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResponders.map((r) => {
                const badgeStatus = getResponderStatus(r.status);
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 p-2 bg-surface-2 border border-border-dim"
                  >
                    <div className="w-8 h-8 bg-surface-4 border border-border-dim flex items-center justify-center font-display text-[14px] font-bold text-ink uppercase shrink-0">
                      {r.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-display text-[14px] font-semibold text-ink truncate">
                          {r.name}
                        </span>
                        <StatusBadge status={badgeStatus} />
                      </div>
                      <div className="font-mono text-[10px] text-dim uppercase tracking-wider">
                        {r.type} · {r.skills?.split(",")[0] || "General"}
                      </div>
                      <div className="font-mono text-[10px] text-dim mt-0.5">
                        last seen: {timeAgo(r.last_seen)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
