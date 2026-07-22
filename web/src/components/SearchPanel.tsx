"use client";

import { useMemo, useState } from "react";
import { isOverheat, type Building, type Room } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

type Props = {
  buildings: Building[];
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
};

export function SearchPanel({ buildings, rooms, onSelectRoom }: Props) {
  const { profile, toggleFavourite } = useAuth();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length === 0) return [];
    const buildingMap = new Map(buildings.map((b) => [b.id, b]));
    return rooms
      .map((room) => {
        const b = buildingMap.get(room.buildingId);
        const hay = `${room.name} ${room.number} ${b?.name ?? ""} ${b?.code ?? ""}`.toLowerCase();
        return { room, building: b, hay };
      })
      .filter(({ hay }) => hay.includes(term))
      .slice(0, 40);
  }, [buildings, rooms, q]);

  const favs = profile?.favouriteRoomIds ?? [];

  return (
    <section className="panel flex h-full flex-col">
      <p className="eyebrow">Find a room</p>
      <h2 className="section-title mt-1">Search Keele halls</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {buildings.length} buildings · {rooms.length} rooms
      </p>
      <input
        className="input mt-3 w-full"
        placeholder="Search e.g. CLH A, TEL 0006, Ross S103…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
        {results.map(({ room, building }) => {
          const hot = isOverheat(room.tempC);
          const code = building?.code === "VH" ? "VARI" : building?.code;
          const isFav = favs.includes(room.id);
          return (
            <li key={room.id}>
              <button
                type="button"
                className="room-row"
                onClick={() => onSelectRoom(room.id)}
              >
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
                  title={isFav ? "Remove from favourites" : "Add to favourites"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavourite(room.id);
                  }}
                >
                  {isFav ? "★" : "☆"}
                </button>
              </button>
            </li>
          );
        })}
        {q.trim().length > 0 && results.length === 0 ? (
          <li className="py-8 text-center text-sm text-[var(--muted)]">
            No rooms match — try another building code or room number.
          </li>
        ) : null}
        {q.trim().length === 0 ? (
          <li className="py-8 text-center text-sm text-[var(--muted)]">
            Type above to search all Keele rooms.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
