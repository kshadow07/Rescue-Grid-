"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ResourceCard from "@/components/dma/resources/ResourceCard";
import CreateResourceModal from "@/components/dma/resources/CreateResourceModal";
import AllocateResourceModal from "@/components/dma/resources/AllocateResourceModal";
import ResourceAllocationList from "@/components/dma/resources/ResourceAllocationList";
import Button from "@/components/ui/Button";
import { useRealtimeSubscription } from "@/lib/realtime";
import Topbar from "@/components/dma/Topbar";

interface Resource {
  id: string;
  name: string;
  type: string;
  quantity: number;
  low_stock_threshold: number;
  unit: string;
  owner_info: string;
  location: string;
  updated_at: string;
}

export default function ResourcesPage() {
  const pathname = usePathname();
  const [loginTime] = useState(() => new Date());
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inventory" | "allocations">("inventory");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [allocationFilterId, setAllocationFilterId] = useState<string | undefined>();

  const loadResources = useCallback(async () => {
    try {
      const res = await fetch("/api/dma/resource/list");
      const data = await res.json();
      if (Array.isArray(data)) {
        const resWithAlloc = await Promise.all(
          data.map(async (r: Resource) => {
            const allocRes = await fetch(`/api/dma/resource/allocations?resource_id=${r.id}`);
            const allocData = await allocRes.json();
            const allocated = Array.isArray(allocData)
              ? allocData
                  .filter((a: { status: string }) => ["allocated", "in_use"].includes(a.status))
                  .reduce((sum: number, a: { quantity_allocated: number }) => sum + a.quantity_allocated, 0)
              : 0;
            return { ...r, quantity_allocated: allocated, quantity_available: r.quantity - allocated };
          })
        );
        setResources(resWithAlloc);
      }
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  useRealtimeSubscription(
    [
      {
        table: "resource",
        onInsert: (newResource) => {
          setResources((prev) => {
            const r = newResource as unknown as Resource;
            return [...prev, { ...r, quantity_allocated: 0, quantity_available: r.quantity }];
          });
        },
        onUpdate: (updated) => {
          const u = updated as unknown as Resource;
          setResources((prev) =>
            prev.map((r) =>
              r.id === u.id ? { ...r, ...u } : r
            )
          );
        },
        onDelete: (deleted) => {
          const d = deleted as unknown as Resource;
          setResources((prev) => prev.filter((r) => r.id !== d.id));
        },
      },
      {
        table: "resource_allocation",
        onInsert: () => loadResources(),
        onUpdate: () => loadResources(),
        onDelete: () => loadResources(),
      },
    ],
    []
  );

  const handleEdit = (id: string) => {
    console.log("Edit resource:", id);
  };

  const handleAllocate = (id: string) => {
    setSelectedResourceId(id);
    setShowAllocateModal(true);
  };

  const handleViewAllocations = (id: string) => {
    setAllocationFilterId(id);
    setActiveTab("allocations");
  };

  const handleCreated = () => {
    loadResources();
  };

  const handleAllocated = () => {
    loadResources();
  };

  return (
    <div className="min-h-screen bg-void">
      <Topbar loginTime={loginTime} />
      <div className="pt-[52px]">
        <div className="border-b border-border">
          <div className="px-6 py-4 flex justify-between items-center">
            <h1 className="font-display font-bold text-2xl text-orange uppercase tracking-wider">
              RESOURCES
            </h1>
            <Button onClick={() => setShowCreateModal(true)}>
              + ADD RESOURCE
            </Button>
          </div>

          <div className="flex px-6">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "inventory"
                ? "text-orange border-orange"
                : "text-muted border-transparent hover:text-ink"
            }`}
          >
            INVENTORY
          </button>
          <button
            onClick={() => { setActiveTab("allocations"); setAllocationFilterId(undefined); }}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "allocations"
                ? "text-orange border-orange"
                : "text-muted border-transparent hover:text-ink"
            }`}
          >
            ALLOCATIONS
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === "inventory" ? (
          loading ? (
            <div className="text-center py-12">
              <p className="font-mono text-dim text-sm">Loading resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-mono text-dim text-sm uppercase tracking-wider">
                NO RESOURCES LOGGED
              </p>
              <p className="font-mono text-dim text-xs mt-2">
                Click &quot;+ ADD RESOURCE&quot; to add your first resource
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onEdit={handleEdit}
                  onAllocate={handleAllocate}
                  onViewAllocations={handleViewAllocations}
                />
              ))}
            </div>
          )
        ) : (
          <div>
            {allocationFilterId && (
              <div className="mb-4">
                <button
                  onClick={() => setAllocationFilterId(undefined)}
                  className="text-orange font-mono text-xs hover:underline"
                >
                  ← Show All
                </button>
              </div>
            )}
            <ResourceAllocationList filterResourceId={allocationFilterId} />
          </div>
        )}
      </div>

      <CreateResourceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

      {selectedResourceId && (
        <AllocateResourceModal
          isOpen={showAllocateModal}
          onClose={() => { setShowAllocateModal(false); setSelectedResourceId(null); }}
          onAllocated={handleAllocated}
          resourceId={selectedResourceId}
        />
      )}
      </div>
    </div>
  );
}
