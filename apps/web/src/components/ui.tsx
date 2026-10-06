"use client";

import { useState, type ReactNode } from "react";
import { errorText } from "@/lib/api";

export function Card({ title, children, className = "" }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-navy">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "danger" | "accent"; children: ReactNode }) {
  const tones = {
    neutral: "border-line text-muted",
    ok: "border-accent/40 text-accent",
    warn: "border-warn/50 text-warn",
    danger: "border-danger/50 text-danger",
    accent: "border-accent text-accent",
  };
  return <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}

export function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-6 border-b border-line py-2 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right tabular-nums">{v}</span>
    </div>
  );
}

/** Runs a ledger action and shows its real outcome; failures are never shown as success. */
export function ActionButton({
  label,
  run,
  onDone,
  variant = "primary",
  disabled,
}: {
  label: string;
  run: () => Promise<unknown>;
  onDone?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = {
    primary: "bg-navy text-background",
    secondary: "border border-line text-foreground",
    danger: "border border-danger/60 text-danger",
  };
  return (
    <div>
      <button
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await run();
            onDone?.();
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
        className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${styles[variant]}`}
      >
        {busy ? "Submitting to ledger…" : label}
      </button>
      {error && <p className="mt-2 max-w-xl text-sm text-danger">Rejected: {error}</p>}
    </div>
  );
}

export function Loading() {
  return <p className="text-sm text-muted">Reading the ledger…</p>;
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <Card>
      <p className="text-sm text-danger">{errorText(error)}</p>
    </Card>
  );
}
