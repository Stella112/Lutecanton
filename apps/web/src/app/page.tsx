import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function Home() {
  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-navy">{BRAND.tagline}</h1>
      <p className="text-muted">{BRAND.statement}</p>
      <div className="rounded-lg border border-line bg-surface p-5 text-sm">
        <p className="font-medium">Build in progress</p>
        <p className="mt-1 text-muted">
          Treasury, governance, settlement and privacy screens are wired to the ledger in a later
          milestone. Today this app only offers the MainNet wallet connection.
        </p>
        <Link href="/mainnet" className="mt-3 inline-block text-accent hover:underline">
          Open MainNet · Grofty →
        </Link>
      </div>
    </section>
  );
}
