import { FetchOptions } from "../adapters/types";
import { UniGetRevenueRatioProps, getUniV3LogAdapter } from "./uniswap";
import { GULLY, addGullyToken, requireDeployed } from "./gullychain";

// Gully Swap: the Uniswap v3 deployment of Gully Chain (Arbitrum Orbit L3 by Gully Labs) plus two Gully contracts
// (GullySwapRouter: 0.25% interface fee; GullyFeeController: owns the factory, Uniswap v3 protocol fee 1/4 per pool).
// Addresses: helpers/gullychain.ts
export const GULLY_SWAP = {
  factory: GULLY.swap.factory as string,
  factoryDeployBlock: GULLY.swap.factoryDeployBlock as number,
  router: GULLY.swap.router,
  feeController: GULLY.swap.feeController,
  start: GULLY.start,
};
export { addGullyToken };

const POOL_CREATED = "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)";
export const ROUTER_SWAP = "event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee)";

// Every pool the factory has created up to the end of the window. The shared uniV3 helper's `factory` mode reads the
// pool list from the TVL adapter's log cache instead; that cache only exists once DefiLlama-Adapters/projects/gully-swap
// runs in production, so the pools are read from the chain here (one small log query, cached in the cloud).
export async function getGullySwapPools(options: FetchOptions): Promise<string[]> {
  requireDeployed("gully-swap", Boolean(GULLY_SWAP.factory));
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
