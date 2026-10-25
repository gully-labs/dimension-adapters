<!-- gully-header:start -->
<a href="https://gullychain.xyz"><img src="https://gullychain.xyz/brand/repos/dimension-adapters.svg" alt="GullyChain · DefiLlama Dimension Adapters" width="100%"></a>

<p align="center">
  <a href="https://gullychain.xyz"><img src="https://img.shields.io/badge/gullychain.xyz-01D9FA?style=for-the-badge&labelColor=000000&logo=googlechrome&logoColor=000000" alt="Website"></a>
  <a href="https://app.gullychain.xyz"><img src="https://img.shields.io/badge/App-0A0F1A?style=for-the-badge&labelColor=000000&logo=googlechrome&logoColor=01D9FA" alt="App"></a>
  <a href="https://docs.gullychain.xyz"><img src="https://img.shields.io/badge/Docs-0A0F1A?style=for-the-badge&labelColor=000000&logo=readthedocs&logoColor=01D9FA" alt="Docs"></a>
  <a href="https://x.com/Gully_Labs"><img src="https://img.shields.io/badge/@Gully__Labs-0A0F1A?style=for-the-badge&labelColor=000000&logo=x&logoColor=white" alt="X"></a>
  <a href="https://t.me/GullyLabsNews"><img src="https://img.shields.io/badge/Telegram-0A0F1A?style=for-the-badge&labelColor=000000&logo=telegram&logoColor=26A5E4" alt="Telegram"></a>
  <a href="https://github.com/gully-labs"><img src="https://img.shields.io/badge/GitHub-0A0F1A?style=for-the-badge&labelColor=000000&logo=github&logoColor=white" alt="GitHub"></a>
</p>

<p align="center"><b>DefiLlama Dimension Adapters: Volume and fees adapters, including the GullyChain apps.</b></p>

<p align="center"><sub>Maintained by <a href="https://gullylabs.xyz">Gully Labs</a> as part of <a href="https://gullychain.xyz">GullyChain</a>. Fork of <a href="https://github.com/DefiLlama/dimension-adapters">DefiLlama/dimension-adapters</a>, which has no LICENSE file; kept to submit the GullyChain adapters upstream. Not affiliated with or endorsed by DefiLlama.</sub></p>

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
