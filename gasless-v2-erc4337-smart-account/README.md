# Gasless API v2 — ERC-4337 Smart Account

A headless example of using the [0x Gasless API v2](https://0x.org/docs/gasless-api/introduction) with an **ERC-4337 smart wallet** (e.g. Alchemy [Modular Account v2](https://accountkit.alchemy.com/)).

Raw ERC-4337 signatures are accepted by the Gasless API via EIP-1271: instead of splitting an EOA signature into `r`/`s`/`v`, the smart wallet's packed signature bytes are submitted directly using `signatureType: 5` (Raw). The 0x settlement contract calls `isValidSignature()` on the smart wallet contract to verify them.

Demonstrates the following on Base mainnet:

1. Create an ERC-4337 Modular Account v2 smart wallet via Alchemy Account Kit
2. Get a gasless quote (sell 1 USDC → buy WETH) using `/gasless/quote`
3. Deploy the smart wallet and/or approve on-chain if needed — bundled into one UserOperation when both are required
4. Sign the gasless approval if the token supports it (`signatureType: 5`)
5. Sign the trade object with the smart wallet (`signatureType: 5`)
6. Submit the swap using `/gasless/submit`
7. Poll trade status using `/gasless/status/{tradeHash}`

> [!IMPORTANT]
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

## How it works

ERC-4337 smart wallets sign typed data via EIP-1271. The Gasless API accepts these raw signatures using `signatureType: 5`, which passes the signature bytes directly to the wallet contract's `isValidSignature()` function rather than performing standard ECDSA recovery.

On the first swap the smart wallet contract is deployed automatically (funded with ~0.005 ETH). After deployment, all future swaps are fully gasless — 0x covers gas fees.

## Requirements

- Node.js 18+
- An Ethereum private key (this EOA owns/controls the smart wallet)
- A [0x API key](https://0x.org/docs/introduction/getting-started)
- An [Alchemy API key](https://dashboard.alchemy.com) (Base app)

## Setup

1. Copy `.env.example` to `.env` and fill in your keys:

```sh
cp .env.example .env
```

2. Install dependencies:

```sh
npm install
```

3. Get your smart wallet address:

```sh
npm run address
```

4. Fund the smart wallet address on Base with:
   - **1 USDC** (the sell amount)
   - **~0.005 ETH** (covers smart wallet deployment on first use)

   After the first transaction, future swaps are fully gasless.

5. Run the swap:

```sh
npm start
```

## Supported Networks

See [here](https://0x.org/docs/introduction/0x-cheat-sheet#-chain-support) for the full list of 0x API supported networks.
