"use client";

import { useState, useEffect } from "react";
import MyResourceCard from "@/components/volunteer/resources/MyResourceCard";
import TFSharedResources from "@/components/volunteer/resources/TFSharedResources";
import { useRealtimeSubscription } from "@/lib/realtime";

interface ResourceAllocation {
  id: string;
  resource?: { name: string; type: string; unit: string; location?: string };
  assignment?: { task: string };
  task_force?: { name: string };
  quantity_allocated: number;
  quantity_consumed: number;
  quantity_returned: number;
  status: string;
  notes: string | null;
  allocated_at: string;
}

export default function VolunteerResourcesPage() {
  const [mine, setMine] = useState<ResourceAllocation[]>([]);
  const [taskForce, setTaskForce] = useState<ResourceAllocation[]>([]);
  const [history, setHistory] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const loadResources = async () => {
    try {
      const res = await fetch("/api/volunteer/resources");
      if (res.ok) {
        const data = await res.json();
        setMine(Array.isArray(data.mine) ? data.mine : []);
        setTaskForce(Array.isArray(data.taskForce) ? data.taskForce : []);
        setHistory(Array.isArray(data.history) ? data.history : []);
      }
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  useRealtimeSubscription(
    [
      {
        table: "resource_allocation",
        onInsert: () => loadResources(),
        onUpdate: () => loadResources(),
        onDelete: () => loadResources(),
      },
    ],
    []
  );

  const handleUpdateStatus = async (id: string, status: string, qty?: number) => {
    try {
      const body: Record<string, string | number> = { status };
      if (qty !== undefined) {
        if (status === "consumed") body.quantity_consumed = qty;
        if (status === "returned") body.quantity_returned = qty;
      }

      const res = await fetch(`/api/volunteer/resource/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        loadResources();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <p className="font-mono text-dim text-sm">Loading resources...</p>
      </div>
    );
  }

  const activeResources = mine.filter((a) => ["allocated", "in_use"].includes(a.status));

  return (
    <div className="min-h-screen bg-void pb-20">
      <div className="bg-surface-1 px-4 py-3 border-b border-border">
        <h1 className="font-display font-bold text-xl text-orange uppercase tracking-wider">
          MY RESOURCES
        </h1>
        <p className="font-mono text-[10px] text-muted mt-0.5">
          DHANBAD DISPATCH
        </p>
      </div>

      <div className="p-4 space-y-6">
        {activeResources.length > 0 && (
          <div>
            <h3 className="font-mono text-[10px] text-orange uppercase tracking-wider mb-3">
              ASSIGNED TO YOU
            </h3>
            <div className="space-y-3">
              {activeResources.map((allocation) => (
                <MyResourceCard
                  key={allocation.id}
                  allocation={allocation}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          </div>
        )}

        {taskForce.length > 0 && (
          <TFSharedResources allocations={taskForce} />
        )}

        {activeResources.length === 0 && taskForce.length === 0 && (
          <div className="text-center py-12">
            <p className="font-mono text-dim text-sm uppercase tracking-wider">
              NO RESOURCES ASSIGNED
            </p>
            <p className="font-mono text-dim text-xs mt-2">
              Resources allocated to you will appear here
            </p>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-left border-t border-border-dim pt-3"
            >
              <h3 className="font-mono text-[10px] text-orange uppercase tracking-wider">
                HISTORY ({history.length})
              </h3>
            </button>

            {showHistory && (
              <div className="space-y-3 mt-3">
                {history.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="bg-surface-2 p-4 clip-path-tactical-sm opacity-60"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-display font-semibold text-ink uppercase text-sm">
                          {allocation.resource?.name || "Resource"}
                        </h4>
                        <p className="font-mono text-[10px] text-muted">
                          {allocation.quantity_allocated} {allocation.resource?.unit || "units"}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                        allocation.status === "returned" ? "bg-caution/20 text-caution" : "bg-ops/20 text-ops"
                      }`}>
                        {allocation.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
