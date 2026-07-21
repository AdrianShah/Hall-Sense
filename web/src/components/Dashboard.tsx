"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { useCampusData } from "@/hooks/useCampusData";
import { LoginPanel } from "@/components/LoginPanel";
import { LiveStatus } from "@/components/LiveStatus";
import { TrendChart } from "@/components/TrendChart";
import { SearchPanel } from "@/components/SearchPanel";
import { LIVE_ROOM_ID } from "@/lib/firebase";

const CampusMap = dynamic(() => import("@/components/CampusMap"), {
  ssr: false,
  loading: () => (
    <div className="panel flex h-[28rem] items-center justify-center text-sm text-[var(--muted)]">
      Loading campus map…
    </div>
  ),
});

function DashboardInner() {
  const { buildings, rooms, latest, history, ready } = useCampusData();
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [focusRoomId, setFocusRoomId] = useState<string | null>(LIVE_ROOM_ID);
  const liveRoom = rooms.find((r) => r.id === LIVE_ROOM_ID);

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-glow" aria-hidden />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-10 pt-8 md:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="brand">HallSense</p>
              <p className="mt-2 max-w-xl text-base text-[var(--muted)] md:text-lg">
                Know the lecture hall before you walk across Keele.
              </p>
            </div>
            <LoginPanel />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:px-10">
        {!ready ? (
          <p className="text-sm text-[var(--muted)]">Connecting to Firebase…</p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <LiveStatus latest={latest} liveRoom={liveRoom} />
          <TrendChart history={history} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <CampusMap
            buildings={buildings}
            rooms={rooms}
            selectedBuildingId={selectedBuildingId}
            focusRoomId={focusRoomId}
          />
          <SearchPanel
            buildings={buildings}
            rooms={rooms}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
            onSelectRoom={setFocusRoomId}
          />
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-[var(--muted)] md:px-10">
        ENG 1102 Phase 3 prototype · mock room data + one live Grove sensor (Vari Hall A)
      </footer>
    </div>
  );
}

export function Dashboard() {
  return (
    <AuthProvider>
      <DashboardInner />
    </AuthProvider>
  );
}
