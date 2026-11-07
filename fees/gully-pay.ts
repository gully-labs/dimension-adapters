import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { GULLY, GULLY_CHAINS, addGullyToken, requireDeployed } from "../helpers/gullychain";

// Gully Pay on Gully Chain (Arbitrum Orbit L3 by Gully Labs): checkout and x402 payments settled on chain.
// A payment goes through GullySplitter (instant) or GullyEscrow (release window, disputes). Both pay every party out
// with one Payout event per recipient, tagged with a kind:
//   0 PLATFORM  the Gully Pay platform fee (platformFeeBps, at most 10%, set per rule), paid to the Gully treasury
//   1 REFERRAL  the referrer's cut of the platform fee (referralBps of the rule, EIP-712 signed referral)
//   2 SHARE     a merchant-defined revenue share to a third party (the merchant's own split, not a fee)
//   3 MERCHANT  the merchant's proceeds
//   4 REFUND    money returned to the buyer (escrow disputes)
// Only kinds 0 and 1 are fees paid to the protocol and its referrers. Addresses per network: helpers/gullychain.ts
const KIND_PLATFORM = 0;
const KIND_REFERRAL = 1;

const SPLITTER_PAYOUT = "event Payout(bytes32 indexed paymentRef, address indexed account, address indexed token, uint256 amount, uint8 kind, bool pushed)";
const ESCROW_PAYOUT = "event Payout(uint256 indexed depositId, address indexed account, address indexed token, uint256 amount, uint8 kind, bool pushed)";

const PLATFORM_FEES = "Payment Platform Fees";
const PLATFORM_FEES_TO_TREASURY = "Payment Platform Fees To Treasury";
const REFERRAL_FEES = "Payment Referral Fees";

const fetch = async (options: FetchOptions) => {
  const { splitters, escrows } = GULLY.pay;
  requireDeployed("gully-pay", splitters.length + escrows.length > 0);
  const dailyFees = options.createBalances();
  const dailyUserFees = options.createBalances();
  const dailyRevenue = options.createBalances();
  const dailyProtocolRevenue = options.createBalances();
  const dailySupplySideRevenue = options.createBalances();

  const payouts = [
    ...(splitters.length ? await options.getLogs({ targets: splitters, eventAbi: SPLITTER_PAYOUT }) : []),
    ...(escrows.length ? await options.getLogs({ targets: escrows, eventAbi: ESCROW_PAYOUT }) : []),
  ];
  for (const payout of payouts) {
    const kind = Number(payout.kind);
    if (kind === KIND_PLATFORM) {
      addGullyToken(dailyFees, payout.token, payout.amount, PLATFORM_FEES);
      addGullyToken(dailyUserFees, payout.token, payout.amount, PLATFORM_FEES);
      addGullyToken(dailyRevenue, payout.token, payout.amount, PLATFORM_FEES_TO_TREASURY);
      addGullyToken(dailyProtocolRevenue, payout.token, payout.amount, PLATFORM_FEES_TO_TREASURY);
    } else if (kind === KIND_REFERRAL) {
      addGullyToken(dailyFees, payout.token, payout.amount, REFERRAL_FEES);
      addGullyToken(dailyUserFees, payout.token, payout.amount, REFERRAL_FEES);
      addGullyToken(dailySupplySideRevenue, payout.token, payout.amount, REFERRAL_FEES);
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
    Fees: "The Gully Pay platform fee and the referral share taken from every payment settled through GullySplitter or GullyEscrow (Payout events of kind PLATFORM and REFERRAL). Merchant proceeds, merchant-defined revenue shares and refunds are not fees.",
    UserFees: "Same as Fees: the fee is deducted from the payment the payer makes.",
    Revenue: "The platform fee paid to the Gully treasury.",
    ProtocolRevenue: "The platform fee paid to the Gully treasury.",
    SupplySideRevenue: "The referral share paid to referrers.",
  },
  breakdownMethodology: {
    Fees: {
      [PLATFORM_FEES]: "Payout events of kind PLATFORM (0).",
      [REFERRAL_FEES]: "Payout events of kind REFERRAL (1).",
    },
    UserFees: {
      [PLATFORM_FEES]: "Payout events of kind PLATFORM (0).",
      [REFERRAL_FEES]: "Payout events of kind REFERRAL (1).",
    },
    Revenue: { [PLATFORM_FEES_TO_TREASURY]: "Platform fee paid to the Gully treasury." },
    ProtocolRevenue: { [PLATFORM_FEES_TO_TREASURY]: "Platform fee paid to the Gully treasury." },
    SupplySideRevenue: { [REFERRAL_FEES]: "Referral share paid to referrers." },
  },
};

export default adapter;
