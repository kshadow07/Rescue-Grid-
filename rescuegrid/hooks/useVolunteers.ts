'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/lib/realtime';

export interface Volunteer {
  id: string;
  name: string;
  mobile_no: string;
  type: string;
  latitude: number;
  longitude: number;
  skills: string;
  equipment: string;
  status: string;
  tier?: number;
  last_seen: string | null;
  push_token: string | null;
}

export function useVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVolunteers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/volunteer/locations');
      if (!res.ok) throw new Error('Failed to fetch volunteers');
      const data = await res.json();
      setVolunteers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  useRealtimeSubscription<Volunteer>([
    {
      table: 'volunteer',
      onInsert: (newVol) => {
        setVolunteers((prev) => [...prev, newVol]);
      },
      onUpdate: (updatedVol) => {
        setVolunteers((prev) =>
          prev.map((v) => (v.id === updatedVol.id ? updatedVol : v))
        );
      },
      onDelete: (deletedVol) => {
        setVolunteers((prev) => prev.filter((v) => v.id !== deletedVol.id));
      },
    },
  ]);

  return { volunteers, loading, error, refresh: fetchVolunteers };
}
