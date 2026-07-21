/**
 * Seed Firestore (emulator or production) with Keele campus mock data
 * and create the demo admin Auth user.
 *
 * Usage:
 *   # Emulator (start emulators first)
 *   set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *   set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
 *   node scripts/seed-firestore.mjs
 *
 *   # Production (service account)
 *   set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   node scripts/seed-firestore.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const seed = JSON.parse(readFileSync(join(root, "shared", "campus-seed.json"), "utf8"));

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "hallsense-demo";
const ADMIN_EMAIL = process.env.HALLSENSE_ADMIN_EMAIL || "admin@hallsense.demo";
const ADMIN_PASSWORD = process.env.HALLSENSE_ADMIN_PASSWORD || "HallSense2026!";

const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

function initAdmin() {
  if (getApps().length) return;
  if (useEmulator) {
    initializeApp({ projectId: PROJECT_ID });
    return;
  }
  try {
    initializeApp({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
    });
  } catch {
    const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!saPath) {
      throw new Error(
        "Set FIRESTORE_EMULATOR_HOST for local seed, or GOOGLE_APPLICATION_CREDENTIALS for production."
      );
    }
    const sa = JSON.parse(readFileSync(saPath, "utf8"));
    initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || PROJECT_ID,
    });
  }
}

async function ensureAdminUser() {
  const auth = getAuth();
  let user;
  try {
    user = await auth.getUserByEmail(ADMIN_EMAIL);
    console.log(`Admin user exists: ${ADMIN_EMAIL}`);
  } catch {
    user = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: "HallSense Admin",
      emailVerified: true,
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }
  await getFirestore().collection("users").doc(user.uid).set(
    {
      email: ADMIN_EMAIL,
      role: "admin",
      displayName: "HallSense Admin",
      updatedAt: Date.now(),
    },
    { merge: true }
  );
  return user.uid;
}

async function seedCampus() {
  const db = getFirestore();
  const batch = db.batch();
  const now = Date.now();

  batch.set(db.collection("config").doc("app"), {
    name: "HallSense",
    tagline: "Know the lecture hall before you walk across Keele.",
    thresholdC: seed.thresholdC,
    liveRoomId: seed.liveRoomId,
    updatedAt: now,
  });

  for (const b of seed.buildings) {
    batch.set(db.collection("buildings").doc(b.id), {
      ...b,
      updatedAt: now,
    });
  }

  for (const r of seed.rooms) {
    batch.set(db.collection("rooms").doc(r.id), {
      ...r,
      overheat: r.tempC > seed.thresholdC,
      updatedAt: now,
    });
  }

  // Placeholder latest reading for live room
  const live = seed.rooms.find((r) => r.id === seed.liveRoomId);
  if (live) {
    batch.set(db.collection("readings_latest").doc(seed.liveRoomId), {
      roomId: seed.liveRoomId,
      t: live.tempC,
      h: live.humidity,
      overheat: live.tempC > seed.thresholdC,
      ts: now,
    });
  }

  batch.set(db.collection("devices").doc("demo"), {
    expoPushToken: null,
    label: "Demo phone",
    updatedAt: now,
  });

  await batch.commit();
  console.log(
    `Seeded ${seed.buildings.length} buildings, ${seed.rooms.length} rooms (live=${seed.liveRoomId})`
  );
}

async function main() {
  console.log(useEmulator ? "Seeding Firebase Emulator..." : "Seeding production Firebase...");
  initAdmin();
  await ensureAdminUser();
  await seedCampus();
  console.log("Done.");
  console.log(`Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
