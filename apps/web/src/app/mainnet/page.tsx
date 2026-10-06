import { GroftyPanel } from "./grofty-panel";

export default function MainNetPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-danger">
          Canton MainNet · real assets
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Grofty wallet</h1>
        <p className="max-w-2xl text-sm text-muted">
          Connects to the Grofty browser extension over CIP-0103. Read-only: this page shows your
          real MainNet Party ID and balances. It cannot move funds. Lute&apos;s custom treasury
          contracts are not deployed on MainNet.
        </p>
      </div>
      <GroftyPanel />
    </section>
  );
}
