"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const SITUATION_COLORS: Record<string, string> = {
  food: "#2ECC71",
  water: "#3B8BFF",
  medical: "#F5A623",
  rescue: "#FF3B3B",
  shelter: "#9B59B6",
  missing: "#4A505C",
};

const URGENCY_SIZES: Record<string, number> = {
  critical: 20,
  urgent: 16,
  moderate: 12,
};

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

interface Volunteer {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  type: string;
  last_seen: string | null;
}

interface MapboxMapProps {
  filters: {
    situations: string[];
    urgencies: string[];
    district: string;
  };
  layers: Record<string, boolean>;
  onReportSelect: (report: VictimReport | null) => void;
  selectedReportId: string | null;
}

export default function MapboxMap({
  filters,
  layers,
  onReportSelect,
  selectedReportId,
}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const volunteerMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite">("dark");
  const [mapLoaded, setMapLoaded] = useState(false);
  const victimReportsRef = useRef<VictimReport[]>([]);
  const volunteersRef = useRef<Volunteer[]>([]);

  const getVolunteerStatusColor = (status: string, lastSeen: string | null): string => {
    if (status === "on-mission") return "#FF6B2B";
    const diff = lastSeen ? Date.now() - new Date(lastSeen).getTime() : 0;
    const mins = diff / 60000;
    if (mins < 2) return "#2ECC71";
    return "#4A505C";
  };

  const createVictimPopup = (report: VictimReport): mapboxgl.Popup => {
    return new mapboxgl.Popup({ offset: 15, className: "rescue-grid-popup" })
      .setHTML(`
        <div style="background:#13161B;padding:12px;font-family:'Barlow',sans-serif;min-width:200px;border-left:3px solid ${SITUATION_COLORS[report.situation] || '#FF6B2B'}">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#4A505C;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">
            ${report.situation?.toUpperCase()} · ${report.urgency?.toUpperCase()}
          </div>
          <div style="font-family:'Barlow',sans-serif;font-size:13px;color:#F0EDE8;margin-bottom:4px">
            📍 ${report.city || "Unknown"}, ${report.district || ""}
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#4A505C;margin-bottom:8px">
            ${report.phone_no} · ${new Date(report.created_at).toLocaleTimeString()}
          </div>
          ${report.custom_message ? `<div style="font-family:'Barlow',sans-serif;font-size:12px;color:#8A8F99;font-style:italic;margin-bottom:8px">"${report.custom_message}"</div>` : ""}
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em">
            STATUS: ${report.status?.toUpperCase()}
          </div>
        </div>
      `);
  };

  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;

    const visibleReports = victimReportsRef.current.filter((r) => {
      if (filters.situations.length > 0 && !filters.situations.includes(r.situation)) return false;
      if (filters.urgencies.length > 0 && !filters.urgencies.includes(r.urgency)) return false;
      if (filters.district && r.district !== filters.district) return false;
      return true;
    });

    const visibleIds = new Set(visibleReports.map((r) => r.id));

    markersRef.current.forEach((marker, id) => {
      if (!visibleIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    visibleReports.forEach((report) => {
      if (!report.latitude || !report.longitude) return;

      let marker = markersRef.current.get(report.id);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "victim-marker";
        el.style.cssText = `
          width: ${URGENCY_SIZES[report.urgency] || 14}px;
          height: ${URGENCY_SIZES[report.urgency] || 14}px;
          background: ${SITUATION_COLORS[report.situation] || "#FF6B2B"};
          border: 2px solid ${report.status === "resolved" ? "rgba(255,255,255,0.3)" : "#fff"};
          border-radius: 50%;
          cursor: pointer;
          ${report.status === "open" && report.urgency === "critical" ? "animation: pulse 1.5s infinite;" : ""}
          opacity: ${report.status === "resolved" ? 0.4 : 1};
          transition: transform 0.15s;
        `;

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.3)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([report.longitude, report.latitude])
          .setPopup(createVictimPopup(report))
          .addTo(mapRef.current!);

        el.addEventListener("click", () => {
          onReportSelect(report);
        });

        markersRef.current.set(report.id, marker);
      } else {
        marker.setPopup(createVictimPopup(report));
        if (selectedReportId === report.id) {
          marker.togglePopup();
        }
      }
    });

    volunteerMarkersRef.current.forEach((marker, id) => {
      if (!layers.volunteers) {
        marker.remove();
        volunteerMarkersRef.current.delete(id);
      }
    });

    if (layers.volunteers) {
      volunteersRef.current.forEach((v) => {
        if (!v.latitude || !v.longitude) return;

        let marker = volunteerMarkersRef.current.get(v.id);

        if (!marker) {
          const el = document.createElement("div");
          el.className = "volunteer-marker";
          el.style.cssText = `
            width: 28px;
            height: 28px;
            background: #1A1E25;
            border: 2px solid #4A505C;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 700;
            font-size: 12px;
            color: #F0EDE8;
            cursor: pointer;
            position: relative;
          `;
          el.innerHTML = `
            ${v.name.charAt(0)}
            <span style="
              position: absolute;
              bottom: -4px;
              right: -4px;
              width: 10px;
              height: 10px;
              background: ${getVolunteerStatusColor(v.status, v.last_seen)};
              border-radius: 50%;
              border: 1px solid #0D0F12;
            "></span>
          `;

          marker = new mapboxgl.Marker({ element: el })
            .setLngLat([v.longitude, v.latitude])
            .addTo(mapRef.current!);

          volunteerMarkersRef.current.set(v.id, marker);
        }
      });
    }
  }, [filters, layers, mapLoaded, selectedReportId, onReportSelect]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/satellite-streets-v12",
      center: [76.2711, 10.8505],
      zoom: 8,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setMapLoaded(true);

      map.addSource("grid-overlay", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
      markersRef.current.clear();
      volunteerMarkersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setStyle(
        mapStyle === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/satellite-streets-v12"
      );
      mapRef.current.on("style.load", () => {
        setMapLoaded(true);
      });
    }
  }, [mapStyle, mapLoaded]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, volsRes] = await Promise.all([
          fetch("/api/victim/reports"),
          fetch("/api/volunteer/locations"),
        ]);

        if (reportsRes.ok) {
          const reports = await reportsRes.json();
          victimReportsRef.current = reports;
        }
        if (volsRes.ok) {
          const vols = await volsRes.json();
          volunteersRef.current = vols;
        }
        updateMarkers();
      } catch {
        // silent fail
      }
    };

    if (mapLoaded) {
      fetchData();
    }
  }, [mapLoaded, updateMarkers]);

  useEffect(() => {
    if (mapLoaded) {
      updateMarkers();
    }
  }, [filters, layers, mapLoaded, updateMarkers]);

  useEffect(() => {
    if (!mapLoaded || !selectedReportId) return;
    const marker = markersRef.current.get(selectedReportId);
    if (marker) {
      marker.togglePopup();
    }
  }, [selectedReportId, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-void">
          <span className="font-mono text-[11px] text-dim uppercase tracking-wider">
            LOADING MAP...
          </span>
        </div>
      )}

      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => setMapStyle((s) => (s === "dark" ? "satellite" : "dark"))}
          className="px-3 py-1.5 bg-surface-2 border border-border-dim font-mono text-[10px] text-dim uppercase tracking-wider hover:text-orange hover:border-orange transition-colors"
          style={{ clipPath: "var(--clip-tactical-sm)" }}
        >
          {mapStyle === "dark" ? "🛰️ SATELLITE" : "🌑 DARK"}
        </button>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: #13161B !important;
        }
        .mapboxgl-ctrl-group {
          background: #0D0F12 !important;
          border: 1px solid rgba(255,107,43,0.15) !important;
        }
        .mapboxgl-ctrl-group button {
          background: #0D0F12 !important;
        }
        .mapboxgl-ctrl-group button:hover {
          background: #13161B !important;
        }
        .mapboxgl-ctrl-group button .mapboxgl-ctrl-icon {
          filter: invert(1);
        }
      `}</style>
    </div>
  );
}
