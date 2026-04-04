"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SOSSMSButton from "@/components/victim/SOSSMSButton";

type Situation = {
  type: "food" | "water" | "medical" | "rescue" | "shelter" | "missing";
  label: string;
  labelHindi: string;
  icon: string;
  borderColor: string;
};

const situations: Situation[] = [
  { type: "food", label: "Food", labelHindi: "भोजन", icon: "🍱", borderColor: "#2ECC71" },
  { type: "water", label: "Water", labelHindi: "पानी", icon: "💧", borderColor: "#3B8BFF" },
  { type: "medical", label: "Medical", labelHindi: "चिकित्सा", icon: "🏥", borderColor: "#F5A623" },
  { type: "rescue", label: "Rescue", labelHindi: "बचाव", icon: "🆘", borderColor: "#FF3B3B" },
  { type: "shelter", label: "Shelter", labelHindi: "आश्रय", icon: "🏠", borderColor: "#A855F7" },
  { type: "missing", label: "Missing", labelHindi: "लापता", icon: "👤", borderColor: "#6B7280" },
];

export default function HomePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 px-4 pt-6 pb-24">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-0 mb-2">
              <span className="font-display text-[32px] font-bold tracking-[0.1em] text-gray-900">
                RESCUE
              </span>
              <span className="font-display text-[32px] font-bold tracking-[0.1em] text-orange">
                GRID
              </span>
            </div>
            <p className="font-body text-base text-gray-500">
              Report Emergency / आपातकाल रिपोर्ट करें
            </p>
          </div>

          <div className="text-center mb-4">
            <span className="inline-block bg-red-50 text-red-600 font-mono text-xs uppercase tracking-[0.15em] px-3 py-1.5 rounded-sm border border-red-100">
              🚨 SOS - Works Without Internet
            </span>
          </div>

          {!isOnline && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-100 text-center rounded-sm">
              <p className="font-mono text-xs text-orange-600">
                📡 Offline Mode - Use SOS button below to send emergency SMS
              </p>
            </div>
          )}

          <SOSSMSButton situationType="rescue" />

          <div className="mt-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="font-mono text-xs text-gray-400 uppercase tracking-wider">or select type</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </div>

          <p className="text-center font-display text-xl font-semibold text-gray-900 mb-4 tracking-wide">
            What do you need?
          </p>

          <div className="grid grid-cols-2 gap-3">
            {situations.map((situation) => (
              <button
                key={situation.type}
                onClick={() => router.push(`/report/${situation.type}`)}
                className="relative bg-gray-50 p-4 text-left transition-all duration-150 hover:bg-gray-100 active:scale-[0.98] border border-gray-100 rounded-sm"
                style={{
                  borderLeft: `3px solid ${situation.borderColor}`,
                }}
              >
                <div className="text-3xl mb-2">{situation.icon}</div>
                <div className="font-display text-lg font-bold uppercase tracking-wide text-gray-900 mb-0.5">
                  {situation.label}
                </div>
                <div className="font-body text-sm text-gray-500">
                  {situation.labelHindi}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/report/my")}
              className="font-mono text-xs text-gray-400 uppercase tracking-[0.1em] hover:text-orange transition-colors"
            >
              📋 My Reports / मेरी रिपोर्ट
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <a
          href="tel:1070"
          className="block w-full text-center font-display font-semibold text-base uppercase tracking-[0.15em] text-white bg-orange py-3.5 px-6 transition-opacity hover:opacity-90 active:scale-[0.98] rounded-sm"
        >
          📞 Helpline: 1070
        </a>
      </div>
    </div>
  );
}
