# MPP payments — headless TypeScript

Pay for 0x AllowanceHolder price and quote requests through Alchemy AgentPay using the Machine Payments Protocol (MPP) on Tempo. No 0x API key is required.

| Command | What it does |
| --- | --- |
| `npm run price` | Pays for an indicative swap price. |
| `npm run quote` | Pays for a firm quote with swap transaction data. |

The scripts pay for API access and print the result. They do not approve swap tokens or submit a swap transaction.

## Setup

Requires Node.js 22.12 or later and npm.

```sh
cd mpp-headless-example
npm ci
cp .env.example .env
```

Set `PRIVATE_KEY` in `.env` to a dedicated test wallet's key. Fund its address with test pathUSD on **Tempo Moderato**, using the [official Tempo faucet](https://docs.tempo.xyz/quickstart/faucet). You can request test tokens through its RPC:

```sh
curl https://rpc.moderato.tempo.xyz \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tempo_fundAddress","params":["YOUR_WALLET_ADDRESS"]}'
```

Replace `YOUR_WALLET_ADDRESS` with the address derived from your private key. Wait for the returned faucet transactions to confirm before running the examples. Base Sepolia test USDC cannot pay these Tempo requests.

## Supported payment chains

| Network | `.env` `CHAIN_ID` | Payment token | URL channel |
| --- | --- | --- | --- |
| Tempo Moderato (default, testnet) | `42431` | Test pathUSD | `/v1/mpp-tempo-testnet/` |
| Tempo mainnet | `4217` | USDC.e | `/v1/mpp-tempo/` |

| Token | Address |
| --- | --- |
| Test pathUSD on Moderato | `0x20c0000000000000000000000000000000000000` |
| USDC.e on Tempo mainnet | `0x20C000000000000000000000b9537d11c60E8b50` |

These are **payment networks**. `SWAP_CHAIN_ID=8453` requests a swap on Base, independently of which Tempo network pays for API access.

## Configuration

| Variable | Purpose |
| --- | --- |
| `AGENTPAY_URL` | Base URL for the payment channel, without an endpoint path or query parameters. Scripts append the price or quote route. |
| `PRIVATE_KEY` | Payer's EVM private key. Keep it in the ignored `.env` file. |
| `CHAIN_ID` | Tempo payment network. Must match the URL channel. |
| `PAYMENT_TOKEN` | Token the client permits for payment and uses for transaction fees. |
| `PAY_TO` | Expected API payment recipient. Verify the sample address against the recipient published by 0x before paying. |
| `MAX_PAYMENT_AMOUNT` | Per-payment cap in token base units: `10000` = 0.01 tokens with 6 decimals. Excludes transaction fees. |
| `RPC_URL` | Optional payment-chain RPC override. Defaults to the selected chain's public RPC. |
| `SWAP_CHAIN_ID`, `SELL_TOKEN`, `BUY_TOKEN`, `SELL_AMOUNT` | Swap parameters. Amount is in the sell token's base units. |
| `TAKER` | Wallet that would execute the swap. Defaults to the payment wallet address; included only for quotes. |

The default swap parameters request a price for 1 USDC → WETH on Base. The taker needs appropriate Base balances and allowances to execute a resulting quote. Funding the payer on Tempo only pays for API access.

## Price and quote URLs

| Resource | Testnet payment URL | Production payment URL |
| --- | --- | --- |
| Indicative price | `https://agent.api.0x.org/v1/mpp-tempo-testnet/swap-allowance-holder-price/` | `https://agent.api.0x.org/v1/mpp-tempo/swap-allowance-holder-price/` |
| Firm quote | `https://agent.api.0x.org/v1/mpp-tempo-testnet/swap-allowance-holder-quote/` | `https://agent.api.0x.org/v1/mpp-tempo/swap-allowance-holder-quote/` |

