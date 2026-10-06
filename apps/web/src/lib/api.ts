"use client";

import { useCallback, useEffect, useState } from "react";

export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  traceId?: string;
}

export interface RouteResult {
  route: "CashOnly" | "CashThenRedeem" | null;
  blockedReason: string | null;
  cashAvailable: string;
  cashUsed: string;
  shortfall: string;
  redeemAmount: string;
  remainingProductive: string;
  engineVersion: string;
}

export interface Explanation {
  source: "qwen" | "fallback";
  fallbackReason?: string;
  summary: string;
  risks: string[];
  recommendation: string;
  suggestedRedeem: string;
  agreesWithVerified: boolean;
  verifiedRedeem: string;
}

export interface PayLine {
  payee: string;
  amount: string;
  lineRef: string;
}

export interface StateResponse {
  network: "local" | "devnet";
  parties: Record<string, string>;
  explanation: Explanation | null;
  state: {
    cash: string;
    productive: string;
    total: string;
    facility: { contractId: string; isOpen: boolean; capacity: string } | null;
    policy: { contractId: string; payload: Record<string, unknown> } | null;
    batch: { contractId: string; payload: { batchRef: string; period: string; lines: PayLine[]; total: string } } | null;
    proposal: {
      contractId: string;
      payload: { batch: { batchRef: string; period: string; lines: PayLine[]; total: string }; plan: Record<string, string>; approvers: string[]; aiNote: unknown };
      approvals: string[];
      requiredApprovals: number;
    } | null;
    route: RouteResult | null;
    financeReceipts: number;
  };
}

export interface ContractView {
  template: string;
  contractId: string;
  payload: Record<string, unknown>;
  signatories: string[];
  observers: string[];
}

export interface ViewResponse {
  role: string;
  party: string;
  parties: Record<string, string>;
  contracts: ContractView[];
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({ error: "bad_response", message: `HTTP ${res.status}` }));
  if (!res.ok) throw body as ApiError;
  return body as T;
}

export const getJson = <T,>(path: string) => fetch(path, { cache: "no-store" }).then((r) => parse<T>(r));

export const postJson = <T,>(path: string, body: unknown = {}) =>
  fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => parse<T>(r));

/** Loads a GET endpoint; `reload` re-fetches after a ledger action. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    () =>
      getJson<T>(path).then(
        (d) => {
          setData(d);
          setError(null);
        },
        (e) => setError(e as ApiError),
      ),
    [path],
  );
  const reload = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);
  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);
  return { data, error, loading, reload };
}

export function errorText(e: unknown): string {
  const a = e as ApiError;
  if (a?.error === "ledger_unreachable") return "Ledger unreachable. Is the sandbox running and the SSH tunnel open?";
  const message = a?.message ?? a?.error ?? String(e);
  // Daml assertion failures end with "(error category N): <reason>"; show the contract's reason.
  const reason = /\(error category \d+\): (.+)$/s.exec(message)?.[1];
  return reason ? `${reason} (enforced by the Daml contract)` : message;
}
