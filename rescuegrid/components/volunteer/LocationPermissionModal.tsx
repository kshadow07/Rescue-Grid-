'use client';

import { useLocation } from './LocationProvider';

export default function LocationPermissionModal() {
  const { permission, error, requestPermission } = useLocation();

  // Don't show if permission is granted
  if (permission === 'granted') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/95 backdrop-blur-sm">
      <div 
        className="w-full max-w-sm mx-4 p-6 bg-surface-1"
        style={{ clipPath: 'var(--clip-tactical)' }}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange/20 flex items-center justify-center">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#FF6B2B" 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="#FF6B2B" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          </div>
          
          <h2 className="font-display text-xl font-bold text-ink uppercase tracking-wider mb-2">
            Location Access Required
          </h2>
          
          <p className="font-body text-sm text-muted">
            RescueGrid needs your location to assign you to nearby missions and track your safety during operations.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-2 p-3 space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-orange text-lg">📍</span>
              <div>
                <p className="font-display text-sm text-ink">Mission Assignment</p>
                <p className="font-mono text-[10px] text-dim">Get assigned to nearby rescue operations</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange text-lg">🛟</span>
              <div>
                <p className="font-display text-sm text-ink">Safety Tracking</p>
                <p className="font-mono text-[10px] text-dim">DMA can monitor your location for emergency support</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange text-lg">⚡</span>
              <div>
                <p className="font-display text-sm text-ink">Real-time Coordination</p>
                <p className="font-mono text-[10px] text-dim">Coordinate with your task force effectively</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-alert/10 border border-alert/30 p-3">
              <p className="font-mono text-[11px] text-alert">{error}</p>
            </div>
          )}

          {permission === 'denied' ? (
            <div className="space-y-3">
              <div className="bg-caution/10 border border-caution/30 p-3">
                <p className="font-mono text-[11px] text-caution">
                  Location permission was denied. Please enable it in your browser settings to continue.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-surface-3 text-ink font-display text-sm uppercase tracking-wider hover:bg-surface-2 transition-colors"
                style={{ clipPath: 'var(--clip-tactical-sm)' }}
              >
                Retry After Enabling Permission
              </button>
            </div>
          ) : (
            <button
              onClick={requestPermission}
              className="w-full py-4 bg-orange text-void font-display text-sm font-bold uppercase tracking-wider hover:bg-orange/90 transition-colors"
              style={{ clipPath: 'var(--clip-tactical)' }}
            >
              Allow Location Access →
            </button>
          )}
        </div>

        <p className="font-mono text-[9px] text-dim text-center mt-4 uppercase tracking-wider">
          Your location is only shared with authorized DMA personnel
        </p>
      </div>
    </div>
  );
}
