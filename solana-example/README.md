# 0x Solana Swap Example

A TypeScript script that swaps 0.001 SOL for USDC with the [0x Solana Swap API](https://docs.0x.org/solana/solana-swap-api/introduction) and [Solana Kit](https://github.com/anza-xyz/kit). It builds a v1 transaction.

[`src/swap.ts`](./src/swap.ts) is the part to copy into your app. It has one function per step:

1. `getSwapInstructions`: request instructions from `/solana/swap-instructions` with `transaction_version: "v1"`.
2. `toKitInstruction`: convert each instruction to Solana Kit's format.
3. `buildSwapTransaction`: build the v1 message with a priority fee, then simulate it to set the compute unit limit and the loaded accounts data size limit. A v1 transaction that does not set these limits fails.
4. `signAndSend`: sign, send, and confirm.

[`src/index.ts`](./src/index.ts) runs those steps with settings from `.env`. [`src/demo.ts`](./src/demo.ts) only exists so the script can simulate without your private key.

## Run it

Requires Node.js 20.12 or later.

```bash
npm install
cp .env.example .env   # set ZEROEX_API_KEY; PRIVATE_KEY is optional
npm run index
```

| Variable         | Description                                                                                   | Default                               |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| `ZEROEX_API_KEY` | Your API key from the [0x Dashboard](https://dashboard.0x.org).                                | Required                              |
| `PRIVATE_KEY`    | Base58 private key of the wallet that swaps. It needs at least 0.001 SOL plus fees. Without it, the script simulates the swap for the fee payer of a recent USDC transaction that holds SOL, and never signs. | None                                  |
| `RPC_URL`        | Solana RPC HTTP URL. The public endpoint is rate limited; use your own for anything real.       | `https://api.mainnet.solana.com` |
| `DRY_RUN`        | When `true`, the script simulates the transaction but does not send it.                        | `true`                                |

Example output:

```
Quote: 71979 USDC base units (at least 71619)
Simulation succeeded
Dry run for 2DJ4W26cACLXbf1bpxE5Uau1zLNa6BsUK9mxZd7am47F: set PRIVATE_KEY to swap from your own wallet.
```