Unlike a full resource URL, `AGENTPAY_URL` contains only the base, such as `https://agent.api.0x.org/v1/mpp-tempo-testnet`. The scripts add `chainId`, `sellToken`, `buyToken`, and `sellAmount`; the quote command also adds `taker`.

## How payment works

[`src/client.ts`](src/client.ts) configures `mppx` with `tempo.charge({ mode: "push" })`, following the [0x MPP integration](https://docs.0x.org/docs/introduction/develop-with-ai/autonomous-agent-payments#mpp):

1. Request the resource and receive an HTTP 402 with a `WWW-Authenticate: Payment` challenge.
2. Check the payment chain, token, recipient, amount cap, and realm.
3. Sign and broadcast the Tempo payment, then print its transaction hash.
4. Retry the same API URL with an `Authorization: Payment` credential containing that hash.
5. Print the response and decode `Payment-Receipt` if supplied by the server.

Push mode pays before the API retry. A backend error or connection failure can therefore occur after funds have moved. Review the printed transaction before retrying. Each invocation allows one payment attempt; automatic payment for a second challenge is disabled. The cap is per payment, not a cumulative budget across invocations, and does not include network fees. Keep enough of the configured payment token for both the charge and fees.

## Testing

### 1. Local checks

```sh
npm run typecheck
npm test
```

The four tests cover URL construction, MPP challenge/credential/receipt handling, rejection of incorrect payment details, realm checks, and the one-payment retry limit. They use a public dummy key and mocked HTTP responses. Payment broadcasts and credential creation are mocked; these tests do not sign or send real transactions and do not require your key or funds.

### 2. Tempo testnet

With the default `.env` configuration and a funded Tempo testnet payer:

```sh
npm run price
npm run quote
```

Check the logged challenge, payment transaction, and HTTP status. In funded testnet runs, both resources returned HTTP 200 after charging **0.001 test pathUSD per request** (`amount: "1000"`). The quote response included transaction data; the fresh test taker had no Base USDC or allowance, which appeared in `issues`. No swap was submitted.

| Test | Payment transaction |
| --- | --- |
| Price | [View on Tempo testnet explorer](https://explore.testnet.tempo.xyz/tx/0x08030c6053567783339875aaf2e42103490bfba05c2206269f4173d3a55f2740) |
| Quote | [View on Tempo testnet explorer](https://explore.testnet.tempo.xyz/tx/0x9fe6ebab598587e3d34a279c163f6e99b1027423de346f98cbb57768204705f7) |

The tested responses omitted `Payment-Receipt`. The script still prints the payment hash from the SDK credential event so you can inspect it onchain. The testnet price is an observed value, not a fixed SDK setting; the live challenge determines the requested amount.

### 3. Production payments

After testing, update `.env`:

```env
AGENTPAY_URL=https://agent.api.0x.org/v1/mpp-tempo
CHAIN_ID=4217
PAYMENT_TOKEN=0x20C000000000000000000000b9537d11c60E8b50
```

Fund the payer with USDC.e on Tempo mainnet, verify `PAY_TO`, and run the same commands. The [0x documentation](https://docs.0x.org/docs/introduction/develop-with-ai/autonomous-agent-payments#mpp) lists 0.01 USDC.e per request, also observed in the unpaid mainnet challenge. These commands spend real funds on mainnet. Funded mainnet payments have not been tested for this example.

## References

- [0x autonomous agent payments — MPP](https://docs.0x.org/docs/introduction/develop-with-ai/autonomous-agent-payments#mpp)
- [Alchemy AgentPay](https://agentpay.alchemy.com/docs)
- [MPP Tempo](https://agentpay.alchemy.com/docs/mpp-tempo)
- [MPP Tempo testnet](https://agentpay.alchemy.com/docs/mpp-tempo-testnet)
- [MPP protocol and SDK documentation](https://mpp.dev)

`mppx` is pinned to 0.17.1, the published version used for these local and testnet checks. This example uses MPP's Tempo charge flow. For x402 standard payments and batch settlement, see the [x402 example](../x402-headless-example).
