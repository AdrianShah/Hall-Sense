"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth, connectEmulatorsIfNeeded } from "@/lib/firebase";

const DEMO_EMAIL = "admin@hallsense.demo";
const DEMO_PASSWORD = "HallSense2026!";
const DEMO_SESSION_KEY = "hallsense_demo_admin";

type AuthContextValue = {
  user: User | null;
  /** True when signed in via Firebase or local demo admin session */
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [demoAdmin, setDemoAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    connectEmulatorsIfNeeded();
    if (typeof window !== "undefined" && sessionStorage.getItem(DEMO_SESSION_KEY) === "1") {
      setDemoAdmin(true);
    }
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      setDemoAdmin(false);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      const message = err instanceof Error ? err.message : String(err);
      const authNotReady =
        code === "auth/configuration-not-found" ||
        code === "auth/operation-not-allowed" ||
        message.includes("configuration-not-found");

      // Demo fallback when Firebase Auth Email/Password is not enabled yet
      if (
        authNotReady &&
        email.trim().toLowerCase() === DEMO_EMAIL &&
        password === DEMO_PASSWORD
      ) {
        sessionStorage.setItem(DEMO_SESSION_KEY, "1");
        setDemoAdmin(true);
        return;
      }

      if (authNotReady) {
        throw new Error(
          "Firebase Auth is not enabled yet. Use admin@hallsense.demo / HallSense2026! for the demo login, or enable Email/Password in the Firebase Console."
        );
      }
      throw err instanceof Error ? err : new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    setDemoAdmin(false);
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAdmin: Boolean(user) || demoAdmin,
      loading,
      login,
      logout,
    }),
    [user, demoAdmin, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
