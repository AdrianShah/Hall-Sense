"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useCampusData } from "@/hooks/useCampusData";
import type { Building, ThemePreference } from "@/lib/types";

type Step = "welcome" | "favourites" | "theme" | "done";

export function Onboarding() {
  const { profile, updateProfile, toggleFavourite } = useAuth();
  const { setTheme } = useTheme();
  const { buildings, rooms } = useCampusData();
  const [step, setStep] = useState<Step>("welcome");
  const [searchQ, setSearchQ] = useState("");

  const favs = profile?.favouriteRoomIds ?? [];

  const searchResults = useMemo(() => {
    const term = searchQ.trim().toLowerCase();
    if (term.length < 1) return [];
    const bmap = new Map(buildings.map((b) => [b.id, b]));
    return rooms
      .map((room) => {
        const b = bmap.get(room.buildingId);
        const hay = `${room.name} ${room.number} ${b?.name ?? ""} ${b?.code ?? ""}`.toLowerCase();
        return { room, building: b, matches: hay.includes(term) };
      })
      .filter(({ matches }) => matches)
      .slice(0, 20);
  }, [buildings, rooms, searchQ]);

  async function finishOnboarding(selectedTheme: ThemePreference) {
    setTheme(selectedTheme);
    await updateProfile({ onboardingComplete: true, theme: selectedTheme });
  }

  if (step === "welcome") {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-card">
          <p className="brand text-center" style={{ fontSize: "2.5rem" }}>HallSense</p>
          <p className="mt-4 text-center text-[var(--muted)]">
            Know the lecture hall before you walk across Keele.
          </p>
          <button className="btn mt-8 w-full" onClick={() => setStep("favourites")}>
            Get started
          </button>
        </div>
      </div>
    );
  }

  if (step === "favourites") {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-card" style={{ maxWidth: 440 }}>
          <p className="eyebrow">Step 1 of 2</p>
          <h2 className="section-title mt-1">Pick your rooms</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Search for rooms you use often. They{"'"}ll appear on your home screen.
          </p>
          <input
            className="input mt-3 w-full"
            placeholder="Search e.g. CLH A, LAS 1006…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          {favs.length > 0 ? (
            <p className="mt-2 text-xs text-[var(--brand)]">
              {favs.length} room{favs.length !== 1 ? "s" : ""} selected
            </p>
          ) : null}
          <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto">
            {searchResults.map(({ room, building }) => {
              const isFav = favs.includes(room.id);
              const code = building?.code === "VH" ? "VARI" : building?.code;
              return (
                <li key={room.id}>
                  <button
                    type="button"
                    className={`room-row ${isFav ? "ring-2 ring-[var(--brand)]" : ""}`}
                    onClick={() => toggleFavourite(room.id)}
                  >
                    <span>
                      <span className="font-medium text-[var(--ink)]">
                        {code} {room.number}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {building?.name}
                      </span>
                    </span>
                    <span className="text-sm">{isFav ? "★" : "☆"}</span>
                  </button>
                </li>
              );
            })}
            {searchQ.trim().length > 0 && searchResults.length === 0 ? (
              <li className="py-4 text-center text-sm text-[var(--muted)]">No rooms found.</li>
            ) : null}
          </ul>
          <div className="mt-4 flex gap-2">
            <button className="btn flex-1" onClick={() => setStep("theme")}>
              {favs.length > 0 ? "Continue" : "Skip"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "theme") {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-card">
          <p className="eyebrow">Step 2 of 2</p>
          <h2 className="section-title mt-1">Choose your theme</h2>
          <div className="mt-4 flex flex-col gap-2">
            <button className="btn w-full" onClick={() => finishOnboarding("light")}>
              Light
            </button>
            <button className="btn w-full" style={{ background: "#1c2a24" }} onClick={() => finishOnboarding("dark")}>
              Dark
            </button>
            <button className="btn-ghost w-full" onClick={() => finishOnboarding("system")}>
              Follow system
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
