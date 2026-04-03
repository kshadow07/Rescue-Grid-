"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Report = {
  id: string;
  phone_no: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  situation: string;
  custom_message: string | null;
  urgency: string;
  status: string;
  created_at: string;
};

type Message = {
  id: string;
  content: string;
  sender_type: string;
  sender_id: string | null;
  victim_report_id: string;
  created_at: string;
  read_at: string | null;
};

const SITUATION_COLORS: Record<string, string> = {
  food: "#2ECC71",
  water: "#3B8BFF",
  medical: "#F5A623",
  rescue: "#FF3B3B",
  shelter: "#A855F7",
  missing: "#6B7280",
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatReportId(id: string, createdAt: string) {
  const year = new Date(createdAt).getFullYear();
  const shortId = id.slice(0, 4).toUpperCase();
  return `REPORT #KL-${year}-${shortId}`;
}

export default function ReportStatusPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/victim/report/${reportId}`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || "Report not found");
        } else {
          setReport(data.report);
        }
      } catch (err) {
        console.error("Report fetch error:", err);
        setError("Failed to load report");
      }
      setLoading(false);
    };

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("message")
        .select("*")
        .eq("victim_report_id", reportId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Messages fetch error:", error);
      }
      if (data) setMessages(data);
    };

    fetchReport();
    fetchMessages();

    channelRef.current = supabase
      .channel(`victim-report-${reportId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "victim_report",
          filter: `id=eq.${reportId}`,
        },
        (payload) => {
          setReport(payload.new as Report);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message",
          filter: `victim_report_id=eq.${reportId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [reportId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !report) return;
    setSending(true);
    try {
      const res = await fetch("/api/victim/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.trim(),
          victim_report_id: reportId,
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setNewMessage("");
    } catch {
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <p className="font-mono text-[11px] text-dim uppercase tracking-widest">Loading...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-[11px] text-alert uppercase tracking-widest mb-4">
            {error || "Report not found"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="font-mono text-[10px] text-muted uppercase tracking-wider hover:text-orange"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const borderColor = SITUATION_COLORS[report.situation] || "#FF6B2B";

  return (
    <div className="min-h-screen bg-void flex flex-col">
      <div
        className="px-4 py-3 border-b border-border-dim"
        style={{ borderLeft: `3px solid ${borderColor}` }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] text-orange uppercase tracking-wider">
            {formatReportId(report.id, report.created_at)}
          </span>
          <StatusBadgeForReport status={report.status} />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] uppercase px-1.5 py-0.5"
            style={{ backgroundColor: `${borderColor}22`, color: borderColor }}
          >
            {report.situation}
          </span>
          <span
            className={`font-mono text-[10px] uppercase px-1.5 py-0.5 ${
              report.urgency === "critical"
                ? "bg-alert/20 text-alert"
                : report.urgency === "urgent"
                ? "bg-orange/20 text-orange"
                : "bg-intel/20 text-intel"
            }`}
          >
            {report.urgency}
          </span>
        </div>
        <div className="mt-2">
          <p className="font-body text-[13px] text-muted">
            📍 {report.city || "Unknown"}, {report.district || ""}
          </p>
          <p className="font-mono text-[10px] text-dim mt-0.5">
            Reported: {formatTime(report.created_at)} IST
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="font-mono text-[10px] text-dim uppercase tracking-[0.15em] text-center mb-4">
          — Updates from Command —
        </p>

        {messages.length === 0 && (
          <p className="font-mono text-[11px] text-dim text-center">
            No messages yet. DMA will respond soon.
          </p>
        )}

        {messages.map((msg) => {
          const isDma = msg.sender_type === "dma";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isDma ? "items-start" : "items-end"}`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="font-mono text-[10px] text-dim uppercase">
                  {isDma ? "DMA · COMMAND" : "You"}
                </span>
                <span className="font-mono text-[10px] text-dim">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 text-sm font-body ${
                  isDma
                    ? "bg-orange-dim text-ink border-l-2 border-orange"
                    : "bg-surface-3 text-ink"
                }`}
                style={{
                  clipPath: isDma
                    ? "polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)"
                    : "polygon(0 0, 100% 0, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-border-dim">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-surface-3 border-b border-border-dim border-l-2 border-l-orange font-body text-sm text-ink placeholder:text-dim focus:outline-none focus:bg-surface-4 focus:border-orange transition-colors"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="font-display font-semibold text-[11px] uppercase tracking-[0.1em] text-black bg-orange px-4 py-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ clipPath: "polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)" }}
          >
            {sending ? "..." : "SEND →"}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border-dim">
        <a
          href="tel:1070"
          className="block w-full text-center font-display font-semibold text-[13px] uppercase tracking-[0.15em] text-black bg-orange py-3 transition-opacity hover:opacity-90"
          style={{
            clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
          }}
        >
          📞 Call Helpline: 1070
        </a>
      </div>
    </div>
  );
}

function StatusBadgeForReport({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    open: { bg: "rgba(59,139,255,0.15)", text: "#3B8BFF", dot: "#3B8BFF", label: "OPEN" },
    assigned: { bg: "rgba(255,107,43,0.12)", text: "#FF6B2B", dot: "#FF6B2B", label: "ASSIGNED" },
    "in-progress": { bg: "rgba(245,166,35,0.15)", text: "#F5A623", dot: "#F5A623", label: "IN PROGRESS" },
    resolved: { bg: "rgba(46,204,113,0.1)", text: "#2ECC71", dot: "#2ECC71", label: "RESOLVED" },
  };
  const cfg = configs[status] || configs.open;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-1"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === "open" ? "animate-pulse" : ""}`}
        style={{ backgroundColor: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}
