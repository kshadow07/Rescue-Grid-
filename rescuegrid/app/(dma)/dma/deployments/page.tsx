"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Topbar from "@/components/dma/Topbar";
import CreateTaskForceModal from "@/components/dma/CreateTaskForceModal";

interface TaskForceMember {
  volunteer_id: string;
  volunteer?: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
}

interface TaskForce {
  id: string;
  name: string;
  status: string;
  assignment_id: string | null;
  created_at: string;
  member_count: number;
  members: TaskForceMember[];
  assignment_name: string | null;
}

export default function DeploymentsPage() {
  const router = useRouter();
  const [loginTime] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [taskForces, setTaskForces] = useState<TaskForce[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/dma/login");
        return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  const fetchTaskForces = useCallback(async () => {
    try {
      const res = await fetch("/api/dma/taskforce/list");
      if (res.ok) {
        const data = await res.json();
        setTaskForces(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchTaskForces();
  }, [fetchTaskForces]);

  const handleDissolve = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/dma/taskforce/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dissolved" }),
      });
      if (res.ok) {
        setTaskForces((prev) =>
          prev.map((tf) => (tf.id === id ? { ...tf, status: "dissolved" } : tf))
        );
      }
    } catch {} finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string): "ready" | "standby" | "completed" => {
    if (status === "active") return "ready";
    if (status === "dissolved") return "standby";
    return "standby";
  };

  const sortedTaskForces = [...taskForces].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <span className="font-mono text-[11px] text-dim uppercase tracking-wider">AUTHENTICATING...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <Topbar loginTime={loginTime} />

      <div className="pt-[52px] p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-[32px] font-bold uppercase tracking-wide text-ink">
              DEPLOYMENTS
            </h1>
            <p className="font-mono text-[11px] text-dim uppercase tracking-wider mt-1">
              {taskForces.filter(tf => tf.status === "active").length} ACTIVE · {taskForces.filter(tf => tf.status === "dissolved").length} DISSOLVED
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + CREATE TASK FORCE
          </Button>
        </div>

        {sortedTaskForces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-[48px] mb-4">🔴</div>
            <p className="font-mono text-[13px] text-dim uppercase tracking-wider">
              NO TASK FORCES
            </p>
            <p className="font-mono text-[11px] text-dim mt-2">
              Create a task force to organize volunteer teams
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTaskForces.map((tf) => {
              const isExpanded = expandedId === tf.id;
              const isActioning = actionLoading === tf.id;

              return (
                <div
                  key={tf.id}
                  className={`bg-surface-2 border-l-[3px] ${
                    tf.status === "active" ? "border-l-ops" : "border-l-dim"
                  } overflow-hidden`}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : tf.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-orange uppercase">
                            TF
                          </span>
                          <StatusBadge status={getStatusBadge(tf.status)} />
                          <span className="font-mono text-[10px] text-dim uppercase">
                            {tf.member_count} MEMBER{tf.member_count !== 1 ? "S" : ""}
                          </span>
                        </div>
                        <p className="font-body text-[14px] text-ink font-semibold">
                          {tf.name}
                        </p>
                        {tf.assignment_name && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-intel">📍</span>
                            <span className="font-mono text-[10px] text-intel truncate">
                              {tf.assignment_name}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-[10px] text-dim">
                          {new Date(tf.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border-dim/50 pt-3">
                      <div className="space-y-3">
                        {tf.members && tf.members.length > 0 && (
                          <div>
                            <div className="font-mono text-[10px] text-dim uppercase tracking-wider mb-2">MEMBERS</div>
                            <div className="grid grid-cols-2 gap-2">
                              {tf.members.map((member, idx) => (
                                <div
                                  key={member.volunteer_id || idx}
                                  className="flex items-center gap-2 p-2 bg-surface-3"
                                >
                                  <div className="w-8 h-8 rounded-full bg-ops/20 flex items-center justify-center font-mono text-[11px] text-ops font-bold">
                                    {member.volunteer?.name?.charAt(0) || "?"}
                                  </div>
                                  <div>
                                    <div className="font-body text-[12px] text-ink">
                                      {member.volunteer?.name || "Unknown"}
                                    </div>
                                    <div className="font-mono text-[9px] text-dim">
                                      {member.volunteer?.type || "N/A"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {tf.assignment_name && (
                          <div>
                            <div className="font-mono text-[10px] text-dim uppercase tracking-wider mb-1">ASSIGNED MISSION</div>
                            <p className="font-body text-[13px] text-ink">
                              {tf.assignment_name}
                            </p>
                          </div>
                        )}

                        <div>
                          <div className="font-mono text-[10px] text-dim uppercase tracking-wider mb-1">TASK FORCE ID</div>
                          <p className="font-mono text-[11px] text-dim">
                            {tf.id}
                          </p>
                        </div>

                        {tf.status === "active" && (
                          <div className="flex items-center gap-3 pt-2 border-t border-border-dim/50">
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dma/messages?tf=${tf.id}`);
                              }}
                            >
                              📢 OPEN ROOM
                            </Button>
                            <Button
                              variant="danger"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDissolve(tf.id);
                              }}
                              disabled={isActioning}
                            >
                              {isActioning ? "DISSOLVING..." : "✗ DISSOLVE"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTaskForceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchTaskForces}
        />
      )}
    </div>
  );
}
