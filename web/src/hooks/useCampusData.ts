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
      if (snap.exists()) setLatest(snap.data() as Reading);
      else setLatest(null);
    });

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const histQ = query(
      collection(db, "readings"),
      where("roomId", "==", LIVE_ROOM_ID),
      where("ts", ">=", oneHourAgo),
      orderBy("ts", "asc"),
      limit(800)
    );
    const unsubHist = onSnapshot(
      histQ,
      (snap) => {
        setHistory(snap.docs.map((d) => d.data() as Reading));
        setReady(true);
      },
      () => {
        // Fallback without composite index / time filter during first run
        const fallback = query(
          collection(db, "readings"),
          where("roomId", "==", LIVE_ROOM_ID),
          orderBy("ts", "desc"),
          limit(720)
        );
        onSnapshot(fallback, (snap) => {
          const rows = snap.docs.map((d) => d.data() as Reading).reverse();
          setHistory(rows.filter((r) => r.ts >= oneHourAgo));
          setReady(true);
        });
      }
    );

    return () => {
      unsubBuildings();
      unsubRooms();
      unsubLatest();
      unsubHist();
    };
  }, []);

  return { buildings, rooms, latest, history, ready };
}
