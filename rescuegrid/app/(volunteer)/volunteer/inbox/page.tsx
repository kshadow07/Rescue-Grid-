'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DirectMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_id: string | null;
  sender_name?: string;
  created_at: string;
  read_at: string | null;
}

interface TaskForce {
  id: string;
  name: string;
}

interface TFMember {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function VolunteerInboxPage() {
  const router = useRouter();
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [volunteerId, setVolunteerId] = useState<string | null>(null);
  const [volunteerName, setVolunteerName] = useState<string>('');
  const [volunteerType, setVolunteerType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'taskforces'>('inbox');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [taskForces, setTaskForces] = useState<TaskForce[]>([]);
  const [tfMembers, setTfMembers] = useState<Record<string, TFMember[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedTf, setSelectedTf] = useState<string | null>(null);
  const [tfMessages, setTfMessages] = useState<DirectMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getSession = async () => {
      const cookie = document.cookie.split(';').find(c => c.trim().startsWith('volunteer_session='));
      if (cookie) {
        try {
          const session = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
          setVolunteerId(session.volunteer_id);
          setVolunteerName(session.name || 'Volunteer');
          setVolunteerType(session.type || '');
        } catch {}
      }
    };
    getSession();
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!volunteerId) return;
    try {
      const res = await fetch(`/api/volunteer/message/direct`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
    setLoading(false);
  }, [volunteerId]);

  const fetchTaskForces = useCallback(async () => {
    if (!volunteerId) return;
    try {
      const res = await fetch(`/api/volunteer/taskforces`);
      if (res.ok) {
        const data = await res.json();
        setTaskForces(data);
        
        const membersMap: Record<string, TFMember[]> = {};
        for (const tf of data) {
          const membersRes = await fetch(`/api/dma/taskforce/${tf.id}/members`);
          if (membersRes.ok) {
            const members = await membersRes.json();
            membersMap[tf.id] = members;
          }
        }
        setTfMembers(membersMap);
      }
    } catch {}
  }, [volunteerId]);

  useEffect(() => {
    if (!volunteerId) return;
    fetchMessages();
    fetchTaskForces();
  }, [volunteerId, fetchMessages, fetchTaskForces]);

  useEffect(() => {
    if (selectedTf) {
      fetchTfMessages(selectedTf);
    }
  }, [selectedTf]);

  const fetchTfMessages = async (tfId: string) => {
    try {
      const res = await fetch(`/api/volunteer/message?taskforce_id=${tfId}`);
      if (res.ok) {
        const data = await res.json();
        setTfMessages(data);
      }
    } catch {}
  };

