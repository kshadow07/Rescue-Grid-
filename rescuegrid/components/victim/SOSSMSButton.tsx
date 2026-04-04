"use client";

import { useState, useCallback } from "react";
import PhonePromptModal from "./PhonePromptModal";

const TWILIO_NUMBER = process.env.NEXT_PUBLIC_TWILIO_SMS_NUMBER || "+12494683139";

interface SOSSMSButtonProps {
  situationType: string;
  customMessage?: string;
  phoneNumber?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useSOSSMS() {
  const [isLoading, setIsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      let bestPosition: GeolocationPosition | null = null;
      let watchId: number | null = null;
      const GPS_TIMEOUT = 25000; // 25 seconds max wait
      const MIN_ACCURACY = 100; // Try to get at least 100m accuracy

      setGpsStatus("Searching for GPS satellites...");

      // Timeout - use best position we got
      const timeoutId = setTimeout(() => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
        if (bestPosition) {
          console.log(`Using best accuracy: ${bestPosition.coords.accuracy}m`);
          resolve({
            latitude: bestPosition.coords.latitude,
            longitude: bestPosition.coords.longitude,
            accuracy: bestPosition.coords.accuracy,
          });
        } else {
          reject(new Error("GPS timeout"));
        }
      }, GPS_TIMEOUT);

      // Use watchPosition to keep GPS radio warm and wait for better accuracy
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const acc = pos.coords.accuracy;
          console.log(`GPS update: ${acc}m accuracy`);

          // Keep track of best position
          if (!bestPosition || acc < bestPosition.coords.accuracy) {
            bestPosition = pos;
            setGpsStatus(`Accuracy: ${Math.round(acc)}m${acc <= MIN_ACCURACY ? " ✓" : " (improving...)"}`);
          }

          // If we got good accuracy, stop and use it immediately
          if (acc <= MIN_ACCURACY) {
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            clearTimeout(timeoutId);
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          }
        },
        (err) => {
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
          }
          clearTimeout(timeoutId);
          reject(err);
        },
        {
          enableHighAccuracy: true,  // Force GPS hardware
          timeout: 10000,
          maximumAge: 0,  // No cached positions
        }
      );
    });
  }, []);

  const openSMSApp = useCallback(
    async (phone: string, situationType: string, customMessage?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const location = await getLocation();

        const accuracyText = location.accuracy < 50 ? "High" : location.accuracy < 200 ? "Medium" : "Low";
        const message = `RESCUEGRID SOS
Phone: ${phone}
Location: ${location.latitude},${location.longitude}
Accuracy: ${accuracyText} (~${Math.round(location.accuracy)}m)
Type: ${situationType}
Msg: ${customMessage || "None"}`;

        const encodedMessage = encodeURIComponent(message);
        const smsUrl = `sms:${TWILIO_NUMBER}?body=${encodedMessage}`;

        window.location.href = smsUrl;

        setTimeout(() => {
          setIsLoading(false);
          setGpsStatus(null);
        }, 1000);
      } catch (err) {
        setIsLoading(false);
        setGpsStatus(null);
        let errorMessage = "Failed to get location. Please try again.";
        
        if (err instanceof GeolocationPositionError) {
          if (err.code === 1) {
            errorMessage = "Permission denied. Please allow location access.";
          } else if (err.code === 2) {
            errorMessage = "GPS unavailable. Please enable location services and ensure clear sky view.";
          } else if (err.code === 3) {
            errorMessage = "GPS timeout. Try moving to an open area with clear sky view.";
          }
        }
        setError(errorMessage);
      }
    },
    [getLocation]
  );

  return {
    openSMSApp,
    isLoading,
    gpsStatus,
    error,
    clearError: () => setError(null),
  };
}

export function useGPSStatus() {
  const [status, setStatus] = useState<string | null>(null);
  return { status, setStatus };
}

export default function SOSSMSButton({
  situationType,
  customMessage,
  phoneNumber,
}: SOSSMSButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState(phoneNumber || "");
  const { openSMSApp, isLoading, gpsStatus, error } = useSOSSMS();

  const handleOpenSMS = () => {
    if (!phone.trim()) {
      setShowModal(true);
      return;
    }
    openSMSApp(phone, situationType, customMessage);
  };

  const handleModalSubmit = (submittedPhone: string) => {
    setPhone(submittedPhone);
    setShowModal(false);
    openSMSApp(submittedPhone, situationType, customMessage);
  };

  const situationLabels: Record<string, string> = {
    food: "Food",
    water: "Water",
    medical: "Medical",
    rescue: "Rescue",
    shelter: "Shelter",
    missing: "Missing",
  };

  return (
    <>
      <button
        onClick={handleOpenSMS}
        disabled={isLoading}
        className="w-full text-center font-display font-bold text-[12px] uppercase tracking-[0.15em] text-white bg-alert py-2.5 px-4 transition-all hover:bg-alert/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
        }}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {gpsStatus || "Getting Location..."}
          </>
        ) : (
          <>
            <span>🚨</span>
            SOS (Offline SMS) - {situationLabels[situationType] || situationType}
          </>
        )}
      </button>

      {showModal && (
        <PhonePromptModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleModalSubmit}
          situationType={situationType}
        />
      )}

      {error && (
        <div className="mt-2 p-2 bg-alert/10 border border-alert/30">
          <p className="font-mono text-[10px] text-alert text-center">{error}</p>
        </div>
      )}
    </>
  );
}
