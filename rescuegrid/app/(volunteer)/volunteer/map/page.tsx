'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface Assignment {
  id: string;
  task: string;
  location_label: string;
  latitude: number;
  longitude: number;
  urgency: string;
}

interface VolunteerLocation {
  latitude: number;
  longitude: number;
}

declare global {
  interface Window {
    mapboxgl: any;
  }
}

export default function VolunteerMapPage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [volunteerLocation, setVolunteerLocation] = useState<VolunteerLocation | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignment = useCallback(async () => {
    try {
      const res = await fetch('/api/volunteer/assignment');
      if (res.ok) {
        const data = await res.json();
        setAssignment(data);
      }
    } catch {}
  }, []);

  const updateLocation = useCallback(async (lat: number, lng: number) => {
    setVolunteerLocation({ latitude: lat, longitude: lng });
    try {
      await fetch('/api/volunteer/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
    } catch {}
  }, []);

  const fetchRoute = useCallback(async (volLng: number, volLat: number, destLng: number, destLat: number) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${volLng},${volLat};${destLng},${destLat}?access_token=${token}&geometries=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes?.[0]) {
          const route = data.routes[0];
          const distanceKm = (route.distance / 1000).toFixed(1);
          const durationMin = Math.round(route.duration / 60);
          setRouteInfo({ distance: `${distanceKm} km`, duration: `~${durationMin} min` });

          if (map.current && map.current.getSource('route')) {
            map.current.getSource('route').setData({
              type: 'Feature',
              properties: {},
              geometry: route.geometry,
            });
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAssignment();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setVolunteerLocation({ latitude, longitude });
          updateLocation(latitude, longitude);
        },
        () => {
          setError('Location access denied. Please enable GPS.');
        }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setVolunteerLocation({ latitude, longitude });
          updateLocation(latitude, longitude);
        },
        () => {},
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [fetchAssignment, updateLocation]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainer.current || map.current || mapContainer.current.childNodes.length > 0) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError('Mapbox token not configured');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
      document.head.appendChild(link);

      window.mapboxgl.accessToken = token;

      map.current = new window.mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [76.2711, 10.8505],
        zoom: 12,
      });

      map.current.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
      });
    };
    document.head.appendChild(script);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !map.current || !volunteerLocation) return;

    const markerEl = document.createElement('div');
    markerEl.className = 'volunteer-marker';
    markerEl.innerHTML = `<div style="width:20px;height:20px;background:#3B8BFF;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`;

    if (map.current.getSource('volunteer')) {
      map.current.getSource('volunteer').setData({
        type: 'Point',
        coordinates: [volunteerLocation.longitude, volunteerLocation.latitude],
      });
    } else {
      map.current.addSource('volunteer', {
        type: 'geojson',
        data: {
          type: 'Point',
          coordinates: [volunteerLocation.longitude, volunteerLocation.latitude],
        },
      });
      map.current.addLayer({
        id: 'volunteer-layer',
        type: 'circle',
        source: 'volunteer',
        paint: {
          'circle-radius': 8,
          'circle-color': '#3B8BFF',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
        },
      });
    }
  }, [volunteerLocation, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !map.current || !volunteerLocation || !assignment?.latitude || !assignment?.longitude) return;

    if (map.current.getSource('destination')) {
      map.current.getSource('destination').setData({
        type: 'Point',
        coordinates: [assignment.longitude, assignment.latitude],
      });
    } else {
      map.current.addSource('destination', {
        type: 'geojson',
        data: {
          type: 'Point',
          coordinates: [assignment.longitude, assignment.latitude],
        },
      });

      const el = document.createElement('div');
      el.innerHTML = `<div style="width:30px;height:30px;background:#FF6B2B;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`;

      new window.mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([assignment.longitude, assignment.latitude])
        .addTo(map.current);

      map.current.addLayer({
        id: 'destination-layer',
        type: 'circle',
        source: 'destination',
        paint: {
          'circle-radius': 10,
          'circle-color': '#FF6B2B',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
        },
      });

      map.current.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
      });
      map.current.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FF6B2B', 'line-width': 4, 'line-opacity': 0.8 },
      });
    }

    fetchRoute(volunteerLocation.longitude, volunteerLocation.latitude, assignment.longitude, assignment.latitude);

    const bounds = new window.mapboxgl.LngLatBounds()
      .extend([volunteerLocation.longitude, volunteerLocation.latitude])
      .extend([assignment.longitude, assignment.latitude]);
    map.current.fitBounds(bounds, { padding: 80 });
  }, [mapLoaded, volunteerLocation, assignment, fetchRoute]);

  const openInGoogleMaps = () => {
    if (!assignment?.latitude || !assignment?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${assignment.latitude},${assignment.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="w-full h-full min-h-[calc(100vh-180px)]" />

      {error && (
        <div className="absolute top-4 left-4 right-4 bg-surface-2 p-3" style={{ clipPath: 'var(--clip-tactical-sm)' }}>
          <p className="font-mono text-[11px] text-alert">{error}</p>
        </div>
      )}

      {assignment && (
        <div className="absolute bottom-0 left-0 right-0 bg-surface-1 border-t border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-display text-sm font-semibold text-ink uppercase">
                {assignment.location_label || 'Mission Location'}
              </p>
              {routeInfo && (
                <p className="font-mono text-[10px] text-muted">
                  {routeInfo.distance} · {routeInfo.duration} driving
                </p>
              )}
            </div>
            <Button variant="ghost" size="small" onClick={openInGoogleMaps}>
              ↗ GOOGLE MAPS
            </Button>
          </div>
        </div>
      )}

      {!assignment && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/80">
          <p className="font-mono text-dim text-sm">NO ACTIVE MISSION</p>
        </div>
      )}
    </div>
  );
}
