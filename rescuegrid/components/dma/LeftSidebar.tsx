"use client";

import { useState, useEffect, useCallback } from "react";

const SITUATION_TYPES = [
  { key: "food", label: "Food", color: "bg-ops" },
  { key: "water", label: "Water", color: "bg-intel" },
  { key: "medical", label: "Medical", color: "bg-caution" },
  { key: "rescue", label: "Rescue", color: "bg-alert" },
  { key: "shelter", label: "Shelter", color: "text-purple-500" },
  { key: "missing", label: "Missing", color: "bg-dim" },
];

const URGENCY_LEVELS = ["critical", "urgent", "moderate"] as const;

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

interface LeftSidebarProps {
  filters: {
    situations: string[];
    urgencies: string[];
    district: string;
  };
  onFiltersChange: (filters: { situations: string[]; urgencies: string[]; district: string }) => void;
  onLayerToggle: (layer: string, enabled: boolean) => void;
  layers: Record<string, boolean>;
  resources: Resource[];
  onResourceUpdate: (id: string, quantity: number) => void;
  districts: string[];
}

export default function LeftSidebar({
  filters,
  onFiltersChange,
  onLayerToggle,
  layers,
  resources,
  onResourceUpdate,
  districts,
}: LeftSidebarProps) {
  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleSituation = useCallback(
    (situation: string) => {
      const newSituations = filters.situations.includes(situation)
        ? filters.situations.filter((s) => s !== situation)
        : [...filters.situations, situation];
      onFiltersChange({ ...filters, situations: newSituations });
    },
    [filters, onFiltersChange]
  );

  const toggleUrgency = useCallback(
    (urgency: string) => {
      const newUrgencies = filters.urgencies.includes(urgency)
        ? filters.urgencies.filter((u) => u !== urgency)
        : [...filters.urgencies, urgency];
      onFiltersChange({ ...filters, urgencies: newUrgencies });
    },
    [filters, onFiltersChange]
  );

  const getBarColor = (resource: Resource) => {
    const pct = (resource.quantity / (resource.low_stock_threshold * 2 || 1)) * 100;
    if (resource.quantity < resource.low_stock_threshold) return "bg-alert";
    if (pct > 60) return "bg-ops";
    return "bg-caution";
  };

  const getBarPercent = (resource: Resource) => {
    const max = Math.max(resource.quantity, resource.low_stock_threshold * 2);
    return Math.min(100, (resource.quantity / max) * 100);
  };

  const handleEditStart = (resource: Resource) => {
    setEditingResource(resource.id);
    setEditValue(resource.quantity.toString());
  };

  const handleEditSave = (id: string) => {
    const qty = parseFloat(editValue);
    if (!isNaN(qty) && qty >= 0) {
      onResourceUpdate(id, qty);
    }
    setEditingResource(null);
    setEditValue("");
  };

  return (
    <aside className="w-[260px] shrink-0 bg-surface-1 border-r border-border-dim overflow-y-auto">
      <div className="p-4 space-y-6">
        <section>
          <h3 className="font-mono text-[10px] text-dim uppercase tracking-[0.2em] mb-3">
            FILTER BY NEED TYPE
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {SITUATION_TYPES.map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSituation(s.key)}
                className={`
                  px-2 py-1.5 text-left font-display text-[13px] font-semibold uppercase tracking-wide
                  border-l-[3px] transition-all text-ink
                  ${
                    filters.situations.includes(s.key)
                      ? "bg-orange-dim border-orange"
                      : "bg-surface-2 border-border-dim hover:border-dim hover:bg-surface-3"
                  }
                `}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-mono text-[10px] text-dim uppercase tracking-[0.2em] mb-3">
            URGENCY LEVEL
          </h3>
          <div className="space-y-2">
            {URGENCY_LEVELS.map((u) => (
              <button
                key={u}
                onClick={() => toggleUrgency(u)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 font-display text-[13px] font-semibold uppercase
                  transition-all
                  ${
                    filters.urgencies.includes(u)
                      ? "text-orange"
                      : "text-dim hover:text-ink"
                  }
                `}
              >
                <span
                  className={`
                    w-3 h-3 rounded-full border transition-all flex items-center justify-center
                    ${filters.urgencies.includes(u) ? "bg-orange border-orange" : "border-dim"}
                  `}
                >
                  {filters.urgencies.includes(u) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  )}
                </span>
                {u}
              </button>
            ))}
          </div>
        </section>

        {districts.length > 0 && (
          <section>
            <h3 className="font-mono text-[10px] text-dim uppercase tracking-[0.2em] mb-3">
              DISTRICT FILTER
            </h3>
            <select
              value={filters.district}
              onChange={(e) => onFiltersChange({ ...filters, district: e.target.value })}
              className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-2 border-l-orange font-body text-sm text-ink focus:outline-none focus:bg-surface-4 focus:border-orange transition-colors"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </section>
        )}

        <section>
          <h3 className="font-mono text-[10px] text-dim uppercase tracking-[0.2em] mb-3">
            MAP LAYERS
          </h3>
          <div className="space-y-2">
            {[
              { key: "needPins", label: "Need Pins" },
              { key: "volunteers", label: "Volunteer Locations" },
              { key: "reliefCamps", label: "Relief Camps" },
              { key: "hospitals", label: "Nearby Hospitals" },
            ].map((layer) => (
              <label
                key={layer.key}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={layers[layer.key]}
                  onClick={() => onLayerToggle(layer.key, !layers[layer.key])}
                  className={`
                    w-10 h-5 rounded-full transition-all relative
                    ${layers[layer.key] ? "bg-orange" : "bg-surface-4"}
                  `}
                >
                  <span
                    className={`
                      absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all
                      ${layers[layer.key] ? "left-5" : "left-0.5"}
                    `}
                  />
                </button>
                <span className={`font-display text-[12px] uppercase tracking-wide transition-colors ${layers[layer.key] ? "text-ink" : "text-dim group-hover:text-muted"}`}>
                  {layer.label}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-mono text-[10px] text-dim uppercase tracking-[0.2em] mb-3">
            RESOURCE SUMMARY
          </h3>
          <div className="space-y-4">
            {resources.map((r) => {
              const isLow = r.quantity < r.low_stock_threshold;
              const barPercent = getBarPercent(r);
              const barColor = getBarColor(r);

              return (
                <div key={r.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-[13px] font-semibold uppercase text-ink">
                      {r.name}
                    </span>
                    {isLow && (
                      <span className="font-mono text-[9px] text-alert uppercase tracking-wider px-1 py-0.5 bg-alert/10">
                        LOW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {editingResource === r.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleEditSave(r.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleEditSave(r.id)}
                        autoFocus
                        className="w-16 px-2 py-0.5 bg-surface-4 border border-orange font-mono text-[12px] text-ink focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => handleEditStart(r)}
                        className="font-mono text-[12px] text-ink hover:text-orange transition-colors"
                      >
                        {r.quantity} / {r.low_stock_threshold * 2} {r.unit}
                      </button>
                    )}
                  </div>
                  <div className="h-[3px] bg-surface-4 w-full">
                    <div
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
