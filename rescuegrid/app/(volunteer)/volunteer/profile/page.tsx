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
  const [editMode, setEditMode] = useState(false);
  const [editSkills, setEditSkills] = useState('');
  const [editEquipment, setEditEquipment] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/volunteer/me');
        if (res.ok) {
          const data = await res.json();
          setVolunteer(data);
          setEditSkills(data.skills || '');
          setEditEquipment(data.equipment || '');
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

  const handleSave = async () => {
    if (!volunteer) return;
    setSaveError('');
    setUpdating(true);

    try {
      const res = await fetch('/api/volunteer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: editSkills,
          equipment: editEquipment,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || 'Failed to save');
        setUpdating(false);
        return;
      }

      const updated = await res.json();
      setVolunteer(updated);
      setEditMode(false);
    } catch {
      setSaveError('Network error. Please try again.');
    }
    setUpdating(false);
  };

  const handleCancel = () => {
    if (volunteer) {
      setEditSkills(volunteer.skills || '');
      setEditEquipment(volunteer.equipment || '');
    }
    setEditMode(false);
    setSaveError('');
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
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
        
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="px-3 py-2 bg-surface-3 text-dim font-mono text-[10px] uppercase tracking-wider hover:text-ink transition-colors"
            style={{ clipPath: 'var(--clip-tactical-sm)' }}
          >
            EDIT
          </button>
        )}
      </div>

      <div className="mb-6">
        <p className="font-mono text-[10px] text-dim uppercase mb-2">AVAILABILITY</p>
        <button
          onClick={toggleStatus}
          disabled={updating || editMode}
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
            {editMode ? (
              <textarea
                value={editSkills}
                onChange={(e) => setEditSkills(e.target.value)}
                placeholder="First Aid, Search and Rescue, CPR..."
                className="w-full h-20 px-3 py-2 bg-surface-3 border border-border text-ink font-body text-sm resize-none focus:border-orange focus:outline-none"
              />
            ) : (
              <p className="text-ink font-body text-sm">
                {volunteer.skills || 'Not specified'}
              </p>
            )}
          </div>

          <div>
            <p className="font-mono text-[10px] text-dim uppercase mb-1">EQUIPMENT</p>
            {editMode ? (
              <textarea
                value={editEquipment}
                onChange={(e) => setEditEquipment(e.target.value)}
                placeholder="Rope, First Aid Kit, Flashlight..."
                className="w-full h-20 px-3 py-2 bg-surface-3 border border-border text-ink font-body text-sm resize-none focus:border-orange focus:outline-none"
              />
            ) : (
              <p className="text-ink font-body text-sm">
                {volunteer.equipment || 'Not specified'}
              </p>
            )}
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

      {editMode && (
        <div className="space-y-3">
          {saveError && (
            <p className="font-mono text-[11px] text-alert">{saveError}</p>
          )}
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={updating}
              className="flex-1"
            >
              {updating ? 'SAVING...' : 'SAVE CHANGES'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={updating}
              className="flex-1"
            >
              CANCEL
            </Button>
          </div>
        </div>
      )}

      <div className="bg-surface-2 p-4 mt-4" style={{ clipPath: 'var(--clip-tactical)' }}>
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