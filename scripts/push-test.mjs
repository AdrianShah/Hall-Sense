/**
 * Send a test Expo push to the demo device token stored in Firestore.
 *
 *   set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *   node scripts/push-test.mjs
 */
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "hallsense-demo";
const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (!getApps().length) {
  if (useEmulator) {
    initializeApp({ projectId: PROJECT_ID });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
    initializeApp({ credential: cert(sa), projectId: sa.project_id || PROJECT_ID });
  } else {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
}

const db = getFirestore();
const doc = await db.collection("devices").doc("demo").get();
const token = doc.exists ? doc.data()?.expoPushToken : null;

if (!token) {
  console.error("No expoPushToken on devices/demo. Open the Expo app → Alerts → Register this phone.");
  process.exit(1);
}

const resp = await fetch("https://exp.host/--/api/v2/push/send", {
  method: "POST",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: token,
    sound: "default",
    title: "HallSense test alert",
    body: "Push wiring works. Overheat alerts will look like this.",
    data: { roomId: "vari-a", test: true },
  }),
});

console.log(await resp.text());
