"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import StatusTimeline from "@/components/victim/StatusTimeline";
import { VictimReport } from "@/hooks/useNeeds";

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: '#2ECC71' },
  { value: 'verified', label: 'Verified', color: '#3B8BFF' },
  { value: 'assigned', label: 'Assigned', color: '#F5A623' },
  { value: 'en_route', label: 'En Route', color: '#FF6B2B' },
  { value: 'arrived', label: 'Arrived', color: '#9B59B6' },
  { value: 'resolved', label: 'Resolved', color: '#6B7280' },
  { value: 'duplicate', label: 'Duplicate', color: '#6B7280' },
];

interface ResourceAllocation {
  id: string;
  quantity_allocated: number;
  status: string;
  resource: {
    name: string;
    type: string;
    unit: string;
  };
}

interface Responder {
  id: string;
  name: string;
  type: string;
  skills: string;
  status: string;
  last_seen: string | null;
  resource_allocations?: ResourceAllocation[];
}

interface MissionCounter {
  queue: number;
  active: number;
  duplicate: number;
  done: number;
}

interface RightSidebarProps {
  selectedReport: VictimReport | null;
  onCreateAssignment: (reportId: string) => void;
  onResolveReport: (reportId: string) => void;
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

export default function RightSidebar({ selectedReport, onCreateAssignment, onResolveReport }: RightSidebarProps) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [activeMissions, setActiveMissions] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [counters, setCounters] = useState<MissionCounter>({ queue: 0, active: 0, duplicate: 0, done: 0 });
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const fetchReportAssignments = async () => {
      if (!selectedReport) {
        setAssignments([]);
        return;
      }
      try {
        const res = await fetch(`/api/dma/assignment/list?report_id=${selectedReport.id}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(Array.isArray(data) ? data : []);
        }
      } catch {
        setAssignments([]);
      }
    };
    fetchReportAssignments();
  }, [selectedReport]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [volRes, assignRes, activeRes] = await Promise.all([
          fetch("/api/volunteer/list"),
          fetch("/api/dma/assignment/counts"),
          fetch("/api/dma/assignment/list"),
        ]);

        if (volRes.ok) {
          const volData = await volRes.json();
          setResponders(volData);
        }
        if (assignRes.ok) {
          const assignData = await assignRes.json();
          setCounters(assignData);
        }
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          setActiveMissions(activeData);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time volunteer updates
    const supabase = createClient();
    channelRef.current = supabase
      .channel('right-sidebar-volunteer-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'volunteer',
        },
        (payload) => {
          setResponders((current) => {
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Responder;
              return current.map((r) =>
                r.id === updated.id ? { ...r, ...updated } : r
              );
            } else if (payload.eventType === 'INSERT') {
              const newResponder = payload.new as Responder;
              // Check if already exists to avoid duplicates
              if (!current.find((r) => r.id === newResponder.id)) {
                return [...current, newResponder];
              }
              return current;
            } else if (payload.eventType === 'DELETE') {
              return current.filter((r) => r.id !== payload.old.id);
            }
            return current;
          });
        }
      )
      .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assignment',
          },
          (payload) => {
             // Refresh counters and assignments if it matches selected report
             fetchData();
             if (selectedReport && (payload.new as any).victim_report_id === selectedReport.id) {
               if (payload.eventType === 'INSERT') {
                 setAssignments(prev => [payload.new, ...prev]);
               } else if (payload.eventType === 'UPDATE') {
                 setAssignments(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
               } else if (payload.eventType === 'DELETE') {
                 setAssignments(prev => prev.filter(a => a.id !== payload.old.id));
               }
             }
          }
        )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedReport]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedReport || newStatus === selectedReport.status) return;
    
    setIsUpdatingStatus(true);
    setStatusError(null);
    
    try {
      const res = await fetch('/api/dma/report/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: selectedReport.id, status: newStatus }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
      
      // If status is resolved, also trigger the resolve callback
      if (newStatus === 'resolved' && onResolveReport) {
        onResolveReport(selectedReport.id);
      }
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const sortedResponders = [...responders].sort((a, b) => {
    const order = { "on-mission": 0, ready: 1, standby: 2 };
    const statusA = getResponderStatus(a.status);
    const statusB = getResponderStatus(b.status);
    return (order[statusA] ?? 3) - (order[statusB] ?? 3);
  });

  const missionsToDisplay = selectedStatus === 'done'
    ? activeMissions.filter(m => m.status === 'completed' || m.status === 'failed')
    : selectedStatus === 'open'
      ? activeMissions.filter(m => m.status === 'open')
      : selectedStatus 
        ? activeMissions.filter(m => m.status === selectedStatus)
        : activeMissions.filter(m => m.status !== 'completed' && m.status !== 'failed');

  const missionListTitle = selectedStatus === 'done'
    ? "COMPLETED MISSIONS"
    : selectedStatus === 'open'
      ? "QUEUED MISSIONS"
      : selectedStatus 
        ? `${selectedStatus.toUpperCase()} MISSIONS`
        : "ACTIVE MISSIONS";

  return (
    <aside className="w-[340px] shrink-0 bg-surface-1 border-l border-border-dim overflow-y-auto custom-scrollbar">
      <div className="p-5 space-y-8">
        {/* Mission Control Header */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange animate-pulse" />
              <h2 className="font-display text-[14px] font-black uppercase tracking-widest text-ink">
                MISSION CONTROL
              </h2>
            </div>
            <div className="font-mono text-[10px] text-orange font-bold">LIVE</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "queue", label: "QUEUE", color: "text-alert", bg: "bg-alert/5", status: "open" },
              { key: "active", label: "ACTIVE", color: "text-orange", bg: "bg-orange/5", status: "active" },
              { key: "duplicate", label: "DUPE", color: "text-dim", bg: "bg-surface-3", status: "duplicate" },
              { key: "done", label: "DONE", color: "text-ops", bg: "bg-ops/5", status: "done" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedStatus(selectedStatus === item.status ? null : item.status)}
                className={`text-left transition-all border rounded-sm p-3 group
                  ${selectedStatus === item.status 
                    ? "border-orange shadow-[0_0_10px_rgba(255,107,43,0.1)] bg-orange/5" 
                    : "border-border-dim hover:border-orange/30 bg-surface-2"
                  }`}
              >
                <div className={`font-display text-[28px] font-black ${item.color} leading-none mb-1 group-hover:scale-105 transition-transform`}>
                  {counters[item.key as keyof MissionCounter]}
                </div>
                <div className="font-mono text-[9px] text-dim uppercase tracking-[0.2em]">
                  {item.label}
                </div>
              </button>
            ))}
          </div>
        </section>

        {selectedReport ? (
          <section className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-alert">🆘</span>
              <h2 className="font-display text-[14px] font-bold uppercase tracking-wide text-ink">
                ACTIVE FOCUS
              </h2>
            </div>
            
            <div className="bg-surface-2 border border-border-dim rounded-sm overflow-hidden shadow-lg shadow-black/20">
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-mono text-[10px] text-alert font-bold uppercase tracking-wider">
                      {selectedReport.urgency} PRIORITY
                    </div>
                    <h3 className="font-display text-[16px] font-bold text-ink leading-tight">
                      {selectedReport.situation}
                    </h3>
                  </div>
                  <StatusBadge status={selectedReport.status} />
                </div>

                {/* Manual Status Control for DMA */}
                <div className="pt-2 border-t border-border-dim/50">
                  <label className="font-mono text-[9px] text-orange uppercase tracking-widest block mb-2">
                    Update Victim Status
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedReport.status}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                      disabled={isUpdatingStatus}
                      className="flex-1 px-3 py-2 bg-surface-3 border border-border-dim font-mono text-[11px] text-ink focus:outline-none focus:border-orange disabled:opacity-50 rounded-sm"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {isUpdatingStatus && (
                      <div className="w-4 h-4 border-2 border-orange border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  {statusError && (
                    <p className="mt-1 font-mono text-[9px] text-alert">{statusError}</p>
                  )}
                </div>

                <div className="space-y-3 py-4 border-y border-border-dim/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-ink/70">
                      <span className="text-[12px]">📍</span>
                      <span className="font-body text-[13px]">{selectedReport.city}, {selectedReport.district}</span>
                    </div>
                    <div className="px-2 py-0.5 bg-surface-3 rounded-full flex items-center gap-1.5 border border-border-dim">
                      <span className="text-[10px]">☀️</span>
                      <span className="font-mono text-[10px] text-dim">28°C · CLEAR</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-ink/70">
                    <span className="text-[12px]">📞</span>
                    <span className="font-mono text-[12px]">{selectedReport.phone_no}</span>
                  </div>
                </div>

                {selectedReport.custom_message && (
                  <div className="bg-surface-3 p-3 border-l-2 border-orange/50 italic">
                    <p className="font-body text-[12px] text-ink/80 leading-relaxed">
                      "{selectedReport.custom_message}"
                    </p>
                  </div>
                )}

                {/* Real-time Timeline inside Sidebar */}
                <div className="pt-2">
                  <div className="font-mono text-[9px] text-dim uppercase tracking-widest mb-4 text-center">MISSION PROGRESS</div>
                  <div className="scale-[0.85] origin-top -mx-4">
                    <StatusTimeline status={selectedReport.status} createdAt={selectedReport.created_at} />
                  </div>
                </div>
                
                {assignments.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <div className="font-mono text-[10px] text-dim uppercase tracking-widest">Active Assignments ({assignments.length})</div>
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="p-3 bg-ops/5 border border-ops/20 rounded-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-mono text-[10px] text-ops font-bold uppercase tracking-widest">ASSIGNED UNIT</div>
                          <StatusBadge status={assignment.status} />
                        </div>
                        <div className="font-display text-[14px] font-bold text-ink mb-1">
                          {assignment.task}
                        </div>
                        {assignment.assignee_name && assignment.assignee_name !== "Unassigned" && (
                          <div className="flex items-center gap-2 mt-1 mb-1">
                            <span className="font-mono text-[9px] text-dim uppercase">ASSIGNED TO:</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${assignment.assignee_type === 'taskforce' ? 'bg-intel' : 'bg-orange'}`} />
                              <span className="font-mono text-[10px] text-ink font-bold uppercase tracking-tight">
                                {assignment.assignee_name}
                              </span>
                              <span className="font-mono text-[8px] text-dim/70 uppercase px-1 border border-border-dim rounded-[2px]">
                                {assignment.assignee_type === 'taskforce' ? 'TASK FORCE' : 'VOLUNTEER'}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="font-mono text-[10px] text-dim">
                          ID: {assignment.id.slice(0, 8)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {assignments.filter(a => a.status !== 'completed' && a.status !== 'failed').length === 0 ? (
                    <Button
                      variant="primary"
                      className="flex-1 py-3"
                      onClick={() => onCreateAssignment(selectedReport.id)}
                    >
                      DEPLOY UNIT →
                    </Button>
                  ) : selectedReport.status !== 'resolved' && (
                    <Button
                      variant="primary"
                      className="flex-1 py-3 bg-ops text-black hover:bg-ops/90 border-none shadow-[0_0_15px_rgba(46,204,113,0.3)]"
                      onClick={() => onResolveReport(selectedReport.id)}
                    >
                      RESOLVE & REMOVE ✓
                    </Button>
                  )}
                  <a
                    href={`tel:${selectedReport.phone_no}`}
                    className="flex items-center justify-center px-4 border border-border-dim hover:bg-surface-3 transition-colors rounded-sm"
                  >
                    📞
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="py-12 text-center border-2 border-dashed border-border-dim rounded-lg">
            <div className="text-[24px] mb-2 opacity-30">🎯</div>
            <p className="font-mono text-[10px] text-dim uppercase tracking-widest px-8">
              Select a report from the map to view details & assign units
            </p>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-orange text-[14px]">⚡</span>
              <h2 className="font-display text-[14px] font-bold uppercase tracking-wide text-ink">
                {missionListTitle}
              </h2>
            </div>
            {loading ? (
              <div className="w-8 h-4 bg-orange/20 animate-pulse rounded-full" />
            ) : (
              <span className="bg-orange/10 px-2 py-0.5 font-mono text-[10px] text-orange rounded-full border border-orange/20">
                {missionsToDisplay.length}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {loading ? (
              [1, 2].map((i) => (
                <div key={i} className="h-24 bg-surface-2 border border-border-dim animate-pulse rounded-sm" />
              ))
            ) : missionsToDisplay.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-border-dim rounded-sm">
                <p className="font-mono text-[9px] text-dim uppercase tracking-widest">
                  No {selectedStatus || "active"} missions
                </p>
              </div>
            ) : (
              missionsToDisplay.map((mission) => (
                <div
                  key={mission.id}
                  className="bg-surface-2 border border-border-dim p-3 rounded-sm space-y-2 hover:border-orange/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] text-orange font-bold uppercase tracking-widest">
                      {mission.status}
                    </div>
                    <div className="font-mono text-[9px] text-dim">
                      {timeAgo(mission.created_at)}
                    </div>
                  </div>
                  <div className="font-display text-[13px] font-bold text-ink leading-snug">
                    {mission.task}
                  </div>
                  {mission.assignee_name && (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${mission.assignee_type === 'taskforce' ? 'bg-intel' : 'bg-orange'}`} />
                      <span className="font-mono text-[10px] text-ink font-bold uppercase tracking-tight">
                        {mission.assignee_name}
                      </span>
                      <span className="font-mono text-[8px] text-dim/60 uppercase">
                        {mission.assignee_type === 'taskforce' ? 'TASK FORCE' : 'VOLUNTEER'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-border-dim/50">
                    <div className="font-mono text-[9px] text-dim/70 truncate pr-2">
                      FOR: {mission.victim_situation || "Unknown Victim"}
                    </div>
                    <div className="font-mono text-[9px] text-dim/50">
                      ID: {mission.id.slice(0, 6)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-ink text-[14px]">📡</span>
              <h2 className="font-display text-[14px] font-bold uppercase tracking-wide text-ink">
                LIVE RESPONDERS
              </h2>
            </div>
            <span className="bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-dim rounded-full">
              {responders.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-surface-2 animate-pulse rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResponders.map((r) => {
                const badgeStatus = getResponderStatus(r.status);
                const allocations = r.resource_allocations || [];
                return (
                  <div
                    key={r.id}
                    className="group flex items-start gap-3 p-3 bg-surface-2 border border-border-dim hover:border-orange/50 transition-all duration-300 rounded-sm relative overflow-hidden"
                  >
                    {r.status === 'on-mission' && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-orange" />
                    )}
                    <div className="w-10 h-10 bg-surface-3 border border-border-dim flex items-center justify-center font-display text-[16px] font-black text-ink uppercase shrink-0 group-hover:bg-surface-4 transition-colors">
                      {r.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display text-[13px] font-bold text-ink truncate pr-2">
                          {r.name}
                        </span>
                        <StatusBadge status={badgeStatus} />
                      </div>
                      <div className="font-mono text-[9px] text-dim uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-dim/50" />
                        {r.type}
                      </div>
                      <div className="font-mono text-[9px] text-dim/60 mt-1">
                        {timeAgo(r.last_seen)}
                      </div>
                      
                      {allocations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {allocations.map((alloc) => (
                            <div key={alloc.id} className="px-1.5 py-0.5 bg-ops/5 border border-ops/10 rounded-xs">
                              <span className="font-mono text-[8px] text-ops uppercase">
                                {alloc.quantity_allocated}{alloc.resource.unit} {alloc.resource.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
