import { FetchOptions } from "../adapters/types";
import { UniGetRevenueRatioProps, getUniV3LogAdapter } from "./uniswap";

// Gully Swap: the Uniswap v3 deployment of Gully Chain (Arbitrum Orbit L3, chain id 485590) plus two Gully contracts.
// Addresses and deploy blocks: gully-ops/l3/generated/{uniswap-v3,gullyswap}.json, https://docs.gullychain.xyz/contracts/
export const GULLY_SWAP = {
  factory: "0x1787a3bA8C8D7a2439cfA2EFaFc683ECAC623950", // UniswapV3Factory, deployed in block 22
  factoryDeployBlock: 22,
  // GullySwapRouter: 0.25% interface fee (feeBps = 25, at most 100) on the input of every swap made through the app
  router: "0x1283a251E34296675CC5130A2B02871384c0436a",
  // GullyFeeController owns the factory and switches the Uniswap v3 protocol fee on per pool (feeProtocol 1/4 = 25%)
  feeController: "0x47214e56806Daa1cdA5981E2F1AFE8FDfF19D93b",
  start: "2026-10-25",
};

// tokens of Gully Chain that are not on CoinGecko yet (new chain): priced through the canonical coins until the
// DefiLlama coins service maps gullychain:<address> itself, after which `balances.add(token, amount)` is enough
export const GULLY_PRICED_TOKENS: Record<string, { coingeckoId: string; decimals: number }> = {
  "0x0000000000000000000000000000000000000000": { coingeckoId: "ethereum", decimals: 18 }, // ETH, the gas token
  "0x26acccb2e98ca9e067e58668aa3b101bef432754": { coingeckoId: "ethereum", decimals: 18 }, // WETH9
  "0x65ba03c6fa90ed549f465d4c8f2e784d6eeb7e76": { coingeckoId: "usd-coin", decimals: 6 }, // USDC.e (bridged USDC)
  "0xdbe84be6496fb3d07f601548555ec7acc4ceba8f": { coingeckoId: "usd-coin", decimals: 6 }, // glUSD (1:1 against USDC.e)
};

export function addGullyToken(balances: any, token: string, amount: bigint | string | number, label?: string) {
  const priced = GULLY_PRICED_TOKENS[token.toLowerCase()];
  if (priced) balances.addCGToken(priced.coingeckoId, Number(amount) / 10 ** priced.decimals, label);
  else balances.add(token, amount, label);
}

const POOL_CREATED = "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)";
export const ROUTER_SWAP = "event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee)";

// Every pool the factory has created up to the end of the window. The shared uniV3 helper's `factory` mode reads the
// pool list from the TVL adapter's log cache instead; that cache only exists once DefiLlama-Adapters/projects/gully-swap
// runs in production, so the pools are read from the chain here (one small log query, cached in the cloud).
export async function getGullySwapPools(options: FetchOptions): Promise<string[]> {
  const logs = await options.getLogs({
    target: GULLY_SWAP.factory,
    eventAbi: POOL_CREATED,
    fromBlock: GULLY_SWAP.factoryDeployBlock,
    toBlock: await options.getToBlock(),
    cacheInCloud: true,
  });
  return logs.map((log: any) => log.pool);
}

// Swap volume and fees of every pool, with the protocol share read per pool from slot0.feeProtocol: GullyFeeController
// sets feeProtocol = (d, d) with d = feeProtocolDenominator (4 => 25% of the swap fee to the treasury, 75% to LPs).
// A pool starts at 0 until someone calls enableProtocolFee(pool), and graduated launchpad pools stay at 0 because
// their LP fees already go to the treasury and the creator through GullyLPLocker (see fees/gullychain-launchpad).
export function fetchGullySwapPools(options: FetchOptions, pools: string[]) {
  return getUniV3LogAdapter({
    pools,
    dynamicProtocolFees: true,
    userFeesRatio: 1,
    getRevenueRatio: ({ protocolFeeRatioToken0, protocolFeeRatioToken1 }: UniGetRevenueRatioProps) => {
      if (protocolFeeRatioToken0 === undefined || protocolFeeRatioToken1 === undefined) throw new Error("slot0 of a Gully Swap pool could not be read");
      // the controller always sets both denominators to the same value; take the lower one if they ever differ
      const ratio = Math.min(protocolFeeRatioToken0, protocolFeeRatioToken1);
      return { _revenueRatio: ratio, _protocolRevenueRatio: ratio, _holdersRevenueRatio: 0 };
    },
  })(options);
}

// the helper returns plain zeros instead of Balances when the chain has no pool with priced liquidity yet
export function asBalances(options: FetchOptions, value: any) {
  return value && typeof value.add === "function" ? value : options.createBalances();
}
