import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { GULLY_SWAP, asBalances, fetchGullySwapPools, getGullySwapPools } from "../helpers/gully-swap";

// Gully Swap: the Uniswap v3 deployment of Gully Chain (Arbitrum Orbit L3). Volume is the Swap events of every pool
// created by the factory. Fees and revenue live in fees/gully-swap (pool fees plus the router's interface fee).
const fetch = async (options: FetchOptions) => {
  const pools = await getGullySwapPools(options);
  const { dailyVolume } = await fetchGullySwapPools(options, pools);
  return { dailyVolume: asBalances(options, dailyVolume) };
};

const adapter: SimpleAdapter = {
  version: 2,
  pullHourly: true,
  fetch,
  chains: [CHAIN.GULLYCHAIN],
  start: GULLY_SWAP.start,
  methodology: {
    Volume: "Sum of the swap amounts of every Uniswap v3 pool created by the Gully Chain UniswapV3Factory (Swap events), including the graduated Gully Launchpad pools.",
  },
};

export default adapter;
