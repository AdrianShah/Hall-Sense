"use client";

import { useMemo, useState } from "react";
import { isOverheat, type Building, type Room } from "@/lib/types";

type Props = {
  buildings: Building[];
  rooms: Room[];
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string | null) => void;
  onSelectRoom: (roomId: string) => void;
};

export function SearchPanel({
  buildings,
  rooms,
  selectedBuildingId,
  onSelectBuilding,
  onSelectRoom,
}: Props) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const buildingMap = new Map(buildings.map((b) => [b.id, b]));

    const roomHits = rooms
      .map((room) => {
        const b = buildingMap.get(room.buildingId);
        const hay = `${room.name} ${room.number} ${b?.name ?? ""} ${b?.code ?? ""}`.toLowerCase();
        return { room, building: b, hay };
      })
      .filter(({ hay, building }) => {
        if (selectedBuildingId && building?.id !== selectedBuildingId) return false;
        if (!term) return true;
        return hay.includes(term);
      })
      .slice(0, 40);

    const buildingHits =
      term.length === 0
        ? buildings
        : buildings.filter(
            (b) =>
              b.name.toLowerCase().includes(term) || b.code.toLowerCase().includes(term)
          );

    return { roomHits, buildingHits };
  }, [buildings, rooms, q, selectedBuildingId]);

  return (
    <section className="panel flex h-full min-h-[28rem] flex-col">
      <p className="eyebrow">Pre-class check</p>
      <h2 className="section-title mt-1">Search Keele halls</h2>
      <input
        className="input mt-3 w-full"
        placeholder="Building, code, or room…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`chip ${selectedBuildingId == null ? "chip-active" : ""}`}
          onClick={() => onSelectBuilding(null)}
        >
          All
        </button>
        {results.buildingHits.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`chip ${selectedBuildingId === b.id ? "chip-active" : ""}`}
            onClick={() => onSelectBuilding(b.id)}
          >
            {b.code}
          </button>
        ))}
      </div>

      <ul className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
        {results.roomHits.map(({ room, building }) => {
          const hot = isOverheat(room.tempC);
          return (
            <li key={room.id}>
              <button
                type="button"
                className="room-row"
                onClick={() => {
                  onSelectBuilding(room.buildingId);
                  onSelectRoom(room.id);
                }}
              >
                <span>
                  <span className="font-medium text-[var(--ink)]">
                    {building?.code} {room.number}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {room.name}
                    {room.source === "live" ? " · live sensor" : ""}
                  </span>
                </span>
                <span className={`temp-badge ${hot ? "temp-badge-hot" : "temp-badge-ok"}`}>
                  {room.tempC.toFixed(1)}°C
                </span>
              </button>
            </li>
          );
        })}
        {results.roomHits.length === 0 ? (
          <li className="py-8 text-center text-sm text-[var(--muted)]">No rooms match.</li>
        ) : null}
      </ul>
    </section>
  );
}
