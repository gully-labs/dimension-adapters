import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { GULLY_SWAP, ROUTER_SWAP, addGullyToken, asBalances, fetchGullySwapPools, getGullySwapPools } from "../helpers/gully-swap";

// Gully Swap fees on Gully Chain. Fee model (gully-ops/l3/gullyswap/README.md, https://docs.gullychain.xyz/contracts/):
// - every Uniswap v3 pool: the pool's swap fee tier, of which GullyFeeController takes 25% (feeProtocol 1/4) for the
//   treasury once the pool is switched on; LPs keep the rest. Graduated launchpad pools keep the protocol fee at 0.
// - every swap through the Gully Swap app: a 0.25% interface fee on the input, taken by GullySwapRouter before the
//   pool swap and sent to the treasury (Swap.fee, in tokenIn).
const INTERFACE_FEES = "Interface Fees";
const INTERFACE_FEES_TO_TREASURY = "Interface Fees To Treasury";

const fetch = async (options: FetchOptions) => {
  const pools = await getGullySwapPools(options);
  const poolResult = await fetchGullySwapPools(options, pools);
  const dailyFees = asBalances(options, poolResult.dailyFees);
  const dailyUserFees = asBalances(options, poolResult.dailyUserFees);
  const dailyRevenue = asBalances(options, poolResult.dailyRevenue);
  const dailySupplySideRevenue = asBalances(options, poolResult.dailySupplySideRevenue);
  const dailyProtocolRevenue = asBalances(options, poolResult.dailyProtocolRevenue);

  const routerSwaps = await options.getLogs({ target: GULLY_SWAP.router, eventAbi: ROUTER_SWAP });
  for (const swap of routerSwaps) {
    addGullyToken(dailyFees, swap.tokenIn, swap.fee, INTERFACE_FEES);
    addGullyToken(dailyUserFees, swap.tokenIn, swap.fee, INTERFACE_FEES);
    addGullyToken(dailyRevenue, swap.tokenIn, swap.fee, INTERFACE_FEES_TO_TREASURY);
    addGullyToken(dailyProtocolRevenue, swap.tokenIn, swap.fee, INTERFACE_FEES_TO_TREASURY);
  }

  return { dailyFees, dailyUserFees, dailyRevenue, dailySupplySideRevenue, dailyProtocolRevenue };
};

const adapter: SimpleAdapter = {
  version: 2,
  pullHourly: true,
  fetch,
  chains: [CHAIN.GULLYCHAIN],
  start: GULLY_SWAP.start,
  methodology: {
    Fees: "Swap fees of every Uniswap v3 pool on Gully Chain (the pool's fee tier applied to the swap amounts) plus the 0.25% interface fee GullySwapRouter takes on the input of every swap made through the Gully Swap app.",
    UserFees: "Everything traders pay: the pool swap fees and the interface fee.",
    Revenue: "The Uniswap v3 protocol fee share of the pool swap fees (25%, read per pool from slot0.feeProtocol; 0 on graduated launchpad pools and on pools not switched on yet) plus the whole interface fee.",
    ProtocolRevenue: "Same as Revenue: the Gully treasury receives both the protocol fee share and the interface fee.",
    SupplySideRevenue: "The share of the pool swap fees that stays with liquidity providers (75% on pools with the protocol fee switched on, 100% otherwise). On graduated launchpad pools the only LP is a GullyLPLocker, whose collected fees are reported by the Gully Launchpad adapter.",
  },
  breakdownMethodology: {
    Fees: {
      "Token Swap Fees": "Pool swap fees: the fee tier of each Uniswap v3 pool applied to its swap amounts.",
      [INTERFACE_FEES]: "0.25% of the input of every swap routed through GullySwapRouter (Swap.fee).",
    },
    UserFees: {
      "Trading fees": "Pool swap fees paid by traders.",
      [INTERFACE_FEES]: "Interface fee paid by traders on top of the pool fee.",
    },
    Revenue: {
      "Protocol fees": "Protocol fee share of the pool swap fees sent to the treasury by GullyFeeController.",
      [INTERFACE_FEES_TO_TREASURY]: "Interface fee sent to the treasury by GullySwapRouter.",
    },
    ProtocolRevenue: {
      "Protocol fees": "Protocol fee share of the pool swap fees sent to the treasury by GullyFeeController.",
      [INTERFACE_FEES_TO_TREASURY]: "Interface fee sent to the treasury by GullySwapRouter.",
    },
    SupplySideRevenue: {
      "LP fees": "Pool swap fees kept by liquidity providers.",
    },
  },
};

export default adapter;
