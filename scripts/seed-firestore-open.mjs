/**
 * Seed Firestore without Auth (requires open rules).
 * After seeding, redeploy locked-down rules and enable Email/Password in Console.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { doc, getFirestore, writeBatch } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(join(__dirname, "..", "shared", "campus-seed.json"), "utf8")
);

const app = initializeApp({
  apiKey: "AIzaSyBw07M1-g7RWaqfIkzGH7YliriO9r8sDRo",
  authDomain: "hallsense-e2b8c.firebaseapp.com",
  projectId: "hallsense-e2b8c",
  storageBucket: "hallsense-e2b8c.firebasestorage.app",
  messagingSenderId: "59014413277",
  appId: "1:59014413277:web:72c9e4b9ec01be32c19434",
});
const db = getFirestore(app);
const now = Date.now();
const batch = writeBatch(db);

batch.set(doc(db, "config", "app"), {
  name: "HallSense",
  tagline: "Know the lecture hall before you walk across Keele.",
  thresholdC: seed.thresholdC,
  liveRoomId: seed.liveRoomId,
  updatedAt: now,
});

for (const b of seed.buildings) {
  batch.set(doc(db, "buildings", b.id), { ...b, updatedAt: now });
}
for (const r of seed.rooms) {
  batch.set(doc(db, "rooms", r.id), {
    ...r,
    overheat: r.tempC > seed.thresholdC,
    updatedAt: now,
  });
}

const live = seed.rooms.find((r) => r.id === seed.liveRoomId);
if (live) {
  batch.set(doc(db, "readings_latest", seed.liveRoomId), {
    roomId: seed.liveRoomId,
    t: live.tempC,
    h: live.humidity,
    overheat: live.tempC > seed.thresholdC,
    ts: now,
  });
}

batch.set(doc(db, "devices", "demo"), {
  expoPushToken: null,
  label: "Demo phone",
  updatedAt: now,
});

await batch.commit();
console.log(`Seeded ${seed.buildings.length} buildings, ${seed.rooms.length} rooms`);
