# Using 0x Swap API from QuickNode Marketplace

This example demonstrates how to integrate the [**0x Swap API Add-on**](https://marketplace.quicknode.com/add-on/0x-swap-api) directly from the **QuickNode Marketplace** using [viem](https://viem.sh/).  
It enables token swaps such as USDC → WETH on Base Mainnet without needing a separate 0x API key or external endpoint.

All requests are made directly through your **QuickNode HTTP Transport URL** with the path extension `/addon/1117`, making it simple and secure to query prices, fetch swap quotes, and execute transactions.

---

## ⚙️ Overview

The 0x Swap API Add-on on QuickNode allows you to perform on-chain token swaps across supported networks using the same robust infrastructure as 0x but fully integrated with your QuickNode endpoint.

### Example Flow
1. Fetch indicative pricing using `/swap/allowance-holder/price`
2. (If needed) Approve token allowance for the AllowanceHolder contract
3. Retrieve a firm quote using `/swap/allowance-holder/quote`
4. Execute the transaction on-chain via `sendTransaction`

---

## 🧠 Key Benefits

- **Single Endpoint** — All calls are routed through your QuickNode endpoint.  
- **No API Keys** — Authentication is handled by your QuickNode connection.  
- **Secure & Reliable** — Powered by QuickNode’s globally distributed node infrastructure.  
- **Marketplace Integration** — Easily enable the 0x Swap Add-on directly from your QuickNode dashboard.

---

## 🌐 Example Endpoint

You can call the same endpoints through your QuickNode URL:

```
https://your-subdomain.base-mainnet.quiknode.pro/your-token/addon/1117/swap/allowance-holder/price?chainId=8453&sellToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&buyToken=0x4200000000000000000000000000000000000006&sellAmount=100000
```

and for quotes:

```
https://your-subdomain.base-mainnet.quiknode.pro/your-token/addon/1117/swap/allowance-holder/quote?...params...
```

---

## ⚠️ Security Notes

- **Never** approve the **Settler** contract for token allowances.  
- Only approve **AllowanceHolder** or **Permit2**, as indicated by the API response (`issues.allowance.spender`).  
- Always review transaction data and contract addresses before sending mainnet transactions.

---

## 🧩 Environment Setup

Create a `.env` file in the project root:

```ini
# Wallet private key (use 0x-prefixed hex or raw hex string)
PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Your QuickNode Base Mainnet URL
QUICKNODE_HTTP_TRANSPORT_URL=https://your-subdomain.base-mainnet.quiknode.pro/your-token/
```

---

## 🚀 Run Example

Install dependencies and run the script with [Bun](https://bun.sh/) or Node.js:

```bash
bun install
bun run index.ts
# or use watch mode
bun --watch index.ts
```

---

## 📚 Supported Networks

The 0x Swap API Add-on currently supports all chains available through 0x Swap, including:

- Ethereum
- Base
- Polygon
- Arbitrum
- Optimism
- Avalanche
- BSC

Check the QuickNode Marketplace listing for the latest supported networks.

---

## 🧾 Reference

- [QuickNode Marketplace – 0x Swap Add-on](https://marketplace.quicknode.com/addon/0x-swap-api)
- [Viem Documentation](https://viem.sh/)
- [QuickNode Docs](https://quicknode.com/docs)