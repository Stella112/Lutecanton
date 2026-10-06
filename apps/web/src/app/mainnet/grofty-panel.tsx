"use client";

import { useState } from "react";
import { isUnauthorized, isUserRejection, type GroftyRpcError } from "@groftylabs/dapp-sdk";
import {
  GroftyProvider,
  useConnect,
  useDisconnect,
  useGrofty,
  useGroftyAccount,
} from "@groftylabs/dapp-sdk/react";

// Grofty reports this network id and does not switch networks (grofty-dapp-sdk README).
const EXPECTED_NETWORK = "canton:da-mainnet";
const MIN_WALLET_VERSION = "2.0.4";

export function GroftyPanel() {
  return (
    <GroftyProvider>
      <Panel />
    </GroftyProvider>
  );
}

function Panel() {
  const { status, error, retry } = useGrofty();

  if (status === "discovering") {
    return <Card>Looking for the Grofty extension…</Card>;
  }
  if (status === "unavailable") {
    return (
      <Card>
        <p className="font-medium">Grofty extension not detected.</p>
        <p className="mt-1 text-sm text-muted">
          Install Grofty Wallet {MIN_WALLET_VERSION} or newer in this browser, unlock it, then retry.
        </p>
        {error && <p className="mt-2 text-sm text-danger">Discovery error: {error.message}</p>}
        <button onClick={retry} className={buttonClass}>
          Retry
        </button>
      </Card>
    );
  }
  return <Connected />;
}

function Connected() {
  const { isConnected, account, networkId, isLoading, error, refresh } = useGroftyAccount();
  const { connect, isConnecting, error: connectError } = useConnect();
  const { disconnect, isDisconnecting } = useDisconnect();

  if (isLoading) return <Card>Reading wallet status…</Card>;

  if (!isConnected) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Lute asks to read your Party ID and balances. Approve the request in the Grofty popup.
        </p>
        <button onClick={() => void connect().then(refresh)} disabled={isConnecting} className={buttonClass}>
          {isConnecting ? "Waiting for approval in Grofty…" : "Connect Grofty"}
        </button>
        <RpcErrorLine error={connectError ?? error} />
      </Card>
    );
  }

  const wrongNetwork = networkId !== EXPECTED_NETWORK;

  return (
    <div className="space-y-4">
      <Card>
        <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Network</dt>
          <dd className="font-mono">
            {networkId ?? "unknown"}
            {wrongNetwork && <span className="ml-2 text-danger">unexpected network, expected {EXPECTED_NETWORK}</span>}
          </dd>
          <dt className="text-muted">Party ID</dt>
          <dd className="break-all font-mono">{account?.partyId ?? "—"}</dd>
          <dt className="text-muted">Account status</dt>
          <dd className="font-mono">{account?.status ?? "—"}</dd>
        </dl>
        <button onClick={() => void disconnect()} disabled={isDisconnecting} className={secondaryButtonClass}>
          Disconnect
        </button>
      </Card>
      {!wrongNetwork && <Balance />}
      <Card>
        <p className="text-sm font-medium">MainNet transfer test (MNET-3)</p>
        <p className="mt-1 text-sm text-muted">
          Not enabled. A real transfer requires Maris&apos;s explicit written approval of asset,
          amount and receiver, and is signed by you in the Grofty popup.
        </p>
      </Card>
    </div>
  );
}

function Balance() {
  const { client } = useGrofty();
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "ok"; data: unknown; at: string } | { kind: "error"; error: unknown }
  >({ kind: "idle" });

  const load = async () => {
    if (!client) return;
    setState({ kind: "loading" });
    try {
      const data = await client.getBalance();
      setState({ kind: "ok", data, at: new Date().toISOString() });
    } catch (error) {
      setState({ kind: "error", error });
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Balances (live from your wallet)</p>
        <button onClick={() => void load()} disabled={state.kind === "loading"} className={secondaryButtonClass}>
          {state.kind === "loading" ? "Reading…" : "Read balance"}
        </button>
      </div>
      {state.kind === "ok" && (
        <>
          {/* Response shape is not documented by the SDK; shown verbatim until verified. */}
          <pre className="mt-3 max-h-80 overflow-auto rounded bg-background p-3 font-mono text-xs">
            {JSON.stringify(state.data, null, 2)}
          </pre>
          <p className="mt-1 text-xs text-muted">Read at {state.at}</p>
        </>
      )}
      {state.kind === "error" && <RpcErrorLine error={state.error} />}
    </Card>
  );
}

function RpcErrorLine({ error }: { error: unknown }) {
  if (!error) return null;
  const rpc = error as Partial<GroftyRpcError>;
  const text = isUserRejection(error)
    ? "You declined the request in Grofty."
    : isUnauthorized(error)
      ? "Not authorized: this site is not connected, or Grofty is locked."
      : `Wallet error${rpc.code !== undefined ? ` ${rpc.code}` : ""}: ${rpc.message ?? String(error)}`;
  return <p className="mt-2 text-sm text-danger">{text}</p>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-surface p-5">{children}</div>;
}

const buttonClass =
  "mt-4 rounded-md bg-navy px-4 py-2 text-sm font-medium text-background disabled:opacity-50";
const secondaryButtonClass =
  "mt-4 rounded-md border border-line px-3 py-1.5 text-sm text-foreground disabled:opacity-50";
