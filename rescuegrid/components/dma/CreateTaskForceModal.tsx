"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";

interface Volunteer {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface Assignment {
  id: string;
  task: string;
  status: string;
}

interface CreateTaskForceModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateTaskForceModal({ onClose, onCreated }: CreateTaskForceModalProps) {
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/volunteer/list").then(r => r.json()),
      fetch("/api/dma/assignment/list").then(r => r.json()),
    ]).then(([vols, assigns]) => {
      setVolunteers(Array.isArray(vols) ? vols : []);
      setAssignments(Array.isArray(assigns) ? assigns.filter((a: any) => a.status === "active") : []);
    }).catch(() => {});
  }, []);

  const toggleMember = (volunteerId: string) => {
    setSelectedMembers(prev =>
      prev.includes(volunteerId)
        ? prev.filter(id => id !== volunteerId)
        : [...prev, volunteerId]
    );
  };

  const isValid = name.trim().length > 0 && selectedMembers.length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        member_ids: selectedMembers,
        assignment_id: selectedAssignment || null,
      };

      const res = await fetch("/api/dma/taskforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create task force");
      }

      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create task force");
    } finally {
      setLoading(false);
    }
  };

  const getVolunteerStatus = (status: string): "ready" | "on-mission" | "standby" => {
    if (status === "active") return "ready";
    if (status === "on_mission" || status === "on-mission") return "on-mission";
    return "standby";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80">
      <div
        className="w-[600px] max-h-[85vh] overflow-y-auto bg-surface-2 border-t-[2px] border-orange"
        style={{ clipPath: "var(--clip-tactical)" }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-[24px] font-bold uppercase tracking-wide text-ink">
              CREATE TASK FORCE
            </h2>
            <button
              onClick={onClose}
              className="font-mono text-[11px] text-dim uppercase tracking-wider hover:text-ink transition-colors"
            >
              ✕ CLOSE
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-alert/10 border border-alert/30 font-mono text-[11px] text-alert">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-1">
                NAME *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alpha Team, Rescue Squad, etc..."
                className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-3 border-l-orange font-body text-sm text-ink placeholder:text-dim focus:outline-none focus:bg-surface-4 focus:border-orange"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-2">
                ADD MEMBERS * ({selectedMembers.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-border-dim bg-surface-3">
                {volunteers.length === 0 ? (
                  <div className="p-4 font-mono text-[11px] text-dim text-center">
                    No volunteers available
                  </div>
                ) : (
                  volunteers.map((vol) => {
                    const isSelected = selectedMembers.includes(vol.id);
                    return (
                      <button
                        key={vol.id}
                        onClick={() => toggleMember(vol.id)}
                        className={`w-full flex items-center justify-between p-3 border-b border-border-dim/50 last:border-b-0 transition-colors ${
                          isSelected ? "bg-ops/10 border-l-4 border-l-ops" : "hover:bg-surface-4"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 border ${isSelected ? "border-ops bg-ops" : "border-border-dim"} flex items-center justify-center`}>
                            {isSelected && (
                              <span className="text-void text-[10px]">✓</span>
                            )}
                          </div>
                          <div>
                            <div className="font-body text-[13px] text-ink font-semibold">{vol.name}</div>
                            <div className="font-mono text-[10px] text-dim">{vol.type}</div>
                          </div>
                        </div>
                        <StatusBadge status={getVolunteerStatus(vol.status)} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-1">
                ASSIGN MISSION (optional)
              </label>
              <select
                value={selectedAssignment}
                onChange={(e) => setSelectedAssignment(e.target.value)}
                className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-3 border-l-orange font-body text-sm text-ink focus:outline-none focus:bg-surface-4 focus:border-orange"
              >
                <option value="">None</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.task.substring(0, 60)}{a.task.length > 60 ? "..." : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              CANCEL
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isValid || loading}
            >
              {loading ? "CREATING..." : "CREATE TASK FORCE"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
