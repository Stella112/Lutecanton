// Canton JSON Ledger API v2 client. Only the endpoints Lute uses; request and
// response shapes verified against the Canton 3.5.19 OpenAPI (`/docs/openapi`)
// and live calls on the local sandbox (docs/VERIFICATION_LOG.md).

import { noAuth, type TokenProvider } from "./auth.ts";

export interface CreatedEvent {
  offset: number;
  contractId: string;
  templateId: string;
  packageName: string;
  createArgument: Record<string, unknown>;
  createdEventBlob?: string;
  witnessParties: string[];
  signatories: string[];
  observers?: string[];
  createdAt: string;
}

export interface ActiveContract {
  createdEvent: CreatedEvent;
  synchronizerId: string;
}

export interface DisclosedContract {
  templateId: string;
  contractId: string;
  createdEventBlob: string;
  synchronizerId: string;
}

export type Command =
  | { CreateCommand: { templateId: string; createArguments: Record<string, unknown> } }
  | { ExerciseCommand: { templateId: string; contractId: string; choice: string; choiceArgument: Record<string, unknown> } };

export interface SubmitRequest {
  actAs: string[];
  readAs?: string[];
  commands: Command[];
  /** Stable id; the ledger deduplicates on (userId, actAs, commandId). */
  commandId: string;
  disclosedContracts?: DisclosedContract[];
}

export interface TransactionEvent {
  CreatedEvent?: CreatedEvent;
  ArchivedEvent?: { contractId: string; templateId: string };
  ExercisedEvent?: { contractId: string; templateId: string; choice: string; exerciseResult?: unknown };
}

export interface Transaction {
  updateId: string;
  commandId: string;
  offset: number;
  effectiveAt: string;
  synchronizerId: string;
  events: TransactionEvent[];
}

