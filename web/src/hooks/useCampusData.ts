"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { connectEmulatorsIfNeeded, db, LIVE_ROOM_ID } from "@/lib/firebase";
import type { Building, Reading, Room } from "@/lib/types";

function toReading(data: Record<string, unknown>): Reading | null {
  const t = Number(data.t);
  const h = Number(data.h);
  const ts = Number(data.ts);
  if (!Number.isFinite(t) || !Number.isFinite(ts)) {
    return null;
  }
  return {
    roomId: String(data.roomId ?? LIVE_ROOM_ID),
    t,
    h: Number.isFinite(h) ? h : 0,
    overheat: Boolean(data.overheat),
    ts,
  };
}

function lastHourHistory(rows: Reading[]): Reading[] {
  const cutoff = Date.now() - 60 * 60 * 1000;
  return rows
    .filter((r) => r.ts >= cutoff)
    .sort((a, b) => a.ts - b.ts);
}

export function useCampusData() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    connectEmulatorsIfNeeded();

    const unsubBuildings = onSnapshot(collection(db, "buildings"), (snap) => {
      setBuildings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Building, "id">) })));
    });

    const unsubRooms = onSnapshot(collection(db, "rooms"), (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Room, "id">) })));
    });

    const unsubLatest = onSnapshot(doc(db, "readings_latest", LIVE_ROOM_ID), (snap) => {
      if (!snap.exists()) {
        setLatest(null);
        return;
      }
      setLatest(toReading(snap.data() as Record<string, unknown>));
    });

    // Prefer indexed query; fall back to roomId-only (always works) + client sort/filter
    const indexedQ = query(
      collection(db, "readings"),
      where("roomId", "==", LIVE_ROOM_ID),
      orderBy("ts", "asc"),
      limit(800)
    );

    let unsubFallback: (() => void) | undefined;

    const applyHistorySnap = (docs: { data: () => Record<string, unknown> }[]) => {
      const rows = docs
        .map((d) => toReading(d.data()))
        .filter((r): r is Reading => r != null);
      setHistory(lastHourHistory(rows));
      setReady(true);
    };

    const unsubHist = onSnapshot(
      indexedQ,
      (snap) => {
        applyHistorySnap(snap.docs);
      },
      () => {
        const fallbackQ = query(
          collection(db, "readings"),
          where("roomId", "==", LIVE_ROOM_ID),
          limit(500)
        );
        unsubFallback = onSnapshot(fallbackQ, (snap) => {
          applyHistorySnap(snap.docs);
        });
      }
    );

    return () => {
      unsubBuildings();
      unsubRooms();
      unsubLatest();
      unsubHist();
      unsubFallback?.();
    };
  }, []);

  return { buildings, rooms, latest, history, ready };
}
