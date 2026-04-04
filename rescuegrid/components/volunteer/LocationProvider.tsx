'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface LocationContextType {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  permission: 'granted' | 'denied' | 'prompt' | null;
  error: string | null;
  requestPermission: () => Promise<void>;
  isTracking: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const UI_UPDATE_INTERVAL = 5000;
const DB_SYNC_THROTTLE = 30000;

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const positionRef = useRef<{ lat: number; lng: number; accuracy: number; timestamp: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const uiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDbSyncRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const sendLocationUpdate = useCallback(async (lat: number, lng: number, acc: number) => {
    const now = Date.now();
    if (now - lastDbSyncRef.current < DB_SYNC_THROTTLE) {
      return;
    }

    try {
      const res = await fetch('/api/volunteer/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: acc }),
      });

      if (res.ok) {
        lastDbSyncRef.current = now;
      }
    } catch {
      // Silent fail - will retry on next interval
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (uiIntervalRef.current) {
      clearInterval(uiIntervalRef.current);
      uiIntervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;
        positionRef.current = { lat, lng, accuracy: acc, timestamp: Date.now() };
      },
      (err) => {
        if (err.code === 1) {
          setPermission('denied');
          stopTracking();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    uiIntervalRef.current = setInterval(() => {
      const pos = positionRef.current;
      if (pos) {
        setLatitude(pos.lat);
        setLongitude(pos.lng);
        setAccuracy(pos.accuracy);
        sendLocationUpdate(pos.lat, pos.lng, pos.accuracy);
      }
    }, UI_UPDATE_INTERVAL);
  }, [sendLocationUpdate, stopTracking]);

  const requestPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setPermission('denied');
      return;
    }

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const acc = position.coords.accuracy;

          positionRef.current = { lat, lng, accuracy: acc, timestamp: Date.now() };
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(acc);
          setPermission('granted');
          setError(null);
          sendLocationUpdate(lat, lng, acc);
          startTracking();
        },
        (err) => {
          // If high accuracy timeout/unavailable, try low accuracy
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            console.log('High accuracy failed, trying low accuracy...');
            tryGetPosition(false);
            return;
          }
          if (err.code === 1) {
            setPermission('denied');
            setError('Permission denied. Please enable location access in browser settings.');
          } else {
            setPermission('prompt');
            setError(err.code === 3 ? 'Location request timed out. Try again.' : 'Location services unavailable.');
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 10000,
          maximumAge: 60000,
        }
      );
    };

    // Try high accuracy first, fallback to low accuracy
    tryGetPosition(true);
  }, [sendLocationUpdate, startTracking]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (!navigator.geolocation) {
      setPermission('denied');
      return;
    }

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const acc = position.coords.accuracy;
          positionRef.current = { lat, lng, accuracy: acc, timestamp: Date.now() };
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(acc);
          setPermission('granted');
          startTracking();
        },
        (err) => {
          // If high accuracy timeout/unavailable, try low accuracy
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            console.log('High accuracy failed on init, trying low accuracy...');
            tryGetPosition(false);
            return;
          }
          if (err.code === 1) {
            setPermission('denied');
          } else {
            setPermission('prompt');
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 10000,
          maximumAge: 60000,
        }
      );
    };

    // Try high accuracy first, fallback to low accuracy
    tryGetPosition(true);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (uiIntervalRef.current) {
        clearInterval(uiIntervalRef.current);
      }
    };
  }, [startTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (uiIntervalRef.current) {
        clearInterval(uiIntervalRef.current);
      }
    };
  }, []);

  return (
    <LocationContext.Provider
      value={{
        latitude,
        longitude,
        accuracy,
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
