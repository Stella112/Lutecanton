// DevNet connectivity check. Run it yourself: node scripts/devnet/check.mjs
// Reads credentials from .env (never committed). Prints only non-secret facts:
// ledger user id, granted rights/parties, node version, ledger end.
// Never prints the password, access token or refresh token.
// Endpoints and grant follow the official NODERS guide (docs/DEVNET.md).
import { existsSync } from "node:fs";

const envPath = new URL("../../.env", import.meta.url);
if (!existsSync(envPath)) {
  console.error("Missing .env at the repo root. Copy .env.example and fill the DevNet values (docs/DEVNET.md).");
  process.exit(1);
}
process.loadEnvFile(envPath);

const need = ["CANTON_OIDC_TOKEN_URL", "CANTON_CLIENT_ID", "CANTON_USERNAME", "CANTON_PASSWORD", "CANTON_JSON_LEDGER_API_URL", "CANTON_OIDC_AUDIENCE"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}
const env = process.env;
const api = env.CANTON_JSON_LEDGER_API_URL.replace(/\/$/, "");

// Safe diagnostics about how the credentials were read from .env (never the password itself).
const pw = env.CANTON_PASSWORD;
console.log(`username as read: [${env.CANTON_USERNAME}]`);
console.log(
  `password as read: ${pw.length} characters;`,
  `leading/trailing space: ${pw !== pw.trim()};`,
  `contains a quote character: ${/["']/.test(pw)};`,
  `contains #: ${pw.includes("#")}`,
);

const tokenRes = await fetch(env.CANTON_OIDC_TOKEN_URL, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "password",
    client_id: env.CANTON_CLIENT_ID,
    username: env.CANTON_USERNAME,
    password: env.CANTON_PASSWORD,
    scope: "openid daml_ledger_api offline_access",
  }),
});
if (!tokenRes.ok) {
  // Keycloak error bodies contain no secrets (e.g. {"error":"invalid_grant"}).
  console.error(`Token request failed: HTTP ${tokenRes.status} ${await tokenRes.text()}`);
  process.exit(1);
}
const { access_token: token, expires_in } = await tokenRes.json();

const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
const aud = [].concat(claims.aud ?? []);
console.log("token: OK (not printed), expires_in:", expires_in, "s");
console.log("audience contains DevNet audience:", aud.includes(env.CANTON_OIDC_AUDIENCE));
console.log("ledger user id (sub):", claims.sub);

const get = async (path) => {
  const res = await fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};

const version = await get("/v2/version");
console.log("\n/v2/version:", version.status, JSON.stringify(version.body, null, 2));

const rights = await get(`/v2/users/${encodeURIComponent(claims.sub)}/rights`);
const actAs = (rights.body?.rights ?? []).flatMap((r) => (r.kind?.CanActAs ? [r.kind.CanActAs.value.party.split("::")[0]] : []));
console.log(`\nuser rights (HTTP ${rights.status}): can act as ${actAs.length} parties: ${actAs.sort().join(", ")}`);

const end = await get("/v2/state/ledger-end");
console.log("\n/v2/state/ledger-end:", end.status, JSON.stringify(end.body));

// Lute readiness: the 14 role parties (created in the Console with the team prefix) and the uploaded package.
const ROLES = ["Treasury", "FinanceOp", "TreasuryOp", "RiskOp", "FinanceViewer", "Alice", "Ben", "Chidi", "David", "Eva", "Auditor", "FundAgent", "CashIssuer", "Outsider"];
const prefix = (env.LUTE_PARTY_PREFIX ?? "").toLowerCase();
const actAsHints = actAs.map((h) => h.toLowerCase());
const missingRoles = ROLES.filter((r) => !actAsHints.includes(prefix + r.toLowerCase()));
console.log(`\nLute role parties (prefix "${prefix}"): ${ROLES.length - missingRoles.length}/${ROLES.length}${missingRoles.length ? " - MISSING: " + missingRoles.join(", ") : " - all present"}`);

const LUTE_PACKAGE_ID = "ad8c0d8d1debe8b2208eb24f7ee13ed5d2ca931739fd0c008d2ab728f4b69676";
const pkgs = await get("/v2/packages");
if (pkgs.status === 200) {
  console.log("lute-core package uploaded:", (pkgs.body?.packageIds ?? []).includes(LUTE_PACKAGE_ID));
} else {
  console.log(`lute-core package uploaded: unknown (package list returned HTTP ${pkgs.status})`);
}
