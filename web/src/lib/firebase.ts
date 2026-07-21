import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hallsense-demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hallsense-demo",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hallsense-demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:abcdef",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

let emulatorsConnected = false;

export function connectEmulatorsIfNeeded() {
  if (emulatorsConnected) return;
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== "true") return;
  if (typeof window === "undefined") return;

  const fsHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const authHost = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  const [fsHostname, fsPort] = fsHost.split(":");
  try {
    connectFirestoreEmulator(db, fsHostname || "127.0.0.1", Number(fsPort || 8080));
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  } catch {
    // Already connected (Fast Refresh)
  }
  emulatorsConnected = true;
}

export const LIVE_ROOM_ID = "vari-a";
export const THRESHOLD_C = 25;
