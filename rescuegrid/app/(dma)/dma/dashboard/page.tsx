"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/dma/Topbar";
import LeftSidebar from "@/components/dma/LeftSidebar";
import RightSidebar from "@/components/dma/RightSidebar";
import MapboxMap from "@/components/dma/MapboxMap";
import { createClient } from "@/lib/supabase/client";
import { createServiceClient } from "@/lib/supabase/service";

interface VictimReport {
  id: string;
  phone_no: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  situation: string;
  urgency: string;
  status: string;
  created_at: string;
  custom_message?: string;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  quantity: number;
  low_stock_threshold: number;
  unit: string;
  location: string;
  updated_at: string;
}

export default function DmaDashboardPage() {
  const router = useRouter();
  const [loginTime] = useState(() => new Date());
  const [session, setSession] = useState<{ user?: { id: string; email?: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dmaLocation, setDmaLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [filters, setFilters] = useState({
    situations: [] as string[],
    urgencies: [] as string[],
    district: "",
  });

  const [layers, setLayers] = useState({
    needPins: true,
    volunteers: true,
    reliefCamps: false,
    hospitals: false,
  });

  const [resources, setResources] = useState<Resource[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<VictimReport | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalReportId, setCreateModalReportId] = useState<string | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDmaLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setDmaLocation({ lat: 23.79, lng: 86.43 });
        }
      );
    } else {
      setDmaLocation({ lat: 23.79, lng: 86.43 });
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession) {
        router.push("/dma/login");
        return;
      }
      setSession({ user: authSession.user });
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch("/api/dma/resource/list");
        if (res.ok) {
          const data = await res.json();
          setResources(data);
        }
      } catch {
        // silent fail
      }
    };

    const fetchReports = async () => {
      try {
        const res = await fetch("/api/victim/reports");
        if (res.ok) {
          const data = await res.json();
          const uniqueDistricts = [...new Set((data as VictimReport[]).map((r: VictimReport) => r.district).filter(Boolean))] as string[];
          setDistricts(uniqueDistricts);
        }
      } catch {
        // silent fail
      }
    };

    fetchResources();
    fetchReports();
  }, []);

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const handleLayerToggle = useCallback((layer: string, enabled: boolean) => {
    setLayers((prev) => ({ ...prev, [layer]: enabled }));
  }, []);

  const handleResourceUpdate = useCallback(async (id: string, quantity: number) => {
    try {
      const res = await fetch(`/api/dma/resource/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        setResources((prev) =>
          prev.map((r) => (r.id === id ? { ...r, quantity } : r))
        );
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleReportSelect = useCallback((report: VictimReport | null) => {
    setSelectedReport(report);
  }, []);

  const handleCreateAssignment = useCallback((reportId: string) => {
    setCreateModalReportId(reportId);
    setShowCreateModal(true);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <span className="font-mono text-[11px] text-dim uppercase tracking-wider">
          AUTHENTICATING...
        </span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-void overflow-hidden">
      <Topbar loginTime={loginTime} />

      <div className="flex flex-1 pt-[52px]">
        <LeftSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onLayerToggle={handleLayerToggle}
          layers={layers}
          resources={resources}
          onResourceUpdate={handleResourceUpdate}
          districts={districts}
        />

        <main className="flex-1 relative">
          <MapboxMap
            filters={filters}
            layers={layers}
            onReportSelect={handleReportSelect}
            selectedReportId={selectedReport?.id || null}
            dmaLocation={dmaLocation}
          />
        </main>

        <RightSidebar
          selectedReport={selectedReport}
          onCreateAssignment={handleCreateAssignment}
        />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80">
          <div
            className="w-[600px] max-h-[80vh] overflow-y-auto bg-surface-2 border-t-[2px] border-orange"
            style={{ clipPath: "var(--clip-tactical)" }}
          >
            <div className="p-6">
              <h2 className="font-display text-[24px] font-bold uppercase tracking-wide text-ink mb-6">
                CREATE ASSIGNMENT
              </h2>
              <p className="font-mono text-[11px] text-dim uppercase tracking-wider mb-4">
                Assignment modal — Phase 5 feature
              </p>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateModalReportId(null);
                }}
                className="px-4 py-2 bg-surface-3 border border-border-dim font-mono text-[11px] text-dim uppercase tracking-wider hover:text-ink transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
