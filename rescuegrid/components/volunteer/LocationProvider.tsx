'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface LocationContextType {
  latitude: number | null;
  longitude: number | null;
  permission: 'granted' | 'denied' | 'prompt' | null;
  error: string | null;
  requestPermission: () => Promise<void>;
  isTracking: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // Send location update to server
  const sendLocationUpdate = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch('/api/volunteer/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      
      if (!res.ok) {
        console.error('Failed to update location:', await res.text());
      }
    } catch (err) {
      console.error('Error sending location update:', err);
    }
  }, []);

  // Stop tracking - defined before startTracking to avoid reference issues
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Start tracking location
  const startTracking = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;

    setIsTracking(true);

    // Watch position for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setError(null);
        // Send update immediately when position changes
        sendLocationUpdate(lat, lng);
      },
      (err) => {
        console.error('Watch position error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    // Also send updates periodically as a fallback
    updateIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          sendLocationUpdate(lat, lng);
        },
        (err) => {
          console.error('Periodic location check error:', err);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }, LOCATION_UPDATE_INTERVAL);
  }, [sendLocationUpdate]);

  // Request permission and start tracking
  const requestPermission = useCallback(async () => {
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setPermission('denied');
      return;
    }

    // Try to get position - this will trigger permission prompt
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setPermission('granted');
        setError(null);
        sendLocationUpdate(lat, lng);
        // Don't call startTracking here - let the useEffect handle it
      },
      (err) => {
        console.error('Permission request error:', err);
        if (err.code === 1) {
          setPermission('denied');
          setError('Location permission denied. Please enable location access in your browser settings.');
        } else if (err.code === 2) {
          setError('Location unavailable. Please check your device settings.');
        } else {
          setError('Timeout while requesting location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [sendLocationUpdate]);

  // Initial permission check - only run once
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setPermission('denied');
      return;
    }

    // Check initial permission status without prompting
    navigator.geolocation.getCurrentPosition(
      () => {
        setPermission('granted');
      },
      (err) => {
        if (err.code === 1) {
          setPermission('denied');
        } else {
          setPermission('prompt');
        }
      },
      { enableHighAccuracy: false, timeout: 100, maximumAge: Infinity }
    );
  }, []);

  // Start/stop tracking based on permission - separate from initialization
  useEffect(() => {
    if (permission === 'granted' && !isTracking) {
      startTracking();
    } else if (permission === 'denied' && isTracking) {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]); // Only depend on permission, not isTracking/startTracking/stopTracking

  return (
    <LocationContext.Provider
      value={{
        latitude,
        longitude,
        permission,
        error,
        requestPermission,
        isTracking,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
