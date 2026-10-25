import * as sdk from "@defillama/sdk";
import { FetchOptions, ProtocolType, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { fetchEvmChainMetricsFromOptions } from "../helpers/evmChainFees";
import { METRIC } from "../helpers/metrics";

// Gully Chain: an Arbitrum Orbit (Nitro) L3 in rollup mode. Users pay gas in ETH on the L3; the sequencer posts the
// batches and the validator posts the assertions to the parent chain and pays the parent chain's gas for that.
// Fees = all gas paid on the L3 (base fee to the network fee account plus the L1-pricing component that reimburses
// the batch poster). Revenue = fees minus what the batch poster and the validator spent on the parent chain, as the
// Robinhood Chain adapter does for Ethereum (fees/robinhood). No Arbitrum Expansion Program share applies: the Nitro
// licence grants chains that settle to Arbitrum One, Nova or Sepolia a free licence without the 10% AEP fee
// (https://docs.arbitrum.io/launch-arbitrum-chain/overview/license).
//
// Parent-chain costs are read from DefiLlama's indexer (transactions sent by the batch poster and the validator).
// The testnet settles to Arbitrum Sepolia, which the indexer does not cover, so PARENT is unset until mainnet; set it
// to the mainnet batch poster and validator (gully-ops/l3/generated/addresses.json) and CHAIN.ARBITRUM at launch.
const PARENT: { chain: string; batchPoster: string; validator: string } | undefined = undefined;

const PARENT_COSTS = "Arbitrum One Settlement Costs";

async function getParentChainCosts(options: FetchOptions): Promise<bigint> {
  if (!PARENT) return 0n;
  const [fromBlock, toBlock] = await Promise.all([
    options.getBlock(options.fromTimestamp, PARENT.chain, {}),
    options.getBlock(options.toTimestamp, PARENT.chain, {}),
  ]);
  const transactions = await sdk.indexer.getTransactions({
    chain: PARENT.chain,
    addresses: [PARENT.batchPoster, PARENT.validator],
    transactionType: "from",
    from_block: fromBlock,
    to_block: toBlock,
    all: true,
  });
  if (!transactions) throw new Error(`indexer returned no transactions for ${PARENT.chain}`);
  let costs = 0n;
  for (const tx of transactions) costs += BigInt(tx.gasUsed) * BigInt(tx.effectiveGasPrice ?? tx.gasPrice);
  return costs;
}

const fetch = async (options: FetchOptions) => {
  const metrics = await fetchEvmChainMetricsFromOptions(options, { chain: CHAIN.GULLYCHAIN, blockChunkSize: 500 });
  const parentCosts = await getParentChainCosts(options);

  const dailyFees = options.createBalances();
  const dailyRevenue = options.createBalances();
  const dailySupplySideRevenue = options.createBalances();
  // the gas token is ETH; priced through CoinGecko until the coins service knows the chain's gas token
  dailyFees.addCGToken("ethereum", Number(metrics.totalFeesWei) / 1e18, METRIC.TRANSACTION_GAS_FEES);
  dailyRevenue.addCGToken("ethereum", Number(metrics.totalFeesWei - parentCosts) / 1e18, METRIC.TRANSACTION_GAS_FEES);
  dailySupplySideRevenue.addCGToken("ethereum", Number(parentCosts) / 1e18, PARENT_COSTS);

  return {
    dailyFees,
    dailyRevenue,
    dailySupplySideRevenue,
    dailyTransactionsCount: metrics.transactionCount,
    dailyGasUsed: metrics.totalGasUsed.toString(),
  };
};

const adapter: SimpleAdapter = {
  version: 2,
  pullHourly: true,
  fetch,
  chains: [CHAIN.GULLYCHAIN],
  start: "2026-10-25",
  protocolType: ProtocolType.CHAIN,
  isExpensiveAdapter: true,
  allowNegativeValue: true, // revenue is negative on a day when settlement costs exceed the gas paid on the chain
  methodology: {
    Fees: "Transaction gas fees paid by users on Gully Chain (ETH): gasUsed times effectiveGasPrice of every receipt in the window.",
    Revenue: "Gas fees net of the parent-chain (Arbitrum One) gas the batch poster and the validator pay to post batches and assertions. Chains settling to Arbitrum One owe no Arbitrum Expansion Program share.",
    SupplySideRevenue: "Arbitrum One gas paid by the Gully Chain batch poster and validator.",
  },
  breakdownMethodology: {
    Fees: {
      [METRIC.TRANSACTION_GAS_FEES]: "Sum of gasUsed multiplied by effectiveGasPrice across all Gully Chain receipts in the window.",
    },
    Revenue: {
      [METRIC.TRANSACTION_GAS_FEES]: "Gully Chain gas fees net of the parent-chain settlement costs.",
    },
    SupplySideRevenue: {
      [PARENT_COSTS]: "Gas paid on Arbitrum One by the batch poster (SequencerInbox batches) and the validator (RollupProxy assertions).",
    },
  },
};

export default adapter;
