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
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db, connectEmulatorsIfNeeded } from "@/lib/firebase";
import type { UserProfile, ThemePreference } from "@/lib/types";

function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@users.hallsense.demo`;
}

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signup: (username: string, password: string, displayName: string, studentNumber?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, "displayName" | "studentNumber" | "theme" | "onboardingComplete" | "favouriteRoomIds">>) => Promise<void>;
  toggleFavourite: (roomId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function authErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: string }).code);
  }
  return "";
}

function friendlyAuthError(err: unknown): Error {
  const code = authErrorCode(err);
  const message = err instanceof Error ? err.message : String(err);

  if (
    code === "auth/configuration-not-found" ||
    code === "auth/operation-not-allowed" ||
    message.includes("configuration-not-found")
  ) {
    return new Error(
      "Email/Password sign-in is not enabled in Firebase Console → Authentication → Sign-in method."
    );
  }
  if (code === "auth/unauthorized-domain") {
    return new Error(
      "Add this site to Firebase Console → Authentication → Settings → Authorized domains."
    );
  }
  if (code === "auth/email-already-in-use") {
    return new Error("That username is already taken. Try another.");
  }
  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return new Error("Wrong username or password.");
  }
  if (code === "auth/weak-password") {
    return new Error("Password must be at least 6 characters.");
  }
  return err instanceof Error ? err : new Error(message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    connectEmulatorsIfNeeded();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("hallsense_demo_admin");
    }
    const unsub = onAuthStateChanged(auth, (next) => {
      // Always clear profile when auth user changes so favourites never bleed
      setProfile(null);
      setUser(next);
      if (!next) {
        setLoading(false);
      } else {
        setLoading(true);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (cancelled) return;
      if (snap.exists()) {
        setProfile({ uid: user.uid, ...snap.data() } as UserProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [user]);

  const signup = useCallback(
    async (username: string, password: string, displayName: string, studentNumber?: string) => {
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername.length < 3) throw new Error("Username must be at least 3 characters.");
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) throw new Error("Username can only contain letters, numbers, and underscores.");

      const usernameRef = doc(db, "usernames", cleanUsername);
      const existing = await getDoc(usernameRef);
      if (existing.exists()) throw new Error("That username is already taken. Try another.");

      const email = usernameToEmail(cleanUsername);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const now = Date.now();
        const profileData: Omit<UserProfile, "uid"> = {
          username: cleanUsername,
          displayName: displayName.trim() || cleanUsername,
          studentNumber: studentNumber?.trim() || undefined,
          favouriteRoomIds: [],
          onboardingComplete: false,
          theme: "system",
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, "users", cred.user.uid), profileData);
        await setDoc(usernameRef, { uid: cred.user.uid });
      } catch (err) {
        throw friendlyAuthError(err);
      }
    },
    []
  );

  const login = useCallback(async (username: string, password: string) => {
    const cleanUsername = username.toLowerCase().trim();
    const email = usernameToEmail(cleanUsername);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const code = authErrorCode(err);
      const isDemo =
        cleanUsername === "demo" && password === "HallSense2026!";
      const missing =
        code === "auth/user-not-found" || code === "auth/invalid-credential";
      // First-time demo bootstrap for presentations
      if (isDemo && missing) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          const now = Date.now();
          await setDoc(doc(db, "users", cred.user.uid), {
            username: "demo",
            displayName: "Demo User",
            favouriteRoomIds: [],
            onboardingComplete: true,
            theme: "system",
            createdAt: now,
            updatedAt: now,
          });
          await setDoc(doc(db, "usernames", "demo"), { uid: cred.user.uid });
          return;
        } catch (createErr) {
          throw friendlyAuthError(createErr);
        }
      }
      throw friendlyAuthError(err);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateProfileFn = useCallback(
    async (updates: Partial<Pick<UserProfile, "displayName" | "studentNumber" | "theme" | "onboardingComplete" | "favouriteRoomIds">>) => {
      if (!user) throw new Error("Not signed in.");
      await updateDoc(doc(db, "users", user.uid), { ...updates, updatedAt: Date.now() });
    },
    [user]
  );

  const toggleFavourite = useCallback(
    async (roomId: string) => {
      if (!user || !profile) throw new Error("Not signed in.");
      const favs = profile.favouriteRoomIds ?? [];
      const next = favs.includes(roomId) ? favs.filter((id) => id !== roomId) : [...favs, roomId];
      await updateDoc(doc(db, "users", user.uid), { favouriteRoomIds: next, updatedAt: Date.now() });
    },
    [user, profile]
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signup,
      login,
      logout,
      updateProfile: updateProfileFn,
      toggleFavourite,
    }),
    [user, profile, loading, signup, login, logout, updateProfileFn, toggleFavourite]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
