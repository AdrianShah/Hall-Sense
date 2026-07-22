"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { useCampusData } from "@/hooks/useCampusData";
import { LoginPanel } from "@/components/LoginPanel";
import { Onboarding } from "@/components/Onboarding";
import { LiveStatus } from "@/components/LiveStatus";
import { TrendChart } from "@/components/TrendChart";
import { SearchPanel } from "@/components/SearchPanel";
import { LIVE_ROOM_ID, isOverheat } from "@/lib/types";

const CampusMap = dynamic(() => import("@/components/CampusMap"), {
  ssr: false,
  loading: () => (
    <div className="panel flex h-[28rem] items-center justify-center text-sm text-[var(--muted)]">
      Loading campus map…
    </div>
  ),
});

function FavouriteRooms() {
  const { profile, toggleFavourite } = useAuth();
  const { rooms, buildings, latest } = useCampusData();
  const favs = profile?.favouriteRoomIds ?? [];

  const favouriteRooms = useMemo(() => {
    return favs
      .filter((id) => id !== LIVE_ROOM_ID)
      .map((id) => {
        const room = rooms.find((r) => r.id === id);
        const building = room ? buildings.find((b) => b.id === room.buildingId) : undefined;
        return { room, building };
      })
      .filter(({ room }) => room != null);
  }, [favs, rooms, buildings]);

  if (favouriteRooms.length === 0) {
    return (
      <section className="panel">
        <p className="eyebrow">Favourites</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Search for rooms you use often and tap ☆ to add them here.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="eyebrow">Your favourites</p>
      <ul className="mt-3 space-y-2">
        {favouriteRooms.map(({ room, building }) => {
          if (!room) return null;
          const hot = isOverheat(room.tempC);
          const code = building?.code === "VH" ? "VARI" : building?.code;
          return (
            <li key={room.id}>
              <div className="room-row">
                <span className="flex-1">
                  <span className="font-medium text-[var(--ink)]">
                    {code} {room.number}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {building?.name}
                    {room.source === "live" ? " · live sensor" : ""}
                  </span>
                </span>
                <span className={`temp-badge ${hot ? "temp-badge-hot" : "temp-badge-ok"}`}>
                  {room.tempC.toFixed(1)}°C
                </span>
                <button
                  type="button"
                  className="ml-2 text-lg"
                  title="Remove from favourites"
                  onClick={() => toggleFavourite(room.id)}
                >
                  ★
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  return (
    <button
      type="button"
      className="btn-ghost"
      title="Toggle theme"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? "☀" : "☾"}
    </button>
  );
}

function DashboardInner() {
  const { user, profile, loading } = useAuth();
  const { buildings, rooms, latest, history, ready } = useCampusData();
  const [showMap, setShowMap] = useState(false);
  const [focusRoomId, setFocusRoomId] = useState<string | null>(LIVE_ROOM_ID);
  const liveRoom = rooms.find((r) => r.id === LIVE_ROOM_ID);

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <p className="brand text-center" style={{ fontSize: "2.5rem" }}>HallSense</p>
            <p className="mt-2 mb-6 text-center text-[var(--muted)]">
              Know the lecture hall before you walk across Keele.
            </p>
            <LoginPanel />
          </div>
        </div>
      </div>
    );
  }

  if (profile && !profile.onboardingComplete) {
    return <Onboarding />;
  }

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
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LoginPanel />
            </div>
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

        <FavouriteRooms />

        <div className="grid gap-6 lg:grid-cols-2">
          <SearchPanel
            buildings={buildings}
            rooms={rooms}
            onSelectRoom={setFocusRoomId}
          />
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? "Hide campus map" : "Show campus map"}
            </button>
            {showMap ? (
              <CampusMap
                buildings={buildings}
                rooms={rooms}
                selectedBuildingId={null}
                focusRoomId={focusRoomId}
              />
            ) : null}
          </div>
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
    <ThemeProvider>
      <AuthProvider>
        <DashboardInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
