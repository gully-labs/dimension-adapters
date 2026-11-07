import { CHAIN } from "./chains";

// Gully Chain (Arbitrum Orbit L3 by Gully Labs, settling to Arbitrum One): addresses of the Gully Labs contracts the
// gully-* adapters read. https://docs.gullychain.xyz/contracts/
export type GullyDeployment = {
  start: string;
  swap: { factory?: string; factoryDeployBlock?: number; router?: string; feeController?: string };
  launchpad: { launchpads: string[]; lockers: string[]; positionManager?: string };
  pay: { splitters: string[]; escrows: string[] };
  creators: { editions?: string; memberships?: string };
  parent?: { chain: string; batchPoster: string; validator: string };
  // tokens of the chain that are not on CoinGecko (new chain), priced through the canonical coins
  pricedTokens: Record<string, { coingeckoId: string; decimals: number }>;
};

const ETH = "0x0000000000000000000000000000000000000000";

// Written by tools/gullychain-config.mjs from the mainnet registry. Empty until Gully Chain mainnet exists: no chain is
// exported and every fetch refuses to run.
// BEGIN GENERATED CONFIG (tools/gullychain-config.mjs)
export const GULLY: GullyDeployment = {
  start: "",
  swap: {},
  launchpad: { launchpads: [], lockers: [] },
  pay: { splitters: [], escrows: [] },
  creators: {},
  pricedTokens: { [ETH]: { coingeckoId: "ethereum", decimals: 18 } },
};
// END GENERATED CONFIG

export const GULLY_CHAINS: string[] = GULLY.start ? [CHAIN.GULLYCHAIN] : [];

export function addGullyToken(balances: any, token: string, amount: bigint | string | number, label?: string) {
  const priced = GULLY.pricedTokens[token.toLowerCase()];
  if (priced) balances.addCGToken(priced.coingeckoId, Number(amount) / 10 ** priced.decimals, label);
  else balances.add(token, amount, label);
}

export function requireDeployed(name: string, ok: boolean) {
  if (!ok) throw new Error(`${name}: no Gully Chain deployment in helpers/gullychain.ts`);
}
