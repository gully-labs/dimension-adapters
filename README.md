<!-- gully-header:start -->
<p align="center">
  <a href="https://gullychain.xyz">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/gullychain-badge-dark.png">
      <img alt="Powered by GullyChain" src=".github/assets/gullychain-badge-light.png" width="360" height="96">
    </picture>
  </a>
</p>

<p align="center"><b>The social chain where your profile is your wallet. Arbitrum Orbit L3, testnet chain 485590.</b></p>

<p align="center">DefiLlama volume and fees adapters, including the Gully Chain apps.</p>

<p align="center">
  <a href="https://gullychain.xyz"><img src="https://img.shields.io/badge/gullychain.xyz-01D9FA?style=for-the-badge&labelColor=000000&logo=googlechrome&logoColor=000000" alt="Website"></a>
  <a href="https://docs.gullychain.xyz"><img src="https://img.shields.io/badge/Docs-0A0F1A?style=for-the-badge&labelColor=000000&logo=readthedocs&logoColor=01D9FA" alt="Docs"></a>
  <a href="https://t.me/GullyChain"><img src="https://img.shields.io/badge/Telegram-0A0F1A?style=for-the-badge&labelColor=000000&logo=telegram&logoColor=26A5E4" alt="Telegram"></a>
  <a href="https://discord.com/invite/tY2ErsNNBp"><img src="https://img.shields.io/badge/Discord-0A0F1A?style=for-the-badge&labelColor=000000&logo=discord&logoColor=5865F2" alt="Discord"></a>
  <a href="https://x.com/Gully_Labs"><img src="https://img.shields.io/badge/@Gully__Labs-0A0F1A?style=for-the-badge&labelColor=000000&logo=x&logoColor=white" alt="X"></a>
</p>

<p align="center"><sub>A Gully Chain fork of <a href="https://github.com/DefiLlama/dimension-adapters">DefiLlama/dimension-adapters</a>, maintained by <a href="https://gullylabs.xyz">Gully Labs</a>. It is upstream publishes no licence file, so all rights stay with the upstream authors. The upstream README follows below as published. Not affiliated with or endorsed by DefiLlama.</sub></p>

---
<!-- gully-header:end -->

# Adapters

Find the instructions to list, write, test and submit an adapter [here](https://docs.llama.fi/list-your-project/other-dashboards)

## Install dependencies

`pnpm i`

## test adapter commands

`pnpm test fees bitcoin`

`pnpm test fees bitcoin 2025-10-10`

Run only specific chains (5th argument):

`pnpm test fees cctp 2026-08-01 solana`

Multiple chains (comma-separated):

`pnpm test fees cctp 2026-08-01 stellar,solana`

On PowerShell, quote the chain list so the comma is not treated as an argument separator:

`pnpm test fees cctp 2026-08-01 "stellar,solana"`

## Adding custom RPC URLs

Create an `.env` file and add custom RPC URLs using the `{CHAIN}_RPC` format (use uppercase chain name):

```
ETHEREUM_RPC="https://yourcustomrpc.com"
```


<!-- gully-footer:start -->
---

<p align="center">
  <a href="https://gullylabs.xyz">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/powered-by-gully-labs-dark-2x.png">
      <img alt="Powered by Gully Labs" src=".github/assets/powered-by-gully-labs-light-2x.png" width="254" height="64">
    </picture>
  </a>
</p>
<!-- gully-footer:end -->
