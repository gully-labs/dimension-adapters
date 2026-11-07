import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { GULLY, GULLY_CHAINS, addGullyToken, requireDeployed } from "../helpers/gullychain";

// Gully Creators on Gully Chain (Arbitrum Orbit L3 by Gully Labs): ERC-1155 editions (CreatorEditions) and time-based
// memberships (CreatorMemberships). Every paid primary sale pays a fixed 5% platform fee (PLATFORM_FEE_BPS = 500, a
// constant) to the Gully treasury; the rest goes to the creator or their RoyaltySplit. Both contracts state the split in
// the sale event (Minted / Subscribed: paid, platformFee, creatorProceeds). Resale royalties are paid inside Seaport
// orders straight to the creator and are not a protocol fee, so they are not counted. Addresses: helpers/gullychain.ts
const MINTED = "event Minted(uint256 indexed id, address indexed minter, address indexed to, uint256 quantity, address currency, uint256 paid, uint256 platformFee, uint256 creatorProceeds, address payoutRecipient)";
const SUBSCRIBED = "event Subscribed(uint256 indexed planId, address indexed member, uint256 indexed tokenId, address payer, uint256 periods, uint40 expiresAt, uint256 paid, uint256 platformFee, uint256 creatorProceeds, address payoutRecipient)";
const PAYMENT_TOKEN_ABI = "address:paymentToken";

const EDITION_FEES = "Edition Mint Platform Fees";
const MEMBERSHIP_FEES = "Membership Platform Fees";
const EDITION_FEES_TO_TREASURY = "Edition Mint Platform Fees To Treasury";
const MEMBERSHIP_FEES_TO_TREASURY = "Membership Platform Fees To Treasury";

const fetch = async (options: FetchOptions) => {
  const { editions, memberships } = GULLY.creators;
  requireDeployed("gully-creators", Boolean(editions || memberships));
  const dailyFees = options.createBalances();
  const dailyUserFees = options.createBalances();
  const dailyRevenue = options.createBalances();
  const dailyProtocolRevenue = options.createBalances();

  const add = (token: string, amount: any, feeLabel: string, revenueLabel: string) => {
    addGullyToken(dailyFees, token, amount, feeLabel);
    addGullyToken(dailyUserFees, token, amount, feeLabel);
    addGullyToken(dailyRevenue, token, amount, revenueLabel);
    addGullyToken(dailyProtocolRevenue, token, amount, revenueLabel);
  };

  if (editions) {
    const mints = await options.getLogs({ target: editions, eventAbi: MINTED });
    for (const mint of mints) add(mint.currency, mint.platformFee, EDITION_FEES, EDITION_FEES_TO_TREASURY);
  }
  if (memberships) {
    const subs = await options.getLogs({ target: memberships, eventAbi: SUBSCRIBED });
    if (subs.length) {
      const paymentToken = await options.api.call({ target: memberships, abi: PAYMENT_TOKEN_ABI });
      for (const sub of subs) add(paymentToken, sub.platformFee, MEMBERSHIP_FEES, MEMBERSHIP_FEES_TO_TREASURY);
    }
  }
  return { dailyFees, dailyUserFees, dailyRevenue, dailyProtocolRevenue };
};

const adapter: SimpleAdapter = {
  version: 2,
  pullHourly: true,
  fetch,
  chains: GULLY_CHAINS,
  start: GULLY.start,
  methodology: {
    Fees: "The 5% platform fee on every paid edition mint (Minted.platformFee) and membership subscription (Subscribed.platformFee). Creator proceeds and resale royalties go to creators and are not counted.",
    UserFees: "Same as Fees: buyers and subscribers pay the platform fee as part of the price.",
    Revenue: "The whole platform fee, paid to the Gully treasury.",
    ProtocolRevenue: "The whole platform fee, paid to the Gully treasury.",
  },
  breakdownMethodology: {
    Fees: {
      [EDITION_FEES]: "5% of the price of paid edition mints (Minted.platformFee).",
      [MEMBERSHIP_FEES]: "5% of membership subscription payments (Subscribed.platformFee).",
    },
    UserFees: {
      [EDITION_FEES]: "5% of the price of paid edition mints (Minted.platformFee).",
      [MEMBERSHIP_FEES]: "5% of membership subscription payments (Subscribed.platformFee).",
    },
    Revenue: {
      [EDITION_FEES_TO_TREASURY]: "Edition platform fee credited to the treasury.",
      [MEMBERSHIP_FEES_TO_TREASURY]: "Membership platform fee credited to the treasury.",
    },
    ProtocolRevenue: {
      [EDITION_FEES_TO_TREASURY]: "Edition platform fee credited to the treasury.",
      [MEMBERSHIP_FEES_TO_TREASURY]: "Membership platform fee credited to the treasury.",
    },
  },
};

export default adapter;
