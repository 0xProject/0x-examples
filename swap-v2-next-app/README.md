# 0x Swap API v2 Demo (Next.js App Router)

An example ERC-20 swap application built on [Next.js App Router](https://nextjs.org/docs) with 0x Swap API v2 and [RainbowKit](https://www.rainbowkit.com/).

Swap API enables your users to easily and conveniently trade tokens at the best prices directly in your app. With one simple integration, 0x unlocks thousands of tokens on the most popular blockchains and aggregated liquidity from 100+ AMMs and professional market makers.

This demo app covers best practices for how to use the 0x Swap API's price endpoint for indicative pricing and the quote endpoint for firm quotes.

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

![priceView](src/img/priceView.png)
![quoteView](src/img/quoteView.png)

## Getting Started

1. Create an `.env` file and setup the required environment variables

```
cp .env.example .env
```

| **API Keys**            | **Description**                                                                                                  | **Code**                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| WalletConnect projectId | WalletConnect's SDK to help with connecting wallets (create one [here](https://cloud.walletconnect.com/sign-in)) | Add [here](https://github.com/0xProject/0x-examples/blob/jlin/update-with-swap-v2/swap-v2-next-app/.env.example#L3) |
| 0x                      | 0x API key (create one [here](https://0x.org/docs/introduction/getting-started))                                 | Add [here](https://github.com/0xProject/0x-examples/blob/jlin/update-with-swap-v2/swap-v2-next-app/.env.example#L3) |

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

## Supported Networks

Swap API is supported on the following chains. Access liquidity from the chain you want by using the corresponding chain URI when making a request:

| Chain               | Chain ID |
| ------------------- | -------- |
| Ethereum (Mainnet)  | 1        |
| Ethereum (Sepolia)  | 11155111 |
| Arbitrum            | 42161    |
| Avalanche           | 43114    |
| Base                | 84531    |
| Binance Smart Chain | 56       |
| Optimism            | 10       |
| Polygon             | 137      |
