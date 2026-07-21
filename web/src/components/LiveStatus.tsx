"use client";

import { isOverheat, THRESHOLD_C, type Reading, type Room } from "@/lib/types";
import { LIVE_ROOM_ID } from "@/lib/firebase";

type Props = {
  latest: Reading | null;
  liveRoom: Room | undefined;
};

export function LiveStatus({ latest, liveRoom }: Props) {
  const temp = latest?.t ?? liveRoom?.tempC;
  const hum = latest?.h ?? liveRoom?.humidity;
  const hot = temp != null ? isOverheat(temp) : false;

  return (
    <section className="panel">
      <p className="eyebrow">Live sensor · Vari Hall A</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="display-temp tabular-nums">
            {temp != null ? `${temp.toFixed(1)}°C` : "—"}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Humidity {hum != null ? `${Math.round(hum)}%` : "—"} · threshold {THRESHOLD_C}°C
          </p>
        </div>
        <div
          className={`status-pill ${hot ? "status-pill-hot" : "status-pill-ok"}`}
          role="status"
        >
          {hot ? "OVERHEAT" : "OPTIMAL"}
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        Room id <code>{LIVE_ROOM_ID}</code>
        {latest?.ts
          ? ` · updated ${new Date(latest.ts).toLocaleTimeString()}`
          : " · waiting for bridge"}
      </p>
    </section>
  );
}
