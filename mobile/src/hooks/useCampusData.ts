import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { connectEmulatorsIfNeeded, db, LIVE_ROOM_ID } from "../lib/firebase";
import type { Building, Reading, Room } from "../lib/types";

export function useCampusData() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [latest, setLatest] = useState<Reading | null>(null);

  useEffect(() => {
    connectEmulatorsIfNeeded();
    const u1 = onSnapshot(collection(db, "buildings"), (snap) => {
      setBuildings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Building, "id">) })));
    });
    const u2 = onSnapshot(collection(db, "rooms"), (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Room, "id">) })));
    });
    const u3 = onSnapshot(doc(db, "readings_latest", LIVE_ROOM_ID), (snap) => {
      setLatest(snap.exists() ? (snap.data() as Reading) : null);
    });
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  return { buildings, rooms, latest };
}
