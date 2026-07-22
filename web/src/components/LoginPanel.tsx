"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";

const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "HallSense2026!";

type Mode = "login" | "signup";

export function LoginPanel() {
  const { user, profile, loading, login, signup, logout } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState(DEMO_USERNAME);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [displayName, setDisplayName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await signup(username, password, displayName || username, studentNumber || undefined);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Checking session…</p>;
  }

  if (user) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--muted)]">
          <strong className="text-[var(--ink)]">
            {profile?.displayName ?? profile?.username ?? "User"}
          </strong>
        </span>
        <button type="button" className="btn-ghost" onClick={() => logout()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className={`chip ${mode === "login" ? "chip-active" : ""}`}
          onClick={() => { setMode("login"); setError(null); }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`chip ${mode === "signup" ? "chip-active" : ""}`}
          onClick={() => { setMode("signup"); setError(null); }}
        >
          Create account
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Username
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="e.g. jdoe42"
            required
          />
        </label>
        {mode === "signup" ? (
          <>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Display name
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jane Doe"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Student number (optional)
              <input
                className="input"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="e.g. 218012345"
              />
            </label>
          </>
        ) : null}
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Password
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
          />
        </label>
        <button type="submit" className="btn mt-1" disabled={busy}>
          {busy ? (mode === "signup" ? "Creating…" : "Signing in…") : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        {error ? <p className="text-sm text-[var(--alert)]">{error}</p> : null}
        {mode === "login" ? (
          <p className="text-xs text-[var(--muted)]">
            Demo: <strong>demo</strong> / <strong>HallSense2026!</strong>
          </p>
        ) : null}
      </form>
    </div>
  );
}
