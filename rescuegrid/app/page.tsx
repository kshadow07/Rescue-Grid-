"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to volunteer login as default entry point
    router.push("/volunteer/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-0 mb-4">
          <span className="font-display text-[32px] font-bold tracking-[0.1em] text-ink">
            RESCUE
          </span>
          <span className="font-display text-[32px] font-bold tracking-[0.1em] text-orange">
            GRID
          </span>
        </div>
        <p className="font-body text-sm text-muted">Loading...</p>
      </div>
    </div>
  );
}
