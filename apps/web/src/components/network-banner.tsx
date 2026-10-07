import { Badge } from "./ui";

/** States plainly which ledger and which assets are in use. */
export function NetworkBanner({ network, instruments }: { network: "local" | "devnet"; instruments?: { cash: string; rwa: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge tone="accent">{network === "local" ? "Local Canton sandbox" : "HackCanton DevNet"}</Badge>
      <Badge tone="warn">{instruments ? `${instruments.label} assets: ${instruments.cash} · ${instruments.rwa}` : "Test assets"}</Badge>
      <Badge>Native Daml 2-of-3 governance</Badge>
    </div>
  );
}
