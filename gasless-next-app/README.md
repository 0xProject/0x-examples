# 0x Gasless API Demo App (Next.js App Router)

## Live Demo

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

Checkout the live demo 👉 [here](https://0x-examples.vercel.app/)

<img width="634" alt="Screenshot 2024-02-29 at 9 36 48 PM" src="https://github.com/0xProject/0x-examples/assets/8042156/9bf16fd6-a420-4373-8d1c-c37c5abc3a65">

## Overview

This guide will walk-through a demo app that demonstrates best practices when implementing gasless approvals and swap functionality into your ERC-20 token swapping dApp using Gasless API (formerly Tx Relay).

An example ERC-20 swap application built on [Next.js 13](https://nextjs.org/) with [0x Gasless API](https://0x.org/docs/tx-relay-api/introduction). It covers best practices when implementing gasless approvals and swap functionality into your dApp or workflow.

The principles covered are the same ones used by production-level dApps, such as in the [Matcha Auto](https://help.matcha.xyz/en/articles/7939087-what-is-matcha-auto) feature of [Matcha.xyz](https://matcha.xyz/), in which Matcha submits the transactions and handles the gas on users behalf.

This demo showcases trading USDC (a gasless approved token that is on the Polygon-supported sell list) for WMATIC (a non-gasless approved token). An expanded version of this app that handles more token support is coming soon. Read more about tokens supported by Gasless API [here](https://0x.org/docs/tx-relay-api/guides/build-a-dapp-with-tx-relay-api#-token-lists).

## Supported Networks

Gasless API is supported on the following chains via https://api.0x.org/. Select the chain in your request by providing the corresponding chain id with the `0x-chain-id` header.

| Chain              | Chain ID |
| ------------------ | -------- |
| Ethereum (Mainnet) | 1        |
| Polygon            | 137      |
| Arbitrum           | 42161    |
| Base               | 84531    |
| Optimism           | 10       |

Read more by accessing the [API endpoints](https://0x.org/docs/tx-relay-api/api-references/overview).

## Getting Started

1. Create an `.env` file and setup the required [environment variables](https://github.com/0xProject/0x-examples/blob/main/gasless-next-app/.env.template)

| **env variable**                        | **Description**                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Description: RainbowKit relies on WalletConnect. Obtain a free `projectId` from [WalletConnect Cloud](https://cloud.walletconnect.com/app). |
| `NEXT_PUBLIC_ZEROEX_API_KEY`            | All 0x calls require an API key. Create a free one [here](https://0x.org/docs/introduction/getting-started).                                |

2. Install project dependencies

```
npm install
```

3. Start the Next.js development server

```
npm run dev
```

4. Navigate to [http://localhost:3000](http://localhost:3000)

```
open http://localhost:3000
```

## Resources

### 🎥 Video Walk-through

https://youtu.be/0d0tVwJCbiw?si=rT5g6aX6qLJ0qgUX

### 📚 Gasless API Docs

Checkout this guide, for a full walk-through of this demo app [**How to build a dApp with Gasless API**](https://0x.org/docs/tx-relay-api/guides/build-a-dapp-with-tx-relay-api).

Additional Gasless API resources:

- [Intro to Gasless API](https://0x.org/docs/tx-relay-api/introduction)
- [Development Status](https://0x.org/docs/tx-relay-api/development-status)
- [Understanding Gasless API](https://0x.org/docs/tx-relay-api/guides/understanding-tx-relay-api)
- [API Overview](https://0x.org/docs/tx-relay-api/api-references/overview)
  - [/price](https://0x.org/docs/tx-relay-api/api-references/get-tx-relay-v1-swap-price)
  - [/quote](https://0x.org/docs/tx-relay-api/api-references/get-tx-relay-v1-swap-quote)
  - [/submit](https://0x.org/docs/tx-relay-api/api-references/post-tx-relay-v1-swap-submit)
  - [/status](https://0x.org/docs/tx-relay-api/api-references/get-tx-relay-v1-swap-status-trade-hash)
- [FAQ](https://0x.org/docs/tx-relay-api/tx-relay-faq)
- [Gasless approvals token list](https://0x.org/docs/tx-relay-api/gasless-approvals-token-list)