  useEffect(() => {
    if (!volunteerId) return;

    channelRef.current = supabase
      .channel(`volunteer-inbox-${volunteerId}`)
      .on(
        'postgres_changes' as const,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
          filter: `receiver_id=eq.${volunteerId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [volunteerId, supabase, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tfMessages]);

  const handleSendDirect = async () => {
    if (!newMessage.trim() || sending || !volunteerId) return;
    setSending(true);
    try {
      const res = await fetch('/api/volunteer/message/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim(), receiver_id: volunteerId }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } catch {}
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'police': return 'bg-blue-accent/20 text-blue-accent';
      case 'ndrf': return 'bg-ops/20 text-ops';
      case 'ngo': return 'bg-purple/20 text-purple';
      default: return 'bg-surface-3 text-dim';
    }
  };

  const groupMessagesByDate = (msgs: DirectMessage[]) => {
    const groups: { date: string; messages: DirectMessage[] }[] = [];
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

  const unreadCount = messages.filter(m => !m.read_at && m.sender_type === 'dma').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-dim text-xs uppercase tracking-wider">Loading Inbox...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-1 border-b border-border-dim">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange/20 rounded-full flex items-center justify-center">
                <span className="font-display text-sm font-bold text-orange">
                  {getInitials(volunteerName)}
                </span>
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-ink uppercase tracking-wide">
                  Inbox
                </h1>
                <p className="font-mono text-[10px] text-dim">
                  {volunteerName}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <div className="w-8 h-8 bg-alert rounded-full flex items-center justify-center">
                <span className="font-mono text-[11px] font-bold text-void">{unreadCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-3 px-4 font-mono text-[11px] uppercase tracking-wider font-semibold transition-all ${
              activeTab === 'inbox'
                ? 'bg-orange text-void'
                : 'bg-surface-2 text-dim hover:bg-surface-3'
            }`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
          >
            💬 DMA Messages {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setActiveTab('taskforces')}
            className={`flex-1 py-3 px-4 font-mono text-[11px] uppercase tracking-wider font-semibold transition-all ${
              activeTab === 'taskforces'
                ? 'bg-ops text-void'
                : 'bg-surface-2 text-dim hover:bg-surface-3'
            }`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
          >
            👥 Task Force Groups
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* DMA Direct Messages Tab */}
        {activeTab === 'inbox' && (
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dim">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <p className="font-display text-lg text-ink mb-1">No DMA Messages</p>
                <p className="font-mono text-[11px] text-dim">
                  Direct messages from DMA Command will appear here
                </p>
              </div>
            ) : (
              groupMessagesByDate(messages).map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border-dim" />
                    <span className="font-mono text-[9px] text-dim uppercase tracking-wider px-2 py-0.5 bg-surface-2">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-border-dim" />
                  </div>
                  <div className="space-y-3">
                    {group.messages.map((msg) => {
                      const isDma = msg.sender_type === 'dma';
                      const isUnread = !msg.read_at && isDma;
                      return (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-lg ${
                            isDma
                              ? 'bg-orange/10 border border-orange/30'
                              : 'bg-surface-2 border border-border-dim'
                          } ${isUnread ? 'ring-2 ring-orange/50' : ''}`}
                          style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isDma ? (
                                <div className="w-8 h-8 bg-orange/20 rounded-full flex items-center justify-center">
                                  <span className="font-mono text-[10px] font-bold text-orange">DMA</span>
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-surface-3 rounded-full flex items-center justify-center">
                                  <span className="font-display text-[10px] font-bold text-dim">
                                    {getInitials(volunteerName)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className={`font-display text-[11px] font-semibold uppercase ${
                                  isUnread ? 'text-orange' : 'text-muted'
                                }`}>
                                  {isDma ? 'DMA COMMAND' : 'You'}
                                </p>
                                {isUnread && (
                                  <span className="font-mono text-[8px] text-orange uppercase">New</span>
                                )}
                              </div>
                            </div>
                            <span className="font-mono text-[9px] text-dim">{formatTime(msg.created_at)}</span>
                          </div>
                          <p className="font-body text-[14px] text-ink leading-relaxed pl-10">
                            {msg.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Task Force Groups Tab */}
        {activeTab === 'taskforces' && (
          <div className="space-y-4">
            {taskForces.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dim">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                    <path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <p className="font-display text-lg text-ink mb-1">No Task Forces</p>
                <p className="font-mono text-[11px] text-dim">
                  You're not assigned to any task force groups yet
                </p>
              </div>
            ) : (
              taskForces.map((tf) => (
                <div key={tf.id}>
                  <button
                    onClick={() => setSelectedTf(selectedTf === tf.id ? null : tf.id)}
                    className={`w-full p-4 bg-surface-2 border-l-4 transition-all ${
                      selectedTf === tf.id ? 'border-l-orange' : 'border-l-transparent'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-ops/20 rounded-full flex items-center justify-center">
                        <span className="font-display text-sm font-bold text-ops">
                          {tf.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-display text-[14px] font-semibold text-ink uppercase">
                          {tf.name}
                        </h3>
                        <p className="font-mono text-[10px] text-dim">
                          {tfMembers[tf.id]?.length || 0} members • Tap to {selectedTf === tf.id ? 'hide' : 'view'} chat
                        </p>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-dim transition-transform ${selectedTf === tf.id ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                    </div>

                    {/* Expanded Members View */}
                    {selectedTf === tf.id && tfMembers[tf.id] && (
                      <div className="mt-4 pt-4 border-t border-border-dim">
                        <p className="font-mono text-[9px] text-dim uppercase tracking-wider mb-3">Team Members</p>
                        <div className="flex flex-wrap gap-2">
                          {tfMembers[tf.id].map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 bg-surface-1 px-2 py-1.5"
                              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                member.status === 'active' ? 'bg-ops/20 text-ops' : 'bg-surface-3 text-dim'
                              }`}>
                                {getInitials(member.name)}
                              </div>
                              <span className="font-body text-[11px] text-ink">{member.name}</span>
                              <span className={`font-mono text-[8px] px-1.5 py-0.5 uppercase ${getTypeBadgeColor(member.type)}`}>
                                {member.type?.slice(0, 3)}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        <Button
                          variant="secondary"
                          onClick={() => router.push(`/volunteer/chat/${tf.id}`)}
                          className="w-full mt-4"
                        >
                          💬 Open Team Chat
                        </Button>
                      </div>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
