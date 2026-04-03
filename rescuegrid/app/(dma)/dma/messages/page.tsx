"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Channel {
  id: string;
  type: "victim_thread" | "taskforce_room" | "direct";
  label: string;
  subtitle: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  is_flagged: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  sender_id: string | null;
  receiver_id: string | null;
  task_force_id: string | null;
  victim_report_id: string | null;
  is_flagged_for_dma: boolean;
  created_at: string;
  read_at: string | null;
  sender_name?: string;
}

interface VictimReport {
  id: string;
  phone_no: string;
  situation: string;
  urgency: string;
  city: string;
  district: string;
  created_at: string;
  status: string;
}

export default function MessagesPage() {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeChannelData, setActiveChannelData] = useState<VictimReport | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/dma/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
    }
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!activeChannel) return;
    try {
      const res = await fetch(
        `/api/dma/message?channel_type=${activeChannel.type}&channel_id=${activeChannel.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, [activeChannel]);

  const fetchChannelData = useCallback(async () => {
    if (!activeChannel) return;
    if (activeChannel.type === "victim_thread") {
      try {
        const res = await fetch(`/api/victim/report/${activeChannel.id}`);
        if (res.ok) {
          const data = await res.json();
          setActiveChannelData(data.report);
        }
      } catch (err) {
        console.error("Error fetching channel data:", err);
      }
    } else {
      setActiveChannelData(null);
    }
  }, [activeChannel]);

  const markAsRead = useCallback(async () => {
    if (!activeChannel) return;
    try {
      await fetch("/api/dma/message/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_type: activeChannel.type,
          channel_id: activeChannel.id,
        }),
      });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  }, [activeChannel]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (activeChannel) {
      fetchMessages();
      fetchChannelData();
      markAsRead();
    }
  }, [activeChannel, fetchMessages, fetchChannelData, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!activeChannel) return;

    let filter = "";
    if (activeChannel.type === "victim_thread") {
      filter = `victim_report_id=eq.${activeChannel.id}`;
    } else if (activeChannel.type === "taskforce_room") {
      filter = `task_force_id=eq.${activeChannel.id}`;
    } else if (activeChannel.type === "direct") {
      filter = `receiver_id=eq.${activeChannel.id}`;
    }

    const channelName = `dma-messages-${activeChannel.type}-${activeChannel.id}`;
    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as const,
        {
          event: "INSERT",
          schema: "public",
          table: "message",
          filter,
        },
        () => {
          fetchMessages();
          fetchChannels();
        }
      )
      .on(
        "postgres_changes" as const,
        {
          event: "UPDATE",
          schema: "public",
          table: "message",
          filter,
        },
        () => {
          fetchMessages();
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, activeChannel, fetchChannels, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChannel || sending) return;
    setSending(true);

    try {
      const res = await fetch("/api/dma/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.trim(),
          channel_type: activeChannel.type,
          task_force_id: activeChannel.type === "taskforce_room" ? activeChannel.id : undefined,
          victim_report_id: activeChannel.type === "victim_thread" ? activeChannel.id : undefined,
          receiver_id: activeChannel.type === "direct" ? activeChannel.id : undefined,
        }),
      });

      if (res.ok) {
        setNewMessage("");
        fetchMessages();
        fetchChannels();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    msgs.forEach((msg) => {
      const msgDate = formatDate(msg.created_at);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-dim text-xs">LOADING CHANNELS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-[240px] bg-surface-1 border-r border-border-dim flex flex-col">
        <div className="p-3 border-b border-border-dim">
          <h2 className="font-display text-[14px] font-bold uppercase tracking-wide text-ink">
            Messages
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {channels.length === 0 ? (
            <div className="p-4 text-center">
              <p className="font-mono text-dim text-xs uppercase tracking-wider">
                No active channels
              </p>
            </div>
          ) : (
            <div className="py-1">
              {channels.map((channel) => (
                <button
                  key={`${channel.type}-${channel.id}`}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full text-left p-3 border-b border-border-dim transition-colors ${
                    activeChannel?.id === channel.id && activeChannel?.type === channel.type
                      ? "bg-surface-3 border-l-2 border-l-orange"
                      : "hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-display text-[12px] font-semibold text-ink uppercase truncate">
                      {channel.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {channel.is_flagged && (
                        <span className="text-alert text-[10px]">⚑</span>
                      )}
                      {channel.unread_count > 0 && (
                        <span className="w-4 h-4 bg-orange rounded-full flex items-center justify-center font-mono text-[9px] text-void font-bold">
                          {channel.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-dim truncate">
                    {channel.subtitle}
                  </p>
                  {channel.last_message && (
                    <p className="font-body text-[11px] text-muted truncate mt-1">
                      {channel.last_message}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-void">
        {activeChannel ? (
          <>
            <div className="p-3 bg-surface-1 border-b border-border-dim">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-surface-3 flex items-center justify-center font-display text-[12px] font-bold text-orange">
                  {getInitials(activeChannel.label)}
                </div>
                <div>
                  <h3 className="font-display text-[13px] font-semibold text-ink uppercase">
                    {activeChannel.label}
                  </h3>
                  <p className="font-mono text-[10px] text-dim">
                    {activeChannel.subtitle}
                  </p>
                </div>
                {activeChannelData && (
                  <div className="ml-auto text-right">
                    <span className={`font-mono text-[10px] uppercase px-2 py-0.5 ${
                      activeChannelData.urgency === "critical"
                        ? "bg-alert/20 text-alert"
                        : activeChannelData.urgency === "urgent"
                        ? "bg-orange/20 text-orange"
                        : "bg-intel/20 text-intel"
                    }`}>
                      {activeChannelData.urgency}
                    </span>
                    <p className="font-mono text-[9px] text-dim mt-0.5">
                      {activeChannelData.city}, {activeChannelData.district}
                    </p>
                    <p className="font-mono text-[9px] text-muted mt-0.5">
                      📞 {activeChannelData.phone_no}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="font-mono text-dim text-xs uppercase tracking-wider">
                    No messages yet
                  </p>
                </div>
              ) : (
                groupMessagesByDate(messages).map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-border-dim" />
                      <span className="font-mono text-[10px] text-dim uppercase tracking-wider">
                        {group.date}
                      </span>
                      <div className="flex-1 h-px bg-border-dim" />
                    </div>
                    <div className="space-y-3">
                      {group.messages.map((msg) => {
                        const isDma = msg.sender_type === "dma";
                        const isFlagged = msg.is_flagged_for_dma;
                        const isUnread = !msg.read_at && !isDma;

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isDma ? "justify-end" : "justify-start"} ${
                              isFlagged ? "bg-alert/5 -mx-2 px-2 py-2 rounded-lg" : ""
                            }`}
                          >
                            <div className={`max-w-[70%] ${isDma ? "items-end" : "items-start"}`}>
                              {!isDma && (
                                <div className="flex items-center gap-2 mb-1 ml-1">
                                  <span className={`font-display text-[10px] font-semibold uppercase ${
                                    isUnread ? "text-orange" : "text-muted"
                                  }`}>
                                    {msg.sender_name || "Victim"}
                                  </span>
                                </div>
                              )}

                              {isDma && (
                                <div className="flex items-center gap-1 mb-1 justify-end mr-1">
                                  <span className="font-mono text-[8px] text-orange uppercase tracking-widest bg-orange/20 px-2 py-0.5">
                                    🟧 DMA COMMAND
                                  </span>
                                </div>
                              )}

                              <div
                                className={`relative px-4 py-2.5 ${
                                  isDma
                                    ? "bg-orange text-void"
                                    : "bg-surface-3 text-ink"
                                } ${isFlagged ? "border-l-2 border-alert" : ""}`}
                                style={{
                                  clipPath: isDma
                                    ? "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)"
                                    : "polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)",
                                }}
                              >
                                <p className="font-body text-[14px] leading-relaxed whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                              </div>

                              <div className={`flex items-center gap-2 mt-1 ${isDma ? "justify-end" : "justify-start"} mx-1`}>
                                <span className="font-mono text-[9px] text-dim">
                                  {formatTime(msg.created_at)}
                                </span>
                                {isFlagged && (
                                  <span className="font-mono text-[9px] text-alert">
                                    ⚑ FLAGGED
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-surface-1 border-t border-border-dim">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-surface-3 border-l-2 border-l-orange font-body text-[14px] text-ink placeholder:text-dim focus:outline-none focus:bg-surface-4 transition-colors"
                  style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className={`px-6 py-3 font-display font-semibold text-[11px] uppercase tracking-[0.1em] transition-all ${
                    newMessage.trim() && !sending
                      ? "bg-orange text-void hover:bg-orange/90"
                      : "bg-surface-3 text-dim cursor-not-allowed"
                  }`}
                  style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}
                >
                  {sending ? "..." : "SEND →"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-dim"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="font-mono text-dim text-xs uppercase tracking-wider">
              Select a channel to view messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
