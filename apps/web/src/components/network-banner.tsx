import { Badge } from "./ui";

/** States plainly which ledger and which assets are in use. */
export function NetworkBanner({ network }: { network: "local" | "devnet" }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge tone="accent">{network === "local" ? "Local Canton sandbox" : "HackCanton DevNet"}</Badge>
      <Badge tone="warn">{network === "local" ? "Mock assets: cUSD-L · cMMF-L" : "DevNet test assets"}</Badge>
      <Badge>Native Daml 2-of-3 governance</Badge>
    </div>
  );
}
