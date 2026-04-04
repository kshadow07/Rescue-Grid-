"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import TargetSelector from "@/components/dma/broadcast/TargetSelector";
import ConfirmModal from "@/components/dma/broadcast/ConfirmModal";
import { createClient } from "@/lib/supabase/client";

interface TaskForce {
  id: string;
  name: string;
  member_count?: number;
}

interface LiveCounters {
  critical: number;
  active: number;
  vols: number;
}

const NAV_TABS = [
  { label: "Dashboard", href: "/dma/dashboard" },
  { label: "Task Forces", href: "/dma/deployments" },
  { label: "Resources", href: "/dma/resources" },
  { label: "Broadcast", href: "/dma/broadcast" },
  { label: "Messages", href: "/dma/messages" },
];

export default function BroadcastPage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [counters, setCounters] = useState<LiveCounters>({ critical: 0, active: 0, vols: 0 });
  const [sessionElapsed, setSessionElapsed] = useState("00:00:00");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all_volunteers" | "specific_task_force" | "everyone">("all_volunteers");
  const [selectedTaskForceId, setSelectedTaskForceId] = useState("");
  const [taskForces, setTaskForces] = useState<TaskForce[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loginTime] = useState(() => new Date());

  useEffect(() => {
    fetchCounters();
    loadTaskForces();
  }, []);

  useEffect(() => {
    loadRecipientCount();
  }, [target, selectedTaskForceId]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - loginTime.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setSessionElapsed(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [loginTime]);

  const fetchCounters = async () => {
    try {
      const res = await fetch("/api/dma/counters");
      if (res.ok) {
        const data = await res.json();
        setCounters(data);
      }
    } catch {}
  };

  const loadTaskForces = async () => {
    try {
      const res = await fetch("/api/dma/taskforce/list");
      const data = await res.json();
      setTaskForces(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load task forces:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipientCount = async () => {
    if (target !== "specific_task_force" || selectedTaskForceId) {
      try {
        const params = new URLSearchParams({ target });
        if (target === "specific_task_force" && selectedTaskForceId) {
          params.append("taskForceId", selectedTaskForceId);
        }
        const res = await fetch(`/api/dma/broadcast/preview?${params}`);
        const data = await res.json();
        setRecipientCount(data.count || 0);
      } catch (err) {
        console.error("Failed to load recipient count:", err);
        setRecipientCount(0);
      }
    } else {
      setRecipientCount(0);
    }
  };

  const handleBroadcast = () => {
    if (!message.trim()) {
      setError("Message is required");
      return;
    }
    setError("");
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setIsSending(true);
    setError("");

    try {
      const body: Record<string, string> = { message: message.trim(), target };
      if (target === "specific_task_force") {
        body.taskForceId = selectedTaskForceId;
      }

      const res = await fetch("/api/dma/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send broadcast");
      }

      setSuccess(true);
      setShowConfirmModal(false);
      setMessage("");
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast");
      setShowConfirmModal(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/dma/login");
  };

  const isActive = (href: string) => pathname === href;
  const isValid = message.trim().length > 0 && recipientCount > 0;

  return (
    <div className="min-h-screen bg-void">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-[52px] px-4 bg-surface-1 border-b border-border gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-display text-[20px] font-bold tracking-[0.08em] text-ink uppercase">
            RESCUE
          </span>
          <span className="font-display text-[20px] font-bold tracking-[0.08em] text-orange uppercase">
            GRID
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors relative
                ${isActive(tab.href) ? "text-orange" : "text-dim hover:text-ink"}
              `}
            >
              {tab.label}
              {isActive(tab.href) && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em]">
            <span className="text-dim">CRITICAL</span>
            <span className="text-[14px] font-bold text-alert">{counters.critical}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em]">
            <span className="text-dim">ACTIVE</span>
            <span className="text-[14px] font-bold text-orange">{counters.active}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em]">
            <span className="text-dim">VOLS</span>
            <span className="text-[14px] font-bold text-ink">{counters.vols}</span>
          </div>

          <div className="h-4 w-px bg-border-dim mx-1" />

          <div className="flex items-center gap-1 px-2 py-1 rounded-sm bg-ops/10">
            <span className="font-mono text-[13px] text-ops tracking-wider">{sessionElapsed}</span>
          </div>

          <div className="h-4 w-px bg-border-dim mx-1" />

          <Button
            size="small"
            variant="primary"
            onClick={() => router.push("/dma/dashboard?create=true")}
          >
            + CREATE TASK
          </Button>

          <Button
            size="small"
            variant="danger"
            onClick={() => router.push("/dma/broadcast")}
          >
            EMERGENCY BROADCAST
          </Button>

          <button
            onClick={handleLogout}
            className="font-mono text-[10px] text-dim uppercase tracking-[0.1em] hover:text-alert transition-colors ml-2"
          >
            LOGOUT
          </button>
        </div>
      </header>

      <div className="pt-[52px] flex flex-col items-center justify-start px-4 py-8">
        <div className="w-full max-w-xl">
          <h1 className="font-display font-bold text-3xl text-alert uppercase tracking-wider text-center mb-8">
            EMERGENCY BROADCAST
          </h1>

          {success && (
            <div className="bg-ops/20 border border-ops p-4 mb-6">
              <p className="font-mono text-ops text-sm text-center uppercase tracking-wider">
                Broadcast sent successfully
              </p>
            </div>
          )}

          <div className="bg-surface-2 p-6 clip-path-tactical">
            <div className="mb-6">
              <label className="font-mono text-[10px] text-orange uppercase tracking-[0.2em] block mb-2">
                MESSAGE
              </label>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError("");
                }}
                placeholder="Enter emergency broadcast message..."
                rows={6}
                maxLength={500}
                className="w-full px-3 py-2 bg-surface-3 border-b border-border-dim border-l-3 border-l-alert font-body text-sm text-ink placeholder:text-dim focus:outline-none focus:bg-surface-4 resize-none"
              />
              <div className="flex justify-between mt-1">
                {error ? (
                  <p className="font-mono text-[10px] text-alert">{error}</p>
                ) : (
                  <span />
                )}
                <span className={`font-mono text-[10px] ${message.length > 450 ? "text-alert" : "text-dim"}`}>
                  {message.length}/500
                </span>
              </div>
            </div>

            <div className="mb-6">
              {loading ? (
                <div className="font-mono text-dim text-xs">Loading task forces...</div>
              ) : (
                <TargetSelector
                  target={target}
                  onTargetChange={setTarget}
                  taskForces={taskForces}
                  selectedTaskForceId={selectedTaskForceId}
                  onTaskForceChange={setSelectedTaskForceId}
                />
              )}
            </div>

            <div className="bg-surface-3 p-3 mb-6">
              <p className="font-mono text-[10px] text-dim uppercase tracking-wider">
                Recipients:
              </p>
              <p className="font-mono text-xl text-ink mt-1">
                {recipientCount} volunteer{recipientCount !== 1 ? "s" : ""}
              </p>
            </div>

            <Button
              variant="danger"
              onClick={handleBroadcast}
              disabled={!isValid || isSending}
              className="w-full"
            >
              BROADCAST NOW
            </Button>

            {!isValid && message.trim().length > 0 && recipientCount === 0 && (
              <p className="font-mono text-[10px] text-caution text-center mt-2">
                {target === "specific_task_force" && !selectedTaskForceId
                  ? "Please select a task force"
                  : "No recipients match this target"}
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        recipientCount={recipientCount}
        message={message}
        isSending={isSending}
      />
    </div>
  );
}
