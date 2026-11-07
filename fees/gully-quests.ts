import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";

// Gully Quests: creators fund on-chain quests in ETH or an ERC-20, and QuestEscrow sends the platform fee to the treasury
// when a pool is funded. `Deposited.fee` is that fee, read per deposit, so a change of rate needs no change here.
const DEPOSITED =
  "event Deposited(uint256 indexed questId, address indexed from, address indexed asset, uint256 gross, uint256 fee, uint256 net)";

const FUNDING_FEES = "Quest Funding Fees";

const ESCROW: Record<string, { escrow: string; start: string }> = {
  [CHAIN.ROBINHOOD]: { escrow: "0x5Cb81e034f5662cDA31fc8507206DC8a96FE4211", start: "2026-11-04" },
};

const fetch = async (options: FetchOptions) => {
  const dailyFees = options.createBalances();
  const dailyRevenue = options.createBalances();
  const logs = await options.getLogs({ target: ESCROW[options.chain].escrow, eventAbi: DEPOSITED });
  for (const log of logs) {
    dailyFees.add(log.asset, log.fee, FUNDING_FEES);
    dailyRevenue.add(log.asset, log.fee, FUNDING_FEES);
  }
  return { dailyFees, dailyUserFees: dailyFees, dailyRevenue, dailyProtocolRevenue: dailyRevenue };
};

const adapter: SimpleAdapter = {
  version: 2,
  pullHourly: true,
  fetch,
  adapter: Object.fromEntries(Object.entries(ESCROW).map(([chain, { start }]) => [chain, { start }])),
  methodology: {
    Fees: "The platform fee on quest funding, read from each Deposited event.",
    UserFees: "Same as Fees: quest creators pay it.",
    Revenue: "All of the platform fee goes to the treasury.",
    ProtocolRevenue: "All of the platform fee goes to the treasury.",
  },
  breakdownMethodology: {
    Fees: { [FUNDING_FEES]: "Platform fee on each quest deposit." },
    UserFees: { [FUNDING_FEES]: "Platform fee on each quest deposit." },
    Revenue: { [FUNDING_FEES]: "Platform fee on each quest deposit, sent to the treasury." },
    ProtocolRevenue: { [FUNDING_FEES]: "Platform fee on each quest deposit, sent to the treasury." },
  },
};

export default adapter;
