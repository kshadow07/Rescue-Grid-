'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';

interface Volunteer {
  id: string;
  name: string;
  type: string;
  skills: string;
  equipment: string;
  status: string;
  mobile_no: string;
}

export default function VolunteerProfilePage() {
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/volunteer/me');
        if (res.ok) {
          const data = await res.json();
          setVolunteer(data);
        }
      } catch {}
      setLoading(false);
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    if (volunteer && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          if (!subscription) {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
            if (vapidKey) {
              registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
              }).then((sub) => {
                fetch('/api/volunteer/push-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ push_token: JSON.stringify(sub) }),
                });
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      });
    }
  }, [volunteer]);

  const toggleStatus = async () => {
    if (!volunteer) return;
    const newStatus = volunteer.status === 'active' ? 'offline' : 'active';
    setUpdating(true);
    try {
      const res = await fetch('/api/volunteer/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setVolunteer({ ...volunteer, status: newStatus });
      }
    } catch {}
    setUpdating(false);
  };

  const getTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'police': return 'POLICE';
      case 'ndrf': return 'NDRF';
      case 'ngo': return 'NGO';
      default: return 'INDIVIDUAL';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="font-mono text-dim text-sm">LOADING...</span>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="p-4">
        <p className="font-mono text-dim text-sm">Unable to load profile</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-16 h-16 bg-surface-3 flex items-center justify-center font-display text-2xl font-bold text-orange"
          style={{ clipPath: 'var(--clip-tactical)' }}
        >
          {volunteer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold text-ink uppercase">
            {volunteer.name}
          </h1>
          <p className="font-mono text-[10px] text-muted">{getTypeLabel(volunteer.type)}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="font-mono text-[10px] text-dim uppercase mb-2">AVAILABILITY</p>
        <button
          onClick={toggleStatus}
          disabled={updating}
          className={`w-full flex items-center justify-between p-4 transition-colors ${
            volunteer.status === 'active'
              ? 'bg-orange text-void'
              : 'bg-surface-3 text-dim'
          }`}
          style={{ clipPath: 'var(--clip-tactical)' }}
        >
          <span className="font-display text-sm font-semibold uppercase tracking-wider">
            {volunteer.status === 'active' ? 'ACTIVE' : 'OFFLINE'}
          </span>
          <span className="font-mono text-xs">
            {volunteer.status === 'active' ? '🟢' : '⚫'}
          </span>
        </button>
      </div>

      <div className="bg-surface-2 p-4 mb-4" style={{ clipPath: 'var(--clip-tactical)' }}>
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[10px] text-dim uppercase mb-1">SKILLS</p>
            <p className="text-ink font-body text-sm">
              {volunteer.skills || 'Not specified'}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-dim uppercase mb-1">EQUIPMENT</p>
            <p className="text-ink font-body text-sm">
              {volunteer.equipment || 'Not specified'}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-dim uppercase mb-1">TYPE</p>
            <p className="text-ink font-body text-sm">{getTypeLabel(volunteer.type)}</p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-dim uppercase mb-1">MOBILE</p>
            <p className="text-ink font-body text-sm">{volunteer.mobile_no || 'Not provided'}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-2 p-4" style={{ clipPath: 'var(--clip-tactical)' }}>
        <p className="font-mono text-[10px] text-dim uppercase mb-2">PUSH NOTIFICATIONS</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-ink font-body text-sm">Assignment alerts</span>
            <span className="font-mono text-[10px] text-ops">ON</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink font-body text-sm">DMA direct messages</span>
            <span className="font-mono text-[10px] text-ops">ON</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink font-body text-sm">Task force activity</span>
            <span className="font-mono text-[10px] text-ops">ON</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
