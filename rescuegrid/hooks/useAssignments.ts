'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/lib/realtime';

export interface Assignment {
  id: string;
  task: string;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  urgency: string;
  status: string;
  assigned_to_volunteer: string | null;
  assigned_to_taskforce: string | null;
  victim_report_id: string | null;
  timer: string | null;
  created_at: string;
  updated_at: string;
}

export function useAssignments(filter?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    // Determine if we should wait for a filter
    const isVolunteerPath = typeof window !== 'undefined' && window.location.pathname.includes('/volunteer/');
    const isWaitingForFilter = isVolunteerPath && filter === undefined;

    if (isWaitingForFilter) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const endpoint = filter ? `/api/volunteer/assignment/queue` : '/api/dma/assignment/list';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch assignments');
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useRealtimeSubscription<Assignment>([
    {
      table: 'assignment',
      filter,
      onInsert: (newAss) => {
        // Only add if it matches our current view
        if (filter) {
          // Basic check for assigned_to_volunteer filter
          if (filter.includes('assigned_to_volunteer') && newAss.assigned_to_volunteer) {
            const volId = filter.split('=eq.')[1];
            if (newAss.assigned_to_volunteer === volId) {
              setAssignments((prev) => [newAss, ...prev]);
            }
          }
          // If it's a TF assignment, the client-side filtering is harder, 
          // but usually the DB filter will handle it.
        } else {
          setAssignments((prev) => [newAss, ...prev]);
        }
      },
      onUpdate: (updatedAss) => {
        setAssignments((prev) => {
          // If the status is no longer relevant for the current view, remove it
          if (filter && updatedAss.status === 'completed' || updatedAss.status === 'failed') {
             return prev.filter(a => a.id !== updatedAss.id);
          }
          return prev.map((a) => (a.id === updatedAss.id ? updatedAss : a));
        });
      },
      onDelete: (deletedAss) => {
        setAssignments((prev) => prev.filter((a) => a.id !== deletedAss.id));
      },
    },
  ], [filter]);

  return { assignments, loading, error, refresh: fetchAssignments };
}
