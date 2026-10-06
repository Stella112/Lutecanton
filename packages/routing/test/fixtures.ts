import { readFileSync } from "node:fs";
import type { Route, RoutingInput, RoutingPolicy } from "../src/index.ts";

export interface FixtureCase {
  name: string;
  input: { cash: string; productive: string; redeemable?: string; obligation: string; policy?: Partial<RoutingPolicy> };
  expect: {
    route: Route | null;
    blockedReason?: string;
    cashUsed: string;
    shortfall: string;
    redeemAmount: string;
    remainingProductive: string;
  };
}

const raw = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8")) as {
  defaultPolicy: RoutingPolicy;
  cases: FixtureCase[];
};

export const defaultPolicy = raw.defaultPolicy;
export const fixtureCases = raw.cases;

export function toRoutingInput(c: FixtureCase): RoutingInput {
  return {
    cash: c.input.cash,
    productive: c.input.productive,
    redeemable: c.input.redeemable ?? c.input.productive,
    obligation: c.input.obligation,
    policy: { ...defaultPolicy, ...c.input.policy },
  };
}
