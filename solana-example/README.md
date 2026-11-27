# 0x Solana Swap Example

A TypeScript script that swaps 0.001 SOL for USDC with the [0x Solana Swap API](https://docs.0x.org/svm/solana-swap-api/introduction) and [Solana Kit](https://github.com/anza-xyz/kit). It builds a v1 transaction.

The script:

1. Fetches swap instructions from `/solana/swap-instructions` with `transaction_version: "v1"`.
2. Converts the instructions to Solana Kit instructions.
3. Builds a v1 transaction message with a priority fee.
4. Simulates the transaction to set the compute unit limit and the loaded accounts data size limit. A v1 transaction that does not set these limits fails.
5. Signs, sends, and confirms the transaction, unless `DRY_RUN` is `true`.

## Run it

Requires Node.js 20.12 or later.

```bash
npm install
cp .env.example .env   # then fill in the values
npm run index
```

| Variable         | Description                                                                                   | Default                               |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| `ZEROEX_API_KEY` | Your API key from the [0x Dashboard](https://dashboard.0x.org).                                | Required                              |
| `PRIVATE_KEY`    | Base58 private key of the wallet that swaps. It needs at least 0.001 SOL plus fees.            | Required                              |
| `RPC_URL`        | Solana RPC HTTP URL. The public endpoint is rate limited; use your own for anything real.       | `https://api.mainnet-beta.solana.com` |
| `DRY_RUN`        | When `true`, the script simulates the transaction but does not send it.                        | `true`                                |

Example output:

```
Quote: 72114 USDC base units (at least 71753)
Simulation succeeded: 77234 compute units, 1926712 bytes of account data
Dry run: set DRY_RUN=false to send the transaction.
```
