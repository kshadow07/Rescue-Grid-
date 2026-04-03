"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";

interface Volunteer {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface TaskForce {
  id: string;
  name: string;
  status: string;
}

interface VictimReportFull {
  id: string;
  situation: string;
  city: string;
  district: string;
  urgency: string;
  latitude?: number;
  longitude?: number;
  status?: string;
}

interface VictimReport {
  id: string;
  situation: string;
  city: string;
  district: string;
  urgency: string;
  status?: string;
}

interface CreateAssignmentModalProps {
  linkedReportId?: string | null;
  onClose: () => void;
  onCreated?: () => void;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function CreateAssignmentModal({ linkedReportId, onClose, onCreated }: CreateAssignmentModalProps) {
  const [task, setTask] = useState("");
  const [urgency, setUrgency] = useState<"critical" | "urgent" | "moderate">("moderate");
  const [locationLabel, setLocationLabel] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [assigneeType, setAssigneeType] = useState<"volunteer" | "taskforce" | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState("");
  const [selectedTaskForce, setSelectedTaskForce] = useState("");
  const [timer, setTimer] = useState("");
  const [selectedReport, setSelectedReport] = useState(linkedReportId || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [taskForces, setTaskForces] = useState<TaskForce[]>([]);
  const [victimReports, setVictimReports] = useState<VictimReportFull[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/volunteer/list").then(r => r.json()),
      fetch("/api/dma/taskforce/list").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/victim/reports").then(r => r.json()),
    ]).then(([vols, tfs, reports]) => {
      setVolunteers(Array.isArray(vols) ? vols : []);
      setTaskForces(Array.isArray(tfs) ? tfs : []);
      const reportsArr = Array.isArray(reports) ? reports : [];
      setVictimReports(reportsArr);

      // Pre-fill location from linked victim report
      if (linkedReportId && reportsArr.length > 0) {
        const report = reportsArr.find((r) => r.id === linkedReportId);
        if (report) {
          setSelectedReport(linkedReportId);
          if (report.latitude && report.longitude) {
            setLatitude(report.latitude);
            setLongitude(report.longitude);
            const label = [report.city, report.district].filter(Boolean).join(', ');
            setLocationLabel(label || report.latitude.toFixed(4) + ', ' + report.longitude.toFixed(4));
          }
        }
      }
    }).catch(() => {});
  }, [linkedReportId]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const timer2 = setTimeout(() => {
      if (locationLabel) {
        fetchSuggestions(locationLabel);
      }
    }, 300);
    return () => clearTimeout(timer2);
  }, [locationLabel, fetchSuggestions]);

  const handleSelectSuggestion = (place: any) => {
    setLocationLabel(place.place_name);
    setLatitude(place.center[1]);
    setLongitude(place.center[0]);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setLocationLabel("");
    setLatitude(null);
    setLongitude(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const isValid = task.trim() && locationLabel.trim() && latitude !== null && longitude !== null && assigneeType && ((assigneeType === "volunteer" && selectedVolunteer) || (assigneeType === "taskforce" && selectedTaskForce));

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        task: task.trim(),
        urgency,
        location_label: locationLabel,
        latitude,
        longitude,
        victim_report_id: selectedReport || null,
        timer: timer || null,
      };

      if (assigneeType === "volunteer") {
        payload.assigned_to_volunteer = selectedVolunteer;
      } else {
        payload.assigned_to_taskforce = selectedTaskForce;
      }

      const res = await fetch("/api/dma/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create assignment");
      }

      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create assignment");
    } finally {
      setLoading(false);
    }
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
              CREATE ASSIGNMENT
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
                TASK DESCRIPTION *
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={3}
                placeholder="Rescue 30 civilians at riverbank sector 4..."
                className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-3 border-l-orange font-body text-sm text-ink placeholder:text-dim focus:outline-none focus:bg-surface-4 focus:border-orange resize-none"
              />
            </div>

            <div className="relative">
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-1">
                LOCATION *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={locationLabel}
                  onChange={(e) => {
                    setLocationLabel(e.target.value);
                    if (latitude) setLatitude(null);
                    if (longitude) setLongitude(null);
                  }}
                  placeholder="Search for a location..."
                  className="w-full px-3 py-2 pr-8 bg-surface-3 border-b border-border-dim border-l-3 border-l-orange font-body text-sm text-ink placeholder:text-dim focus:outline-none focus:bg-surface-4 focus:border-orange"
                />
                {locationLabel && (
                  <button
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-dim hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-surface-3 border border-border-dim shadow-xl max-h-48 overflow-y-auto">
                  {suggestions.map((place: any) => (
                    <button
                      key={place.id}
                      onClick={() => handleSelectSuggestion(place)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-4 border-b border-border-dim/50 last:border-b-0"
                    >
                      <div className="font-body text-[13px] text-ink">{place.place_name}</div>
                      <div className="font-mono text-[10px] text-dim">
                        {place.center[1].toFixed(4)}, {place.center[0].toFixed(4)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {latitude !== null && longitude !== null && (
                <div className="mt-1 font-mono text-[10px] text-ops">
                  ✓ Coordinates set: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </div>
              )}
            </div>

            <div>
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-2">
                URGENCY *
              </label>
              <div className="flex gap-3">
                {(["critical", "urgent", "moderate"] as const).map((level) => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="urgency"
                      value={level}
                      checked={urgency === level}
                      onChange={() => setUrgency(level)}
                      className="accent-orange"
                    />
                    <span className={`font-mono text-[11px] uppercase tracking-wider ${
                      urgency === level ? "text-orange" : "text-dim"
                    }`}>
                      {level}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-2">
                ASSIGN TO *
              </label>
              <div className="flex gap-6 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assigneeType"
                    value="volunteer"
                    checked={assigneeType === "volunteer"}
                    onChange={() => {
                      setAssigneeType("volunteer");
                      setSelectedTaskForce("");
                    }}
                    className="accent-orange"
                  />
                  <span className={`font-mono text-[11px] uppercase tracking-wider ${
                    assigneeType === "volunteer" ? "text-orange" : "text-dim"
                  }`}>
                    Individual Volunteer
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assigneeType"
                    value="taskforce"
                    checked={assigneeType === "taskforce"}
                    onChange={() => {
                      setAssigneeType("taskforce");
                      setSelectedVolunteer("");
                    }}
                    className="accent-orange"
                  />
                  <span className={`font-mono text-[11px] uppercase tracking-wider ${
                    assigneeType === "taskforce" ? "text-orange" : "text-dim"
                  }`}>
                    Task Force
                  </span>
                </label>
              </div>

              {assigneeType === "volunteer" && (
                <select
                  value={selectedVolunteer}
                  onChange={(e) => setSelectedVolunteer(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-3 border-l-orange font-body text-sm text-ink focus:outline-none focus:bg-surface-4 focus:border-orange"
                >
                  <option value="">Select volunteer...</option>
                  {volunteers.filter(v => v.status === "active").map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.type}
                    </option>
                  ))}
                </select>
              )}

              {assigneeType === "taskforce" && (
                <select
                  value={selectedTaskForce}
                  onChange={(e) => setSelectedTaskForce(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-3 border-l-orange font-body text-sm text-ink focus:outline-none focus:bg-surface-4 focus:border-orange"
                >
                  <option value="">Select task force...</option>
                  {taskForces.filter(tf => tf.status === "active").map((tf) => (
                    <option key={tf.id} value={tf.id}>{tf.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-1">
                TIMER (optional)
              </label>
              <input
                type="datetime-local"
                value={timer}
                onChange={(e) => setTimer(e.target.value)}
                className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-3 border-l-orange font-mono text-sm text-ink focus:outline-none focus:bg-surface-4 focus:border-orange"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-1">
                LINKED REPORT (optional)
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-3 border-l-orange font-body text-sm text-ink focus:outline-none focus:bg-surface-4 focus:border-orange"
              >
                <option value="">None</option>
                {victimReports.filter(r => r.status === "open" || r.status === "active").map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.situation.toUpperCase()} — {r.city}, {r.district} ({r.urgency})
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
              {loading ? "CREATING..." : "CREATE ASSIGNMENT →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}