export class LedgerError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly traceId: string | undefined;
  constructor(status: number, code: string | undefined, cause: string, traceId: string | undefined) {
    super(`${code ?? `HTTP ${status}`}: ${cause}`);
    this.name = "LedgerError";
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

/**
 * Structural check. Bundlers can load this module more than once (e.g. through
 * workspace symlinks), which makes `instanceof LedgerError` unreliable.
 */
export function isLedgerError(e: unknown): e is LedgerError {
  return e instanceof Error && e.name === "LedgerError" && typeof (e as { status?: unknown }).status === "number";
}

export interface LedgerClientConfig {
  baseUrl: string;
  /** Ledger user id. Required without auth; with auth the token's user is used. */
  userId: string;
  auth?: TokenProvider;
  fetchImpl?: typeof fetch;
}

export class LedgerClient {
  readonly baseUrl: string;
  readonly userId: string;
  private readonly auth: TokenProvider;
  private readonly doFetch: typeof fetch;

  constructor(cfg: LedgerClientConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.userId = cfg.userId;
    this.auth = cfg.auth ?? noAuth;
    this.doFetch = cfg.fetchImpl ?? fetch;
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown, contentType = "application/json"): Promise<T> {
    const headers: Record<string, string> = {};
    const token = await this.auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = contentType;
    const res = await this.doFetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : contentType === "application/json" ? JSON.stringify(body) : (body as BodyInit),
    });
    const text = await res.text();
    if (!res.ok) {
      let parsed: { code?: string; cause?: string; traceId?: string } = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { cause: text };
      }
      throw new LedgerError(res.status, parsed.code, parsed.cause ?? text, parsed.traceId);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  version() {
    return this.call<{ version: string }>("GET", "/v2/version");
  }

  async ledgerEnd(): Promise<number> {
    return (await this.call<{ offset: number }>("GET", "/v2/state/ledger-end")).offset;
  }

  /** Uploads and vets a DAR (sandbox; on DevNet DARs are uploaded via the Console). */
  async uploadDar(dar: Uint8Array): Promise<void> {
    await this.call("POST", "/v2/dars?vetAllPackages=true", dar, "application/octet-stream");
  }

  /**
   * Allocates a party (sandbox only; on DevNet parties are created in the Console,
   * which grants the team user its rights). No user is granted rights here: the
   * unauthenticated sandbox does not check them, and naming a user requires it to exist.
   */
  async allocateParty(partyIdHint: string): Promise<string> {
    const r = await this.call<{ partyDetails: { party: string } }>("POST", "/v2/parties", { partyIdHint });
    return r.partyDetails.party;
  }

  /**
   * Parties this ledger user may act as. Works for tenant users on shared nodes,
   * where listing all parties (`/v2/parties`) requires participant-admin rights.
   */
  async actAsParties(): Promise<string[]> {
    const r = await this.call<{ rights?: { kind?: { CanActAs?: { value: { party: string } } } }[] }>(
      "GET",
      `/v2/users/${encodeURIComponent(this.userId)}/rights`,
    );
    return (r.rights ?? []).flatMap((x) => (x.kind?.CanActAs ? [x.kind.CanActAs.value.party] : []));
  }

  async listParties(): Promise<string[]> {
    const r = await this.call<{ partyDetails: { party: string }[] }>("GET", "/v2/parties");
    return r.partyDetails.map((p) => p.party);
  }

  /** Submits commands as one atomic transaction and waits for the result. */
  async submit(req: SubmitRequest): Promise<Transaction> {
    const r = await this.call<{ transaction: Transaction }>("POST", "/v2/commands/submit-and-wait-for-transaction", {
      commands: {
        commands: req.commands,
        commandId: req.commandId,
        userId: this.userId,
        actAs: req.actAs,
        readAs: req.readAs ?? [],
        disclosedContracts: req.disclosedContracts ?? [],
      },
      // LEDGER_EFFECTS includes exercised events (with choice results), not just creates/archives.
      transactionFormat: {
        eventFormat: {
          filtersByParty: Object.fromEntries(req.actAs.map((p) => [p, wildcard(false)])),
          verbose: false,
        },
        transactionShape: "TRANSACTION_SHAPE_LEDGER_EFFECTS",
      },
    });
    return r.transaction;
  }

  /**
   * Active contracts visible to exactly one party. The participant computes the
   * party's projection; nothing is filtered client-side (spec §37).
   */
  async activeContractsFor(
    party: string,
    opts: { templateIds?: string[]; includeCreatedEventBlob?: boolean } = {},
  ): Promise<ActiveContract[]> {
    const includeCreatedEventBlob = opts.includeCreatedEventBlob ?? false;
    const filters = opts.templateIds?.length
      ? {
          cumulative: opts.templateIds.map((templateId) => ({
            identifierFilter: { TemplateFilter: { value: { templateId, includeCreatedEventBlob } } },
          })),
        }
      : wildcard(includeCreatedEventBlob);
    const activeAtOffset = await this.ledgerEnd();
    const rows = await this.call<{ contractEntry?: { JsActiveContract?: ActiveContract } }[]>(
      "POST",
      "/v2/state/active-contracts",
      { activeAtOffset, eventFormat: { filtersByParty: { [party]: filters }, verbose: false } },
    );
    return rows.flatMap((r) => (r.contractEntry?.JsActiveContract ? [r.contractEntry.JsActiveContract] : []));
  }
}

function wildcard(includeCreatedEventBlob: boolean) {
  return { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob } } } }] };
}

/** Builds an explicit disclosure from a contract read with includeCreatedEventBlob. */
export function toDisclosed(c: ActiveContract): DisclosedContract {
  if (!c.createdEvent.createdEventBlob) throw new Error("contract was read without createdEventBlob");
  return {
    templateId: c.createdEvent.templateId,
    contractId: c.createdEvent.contractId,
    createdEventBlob: c.createdEvent.createdEventBlob,
    synchronizerId: c.synchronizerId,
  };
}
