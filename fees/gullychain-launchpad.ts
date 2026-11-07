import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { GULLY, GULLY_CHAINS, addGullyToken, requireDeployed } from "../helpers/gullychain";

// Gully Launchpad on Gully Chain (Arbitrum Orbit L3 by Gully Labs): pump.fun-style bonding curves. Fee model
// (gully-ops/l3/launchpad/README.md, https://docs.gullychain.xyz/contracts/):
// - 1% (FEE_BPS = 100) of every curve buy and sell, paid to the launchpad's feeRecipient (the Gully treasury);
// - after graduation the token's liquidity sits in a Uniswap v3 pool whose LP NFT is locked in a GullyLPLocker. Its
//   collect() pays the position's LP fees 50% to the token's creator and 50% to the treasury (v2.1). v2.0's locker
//   pays 100% to the treasury, and v1.0 burned its LP NFTs (no fees).
//   v3 (GullyLaunchpadV3 + GullyFairLaunch) keeps the same 1% curve fee, Trade event and 50/50 locker split.
// Deployments and lockers per network: helpers/gullychain.ts
const { launchpads: LAUNCHPADS, lockers: LOCKERS, positionManager: POSITION_MANAGER } = GULLY.launchpad;
const ETH = "0x0000000000000000000000000000000000000000";

const FEE_BPS = 100n; // GullyLaunchpad.FEE_BPS, 1% on buys and sells
const BPS = 10_000n;

const TRADE = "event Trade(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 priceE18, uint256 ethReserve, uint256 tokenReserve)";
const FEES_COLLECTED = "event FeesCollected(uint256 indexed tokenId, uint256 token0Amount, uint256 token1Amount, uint256 creatorShare0, uint256 creatorShare1, uint256 platformShare0, uint256 platformShare1)";
const POSITIONS_ABI = "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)";

const CURVE_FEES = "Bonding Curve Trade Fees";
const CURVE_FEES_TO_TREASURY = "Bonding Curve Trade Fees To Treasury";
const LP_FEES = "Graduated Pool LP Fees";
const LP_FEES_TO_TREASURY = "Graduated Pool LP Fees To Treasury";
const LP_FEES_TO_CREATORS = "Graduated Pool LP Fees To Creators";

const fetch = async (options: FetchOptions) => {
  requireDeployed("gullychain-launchpad", LAUNCHPADS.length > 0);
  const dailyFees = options.createBalances();
  const dailyUserFees = options.createBalances();
  const dailyRevenue = options.createBalances();
  const dailyProtocolRevenue = options.createBalances();
  const dailySupplySideRevenue = options.createBalances();

  // Trade.ethAmount is the ETH the trader paid including the fee (buy) or received after the fee (sell):
  // buy: fee = ceil(ethIn * FEE_BPS / BPS), ethAmount = ethIn; sell: fee = ceil(gross * FEE_BPS / BPS), ethAmount = gross - fee
  const trades = await options.getLogs({ targets: LAUNCHPADS, eventAbi: TRADE });
  let curveFees = 0n;
  for (const trade of trades) {
    const ethAmount = BigInt(trade.ethAmount);
    curveFees += trade.isBuy ? (ethAmount * FEE_BPS) / BPS : (ethAmount * FEE_BPS) / (BPS - FEE_BPS);
  }
  addGullyToken(dailyFees, ETH, curveFees, CURVE_FEES);
  addGullyToken(dailyUserFees, ETH, curveFees, CURVE_FEES);
  addGullyToken(dailyRevenue, ETH, curveFees, CURVE_FEES_TO_TREASURY);
  addGullyToken(dailyProtocolRevenue, ETH, curveFees, CURVE_FEES_TO_TREASURY);

  // LP fees of graduated pools, collected from the locked positions (anyone may call collect)
  const collected = await options.getLogs({ targets: LOCKERS, eventAbi: FEES_COLLECTED });
  if (collected.length) {
    const tokenIds = [...new Set(collected.map((log: any) => log.tokenId.toString()))];
    const positions = await options.api.multiCall({ abi: POSITIONS_ABI, target: POSITION_MANAGER as string, calls: tokenIds });
    const tokensOf: Record<string, [string, string]> = {};
    tokenIds.forEach((id, i) => { tokensOf[id] = [positions[i].token0, positions[i].token1]; });
    for (const log of collected) {
      const [token0, token1] = tokensOf[log.tokenId.toString()];
      addGullyToken(dailyFees, token0, BigInt(log.creatorShare0) + BigInt(log.platformShare0), LP_FEES);
      addGullyToken(dailyFees, token1, BigInt(log.creatorShare1) + BigInt(log.platformShare1), LP_FEES);
      addGullyToken(dailyRevenue, token0, log.platformShare0, LP_FEES_TO_TREASURY);
      addGullyToken(dailyRevenue, token1, log.platformShare1, LP_FEES_TO_TREASURY);
      addGullyToken(dailyProtocolRevenue, token0, log.platformShare0, LP_FEES_TO_TREASURY);
      addGullyToken(dailyProtocolRevenue, token1, log.platformShare1, LP_FEES_TO_TREASURY);
      addGullyToken(dailySupplySideRevenue, token0, log.creatorShare0, LP_FEES_TO_CREATORS);
      addGullyToken(dailySupplySideRevenue, token1, log.creatorShare1, LP_FEES_TO_CREATORS);
    }
  }

  return { dailyFees, dailyUserFees, dailyRevenue, dailyProtocolRevenue, dailySupplySideRevenue };
};

const adapter: SimpleAdapter = {
  version: 2,
  pullHourly: true,
  fetch,
  chains: GULLY_CHAINS,
  start: GULLY.start,
  methodology: {
    Fees: "1% of the ETH side of every bonding-curve buy and sell on every GullyLaunchpad deployment (Trade events), plus the Uniswap v3 LP fees that GullyLPLocker collects from the locked liquidity of graduated tokens (FeesCollected events). Those LP fees are the LP side of the graduated pools' swap fees, which the Gully Swap adapter reports as pool fees.",
    UserFees: "The 1% bonding-curve trade fee paid by traders.",
    Revenue: "The whole bonding-curve trade fee plus the treasury's share of the collected LP fees (50% with lockers v2 and v3, 100% with locker v1).",
    ProtocolRevenue: "Same as Revenue: everything goes to the Gully treasury.",
    SupplySideRevenue: "The creator's 50% share of the collected LP fees (lockers v2 and v3).",
  },
  breakdownMethodology: {
    Fees: {
      [CURVE_FEES]: "1% of every curve buy and sell (FEE_BPS = 100), derived from Trade.ethAmount.",
      [LP_FEES]: "LP fees collected from the locked Uniswap v3 positions of graduated tokens (creator share plus platform share).",
    },
    UserFees: {
      [CURVE_FEES]: "1% bonding-curve trade fee paid by traders.",
    },
    Revenue: {
      [CURVE_FEES_TO_TREASURY]: "Bonding-curve trade fees, all paid to the launchpad's feeRecipient (the treasury).",
      [LP_FEES_TO_TREASURY]: "Platform share of the collected LP fees (FeesCollected.platformShare0/1).",
    },
    ProtocolRevenue: {
      [CURVE_FEES_TO_TREASURY]: "Bonding-curve trade fees, all paid to the launchpad's feeRecipient (the treasury).",
      [LP_FEES_TO_TREASURY]: "Platform share of the collected LP fees (FeesCollected.platformShare0/1).",
    },
    SupplySideRevenue: {
      [LP_FEES_TO_CREATORS]: "Creator share of the collected LP fees (FeesCollected.creatorShare0/1).",
    },
  },
};

export default adapter;
