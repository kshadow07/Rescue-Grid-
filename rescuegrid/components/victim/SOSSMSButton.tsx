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
}

export function useSOSSMS() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      const tryGetPosition = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => {
            // If high accuracy fails (timeout or unavailable), try low accuracy
            if (highAccuracy && (err.code === 3 || err.code === 2)) {
              console.log("High accuracy failed, trying low accuracy...");
              tryGetPosition(false);
              return;
            }
            reject(err);
          },
          { 
            enableHighAccuracy: highAccuracy, 
            timeout: highAccuracy ? 15000 : 10000,
            maximumAge: 60000 
          }
        );
      };

      // Try high accuracy first, fallback to low accuracy
      tryGetPosition(true);
    });
  }, []);

  const openSMSApp = useCallback(
    async (phone: string, situationType: string, customMessage?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const location = await getLocation();

        const message = `RESCUEGRID SOS
Phone: ${phone}
Location: ${location.latitude},${location.longitude}
Type: ${situationType}
Msg: ${customMessage || "None"}`;

        const encodedMessage = encodeURIComponent(message);
        const smsUrl = `sms:${TWILIO_NUMBER}?body=${encodedMessage}`;

        window.location.href = smsUrl;

        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        setIsLoading(false);
        const errorMessage =
          err instanceof GeolocationPositionError
            ? "Location access denied. Please enable location services."
            : "Failed to get location. Please try again.";
        setError(errorMessage);
      }
    },
    [getLocation]
  );

  return {
    openSMSApp,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

export default function SOSSMSButton({
  situationType,
  customMessage,
  phoneNumber,
}: SOSSMSButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState(phoneNumber || "");
  const { openSMSApp, isLoading, error } = useSOSSMS();

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
            Getting Location...
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
