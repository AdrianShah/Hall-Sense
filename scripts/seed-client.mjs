/**
 * Seed production Firestore using the client SDK (no service account needed).
 * Creates admin user if missing, then writes campus mock data.
 *
 *   node scripts/seed-client.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getFirestore, setDoc, writeBatch } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const seed = JSON.parse(readFileSync(join(root, "shared", "campus-seed.json"), "utf8"));

const firebaseConfig = {
  apiKey: "AIzaSyBw07M1-g7RWaqfIkzGH7YliriO9r8sDRo",
  authDomain: "hallsense-e2b8c.firebaseapp.com",
  projectId: "hallsense-e2b8c",
  storageBucket: "hallsense-e2b8c.firebasestorage.app",
  messagingSenderId: "59014413277",
  appId: "1:59014413277:web:72c9e4b9ec01be32c19434",
};

const ADMIN_EMAIL = process.env.HALLSENSE_ADMIN_EMAIL || "admin@hallsense.demo";
const ADMIN_PASSWORD = process.env.HALLSENSE_ADMIN_PASSWORD || "HallSense2026!";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function ensureAdmin() {
  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("Signed in as existing admin");
  } catch {
    const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("Created admin:", cred.user.uid);
  }
  const user = auth.currentUser;
  if (!user) throw new Error("No auth user");
  await setDoc(
    doc(db, "users", user.uid),
    {
      email: ADMIN_EMAIL,
      role: "admin",
      displayName: "HallSense Admin",
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

async function seedCampus() {
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
    // Don't overwrite live sensor values — only ensure the doc exists with metadata
    batch.set(
      doc(db, "readings_latest", seed.liveRoomId),
      {
        roomId: seed.liveRoomId,
      },
      { merge: true }
    );
  }

  batch.set(
    doc(db, "devices", "demo"),
    {
      label: "Demo phone",
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
  console.log(`Seeded ${seed.buildings.length} buildings, ${seed.rooms.length} rooms`);
}

await ensureAdmin();
await seedCampus();
console.log(`Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
