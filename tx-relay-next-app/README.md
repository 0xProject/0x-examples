# 0x Tx Relay API Demo App (Next.js App Router)

## Overview

This guide will walk-through the demo app [TODO: Insert LINK] that demonstrates best practices when implementing gasless approvals and swap functionality into your ERC-20 token swapping dApp using Tx Relay API.

An example ERC-20 swap application built on [Next.js 13](https://nextjs.org/) with [0x Tx Relay API](https://0x.org/docs/tx-relay-api/introduction). It covers best practices when implementing gasless approvals and swap functionality into your dApp or workflow.

The principles covered are are the same ones used by production-level dApps, such as in the [Matcha Auto](https://help.matcha.xyz/en/articles/7939087-what-is-matcha-auto) feature of [Matcha.xyz](https://matcha.xyz/), in which Matcha submits the transactions and handles the gas on users behalf.

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

### Live Demo

Checkout with live demo 👉 here [TODO: Insert link]

![](https://raw.githubusercontent.com/0xProject/0x-examples/tx-relay-next-app/tx-relay-demo-screen-recording.gif))

## Getting Started

1. Setup the required API keys

- projectId
  - RainbowKit relies on WalletConnect. Obtain a free `projectId` from [WalletConnect Cloud](https://cloud.walletconnect.com/app).
  - Add [here](TODO add link)
- 0x
  - 0x API key (create one [here](https://0x.org/docs/introduction/getting-started)) =
  - Add for /price [here](TODO add code) and for /quote [here](TODO add code)

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

### Tx Relay API Docs

- [Intro to Tx Relay API](https://0x.org/docs/tx-relay-api/introduction)
- [Development Status](https://0x.org/docs/tx-relay-api/development-status)
- [Understanding Tx Relay API](https://0x.org/docs/tx-relay-api/guides/understanding-tx-relay-api)
- [API Overview](https://0x.org/docs/tx-relay-api/api-references/overview)
  - [/price](https://0x.org/docs/tx-relay-api/api-references/get-tx-relay-v1-swap-price)
  - [/quote](https://0x.org/docs/tx-relay-api/api-references/get-tx-relay-v1-swap-quote)
  - [/submit](https://0x.org/docs/tx-relay-api/api-references/post-tx-relay-v1-swap-submit)
  - [/status](https://0x.org/docs/tx-relay-api/api-references/get-tx-relay-v1-swap-status-trade-hash)
- [FAQ](https://0x.org/docs/tx-relay-api/tx-relay-faq)
- [Gasless approvals token list](https://0x.org/docs/tx-relay-api/gasless-approvals-token-list)
