import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const firebaseConfig = {
  apiKey: extra.firebaseApiKey || "demo-api-key",
  authDomain: extra.firebaseAuthDomain || "hallsense-demo.firebaseapp.com",
  projectId: extra.firebaseProjectId || "hallsense-demo",
  storageBucket: extra.firebaseStorageBucket || "hallsense-demo.appspot.com",
  messagingSenderId: extra.firebaseMessagingSenderId || "123456789012",
  appId: extra.firebaseAppId || "1:123456789012:web:abcdef",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

let emulatorsConnected = false;

export function connectEmulatorsIfNeeded() {
  if (emulatorsConnected) return;
  if (extra.useEmulator !== "true") return;

  const fsHost = extra.firestoreEmulatorHost || "127.0.0.1:8080";
  const authHost = extra.authEmulatorHost || "127.0.0.1:9099";
  const [fsHostname, fsPort] = fsHost.split(":");
  try {
    connectFirestoreEmulator(db, fsHostname || "127.0.0.1", Number(fsPort || 8080));
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  } catch {
    // Already connected
  }
  emulatorsConnected = true;
}

export const LIVE_ROOM_ID = "vari-a";
export const THRESHOLD_C = 25;
export const KEELE_CENTER = {
  latitude: 43.7735,
  longitude: -79.5035,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};
