"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Topbar from "@/components/dma/Topbar";
import { useRouter } from "next/navigation";

interface Channel {
  id: string;
  type: "victim_thread" | "taskforce_room" | "direct";
  label: string;
  subtitle: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  is_flagged: boolean;
  phone_no?: string;
  situation?: string;
  urgency?: string;
  city?: string;
  district?: string;
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

interface TFMember {
  id: string;
  name: string;
  mobile_no: string;
  type: string;
  status: string;
  member_type: string;
  role: string;
}

function MessagesContent() {
  const router = useRouter();
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [loginTime] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeChannelData, setActiveChannelData] = useState<VictimReport | null>(null);
  const [activeTab, setActiveTab] = useState<"victim" | "volunteer" | "taskforce">("victim");
  const [tfMembers, setTfMembers] = useState<TFMember[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasClickedChannel = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/dma/login");
        return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase.auth]);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/dma/channels");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setChannels(data);
        }
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
        if (Array.isArray(data)) {
          setMessages(data);
        }
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

  const fetchTfMembers = useCallback(async () => {
    if (!activeChannel || activeChannel.type !== "taskforce_room") return;
    try {
      const res = await fetch(`/api/dma/taskforce/members?taskforce_id=${activeChannel.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTfMembers(data);
        }
      }
    } catch (err) {
      console.error("Error fetching TF members:", err);
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
      fetchTfMembers();
      markAsRead();
    }
  }, [activeChannel, fetchMessages, fetchChannelData, fetchTfMembers, markAsRead]);

  useEffect(() => {
    if (!hasClickedChannel.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

  const handleChannelClick = (channel: Channel) => {
    hasClickedChannel.current = true;
    setActiveChannel(channel);
    setTfMembers([]);
    setMessages([]);
  };

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
        hasClickedChannel.current = false;
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

  const filteredChannels = channels.filter((ch) => {
    if (activeTab === "victim") return ch.type === "victim_thread";
    if (activeTab === "volunteer") return ch.type === "direct";
    if (activeTab === "taskforce") return ch.type === "taskforce_room";
    return true;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case "critical": return "bg-alert/20 text-alert border border-alert/40";
      case "urgent": return "bg-orange/20 text-orange border border-orange/40";
      default: return "bg-intel/20 text-intel border border-intel/40";
    }
  };

  const getSituationColor = (situation: string) => {
    switch (situation?.toLowerCase()) {
      case "rescue": return "text-red-400";
      case "food": return "text-green-400";
      case "water": return "text-blue-400";
      case "medical": return "text-yellow-400";
      case "shelter": return "text-purple-400";
      case "missing": return "text-gray-400";
      default: return "text-dim";
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "police": return "bg-blue-accent/20 text-blue-accent";
      case "ndrf": return "bg-ops/20 text-ops";
      case "ngo": return "bg-purple/20 text-purple";
      default: return "bg-surface-3 text-dim";
    }
  };

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
        {/* Channel List Panel */}
        <div className="w-[280px] bg-surface-1 border-r border-border-dim flex flex-col shrink-0">
          <div className="p-3 border-b border-border-dim">
            <h2 className="font-display text-[14px] font-bold uppercase tracking-wide text-ink mb-3">
              Communication Hub
            </h2>
            
            {/* Channel Type Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => { setActiveTab("victim"); setActiveChannel(null); }}
                className={`flex-1 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors rounded ${
                  activeTab === "victim"
                    ? "bg-alert/20 text-alert border border-alert/40"
                    : "bg-surface-2 text-dim hover:text-ink border border-transparent"
                }`}
              >
                Victims
              </button>
              <button
                onClick={() => { setActiveTab("volunteer"); setActiveChannel(null); }}
                className={`flex-1 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors rounded ${
                  activeTab === "volunteer"
                    ? "bg-orange/20 text-orange border border-orange/40"
                    : "bg-surface-2 text-dim hover:text-ink border border-transparent"
                }`}
              >
                Volunteers
              </button>
              <button
                onClick={() => { setActiveTab("taskforce"); setActiveChannel(null); }}
                className={`flex-1 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors rounded ${
                  activeTab === "taskforce"
                    ? "bg-ops/20 text-ops border border-ops/40"
                    : "bg-surface-2 text-dim hover:text-ink border border-transparent"
                }`}
              >
                TF Groups
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChannels.length === 0 ? (
              <div className="p-4 text-center">
                <p className="font-mono text-dim text-[10px] uppercase tracking-wider">
                  No {activeTab} channels
                </p>
              </div>
            ) : (
              <div className="py-1">
                {filteredChannels.map((channel) => (
                  <button
                    key={`${channel.type}-${channel.id}`}
                    onClick={() => handleChannelClick(channel)}
                    className={`w-full text-left p-3 border-b border-border-dim transition-all ${
                      activeChannel?.id === channel.id && activeChannel?.type === channel.type
                        ? "bg-surface-3 border-l-2 border-l-orange"
                        : "hover:bg-surface-2 border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Channel Header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center font-display text-[11px] font-bold ${
                          channel.type === "victim_thread" ? "bg-alert/20 text-alert" :
                          channel.type === "taskforce_room" ? "bg-ops/20 text-ops" :
                          "bg-orange/20 text-orange"
                        }`}>
                          {getInitials(channel.label)}
                        </div>
                        <span className="font-display text-[11px] font-semibold text-ink uppercase truncate">
                          {channel.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {channel.is_flagged && (
                          <span className="text-alert text-[10px] animate-pulse">⚑</span>
                        )}
                        {channel.unread_count > 0 && (
                          <span className="w-5 h-5 bg-orange rounded-full flex items-center justify-center font-mono text-[9px] text-void font-bold">
                            {channel.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Channel Meta */}
                    <div className="flex items-center gap-2 mb-1">
                      {channel.type === "victim_thread" && channel.urgency && (
                        <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded ${getUrgencyColor(channel.urgency)}`}>
                          {channel.urgency}
                        </span>
                      )}
                      {channel.type === "victim_thread" && channel.situation && (
                        <span className={`font-mono text-[8px] uppercase ${getSituationColor(channel.situation)}`}>
                          {channel.situation}
                        </span>
                      )}
                      <span className="font-mono text-[9px] text-dim truncate">
                        {channel.subtitle}
                      </span>
                    </div>
                    
                    {/* Last Message Preview */}
                    {channel.last_message && (
                      <p className="font-body text-[10px] text-muted truncate leading-tight">
                        {channel.last_message}
                      </p>
                    )}
                    {channel.last_message_time && (
                      <p className="font-mono text-[8px] text-dim mt-1">
                        {formatTime(channel.last_message_time)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Thread Panel */}
        <div className="flex-1 flex flex-col bg-void">
          {activeChannel ? (
            <>
              {/* Thread Header */}
              <div className="p-4 bg-surface-1 border-b border-border-dim">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded flex items-center justify-center font-display text-[14px] font-bold ${
                    activeChannel.type === "victim_thread" ? "bg-alert/20 text-alert" :
                    activeChannel.type === "taskforce_room" ? "bg-ops/20 text-ops" :
                    "bg-orange/20 text-orange"
                  }`}>
                    {getInitials(activeChannel.label)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[14px] font-semibold text-ink uppercase truncate">
                      {activeChannel.label}
                    </h3>
                    <p className="font-mono text-[10px] text-dim">
                      {activeChannel.subtitle}
                    </p>
                  </div>
                  
                  {activeChannelData && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[9px] uppercase px-2 py-1 rounded ${getUrgencyColor(activeChannelData.urgency)}`}>
                          {activeChannelData.urgency}
                        </span>
                        <span className={`font-mono text-[9px] uppercase ${getSituationColor(activeChannelData.situation)}`}>
                          {activeChannelData.situation}
                        </span>
                      </div>
                      <p className="font-mono text-[9px] text-dim">
                        📍 {activeChannelData.city}, {activeChannelData.district}
                      </p>
                      <p className="font-mono text-[9px] text-muted">
                        📞 {activeChannelData.phone_no}
                      </p>
                    </div>
                  )}
                </div>

                {/* TF Members Panel */}
                {activeChannel.type === "taskforce_room" && tfMembers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border-dim">
                    <p className="font-mono text-[9px] text-dim uppercase tracking-wider mb-2">Team Members</p>
                    <div className="flex flex-wrap gap-2">
                      {tfMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 bg-surface-2 px-2 py-1"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            member.status === 'active' ? 'bg-ops/20 text-ops' : 'bg-surface-3 text-dim'
                          }`}>
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <span className="font-body text-[11px] text-ink">{member.name}</span>
                            <span className={`font-mono text-[7px] px-1 py-0.5 ml-1 uppercase ${getTypeBadgeColor(member.type)}`}>
                              {member.type?.slice(0, 3)}
                            </span>
                          </div>
                          {member.mobile_no && (
                            <span className="font-mono text-[8px] text-dim">{member.mobile_no}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mb-4">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dim">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </div>
                    <p className="font-mono text-dim text-[11px] uppercase tracking-wider">
                      No messages yet
                    </p>
                    <p className="font-mono text-dim text-[10px] mt-1">
                      Start the conversation
                    </p>
                  </div>
                ) : (
                  groupMessagesByDate(messages).map((group) => (
                    <div key={group.date}>
                      {/* Date Divider */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border-dim" />
                        <span className="font-mono text-[9px] text-dim uppercase tracking-wider px-2 py-0.5 bg-surface-2">
                          {group.date}
                        </span>
                        <div className="flex-1 h-px bg-border-dim" />
                      </div>
                      
                      {/* Messages */}
                      <div className="space-y-3">
                        {group.messages.map((msg) => {
                          const isDma = msg.sender_type === "dma";
                          const isFlagged = msg.is_flagged_for_dma;
                          const isUnread = !msg.read_at && !isDma;

                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isDma ? "justify-end" : "justify-start"} ${
                                isFlagged ? "bg-alert/5 -mx-2 px-2 py-2 rounded-lg border border-alert/20" : ""
                              }`}
                            >
                              <div className={`max-w-[75%] ${isDma ? "items-end" : "items-start"}`}>
                                {/* Sender Label */}
                                {!isDma && (
                                  <div className="flex items-center gap-2 mb-1.5 ml-1">
                                    <span className={`font-display text-[10px] font-semibold uppercase ${
                                      isUnread ? "text-orange" : "text-muted"
                                    }`}>
                                      {msg.sender_name || "Unknown"}
                                    </span>
                                    {isUnread && (
                                      <span className="w-2 h-2 bg-orange rounded-full animate-pulse" />
                                    )}
                                  </div>
                                )}

                                {/* DMA Badge */}
                                {isDma && (
                                  <div className="flex items-center gap-1 mb-1.5 justify-end mr-1">
                                    <span className="font-mono text-[8px] text-orange uppercase tracking-widest bg-orange/20 px-2 py-0.5 rounded">
                                      🟧 DMA COMMAND
                                    </span>
                                  </div>
                                )}

                                {/* Message Bubble */}
                                <div
                                  className={`relative px-4 py-3 ${
                                    isDma
                                      ? "bg-orange text-void"
                                      : "bg-surface-3 text-ink border border-border-dim"
                                  } ${isFlagged ? "border-l-4 border-l-alert" : ""}`}
                                  style={{
                                    clipPath: isDma
                                      ? "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)"
                                      : "polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)",
                                  }}
                                >
                                  <p className="font-body text-[14px] leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                  </p>
                                </div>

                                {/* Message Meta */}
                                <div className={`flex items-center gap-2 mt-1 ${isDma ? "justify-end" : "justify-start"} mx-1`}>
                                  <span className="font-mono text-[9px] text-dim">
                                    {formatTime(msg.created_at)}
                                  </span>
                                  {isFlagged && (
                                    <span className="font-mono text-[9px] text-alert uppercase tracking-wider">
                                      ⚑ Flagged
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

              {/* Message Input */}
              <div className="p-4 bg-surface-1 border-t border-border-dim">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={`Message ${activeChannel.label}...`}
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
              <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mb-4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dim">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <p className="font-display text-[14px] text-dim uppercase tracking-wider mb-2">
                Select a Channel
              </p>
              <p className="font-mono text-[10px] text-dim">
                Choose from Victim Reports, Volunteers, or TF Groups
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <span className="font-mono text-[11px] text-dim uppercase tracking-wider">
          LOADING...
        </span>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
