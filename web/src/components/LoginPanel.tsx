"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";

export function LoginPanel() {
  const { user, isAdmin, loading, login, logout } = useAuth();
  const [email, setEmail] = useState("admin@hallsense.demo");
  const [password, setPassword] = useState("HallSense2026!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Checking session…</p>;
  }

  if (isAdmin) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--muted)]">
          Admin:{" "}
          <strong className="text-[var(--ink)]">
            {user?.email ?? "admin@hallsense.demo (demo)"}
          </strong>
        </span>
        <button type="button" className="btn-ghost" onClick={() => logout()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Email
        <input
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Password
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Signing in…" : "Admin login"}
      </button>
      {error ? <p className="w-full text-sm text-[var(--alert)]">{error}</p> : null}
    </form>
  );
}
