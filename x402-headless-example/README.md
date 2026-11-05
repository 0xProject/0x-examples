# x402 payments — headless TypeScript

Pay for 0x AllowanceHolder price and quote requests through Alchemy AgentPay using either standard x402 settlement or the `batch-settlement` preview. Optionally execute the complete price → approve → quote → swap flow on Base. No 0x API key is needed for these payment-protected URLs.

| Script | What it shows |
| --- | --- |
| `npm run standard -- price` | Pay for an indicative price with standard x402 settlement. |
| `npm run standard -- quote` | Pay for a firm quote with standard x402 settlement. |
| `npm run batch -- price` | Make sequential price requests using a deposit and cumulative signed vouchers. |
| `npm run batch -- quote` | Make sequential quote requests using a deposit and cumulative signed vouchers. |
| `npm run standard -- swap` | Pay for price and quote separately, approve USDC if needed, and execute one Base USDC → WETH swap. |
| `npm run batch -- swap` | Pay for price and quote through batch settlement, approve USDC if needed, and execute one Base USDC → WETH swap. |
| `npm run batch -- price --refund` | Request a cooperative refund using the price endpoint. Use `quote --refund` for the quote endpoint. |

Omitting `price` or `quote` defaults to `price`: `npm run standard`, `npm run batch`, and `npm run batch -- --refund` still work. Use `--` to pass arguments through npm.

The `price` and `quote` commands pay for API access and print the result. The explicit `swap` command also submits an approval when necessary and executes a real swap.

## Setup

Requires Node.js 22 or later and npm.

```sh
cd x402-headless-example
npm ci
cp .env.example .env
```

Set `PRIVATE_KEY` in `.env` to a dedicated test wallet's private key. The provided configuration calls the **real 0x testnet payment URL** and needs Base Sepolia test USDC. You can obtain test USDC from the [Circle faucet](https://faucet.circle.com/).

The sample asks for a price for 1 USDC → WETH on Base. The query's `chainId=8453` selects the **swap network**; `CHAIN_ID=84532` selects the **payment network**. Testnet payment does not turn the underlying swap into a testnet swap.

Check `PAY_TO` against the recipient published by 0x before paying. Each paid API request must match the configured chain, USDC asset, recipient, and resource URL, with a positive price within `MAX_PAYMENT_AMOUNT`.

Amounts in `.env` use USDC base units (6 decimals): `MAX_PAYMENT_AMOUNT=10000` caps each request at 0.01 USDC, and `MAX_DEPOSIT_AMOUNT=2000000` caps each batch deposit or top-up at 2 USDC. `RPC_URL` is optional and defaults to the selected payment chain's public RPC.

## Supported payment chains

The TypeScript scripts in this directory support **USDC payments on Base and Base Sepolia** for both standard payments and batch settlement.

| Payment network | `.env` `CHAIN_ID` | x402 network ID | URL channel | Asset |
| --- | --- | --- | --- | --- |
| Base Sepolia (default, testnet) | `84532` | `eip155:84532` | `/v1/x402-testnet/` | Test USDC |
| Base (mainnet) | `8453` | `eip155:8453` | `/v1/x402/` | USDC |

The swap query's `chainId` is independent of payment-chain support. The standalone `price` and `quote` commands can request supported EVM swap networks. The new `swap` command is intentionally restricted to USDC → WETH on **Base mainnet** (`chainId=8453`), using the wallet configured by `PRIVATE_KEY` for both payment and execution.

## Standard payments

```sh
npm run standard -- price
npm run standard -- quote
```

[`src/standard.ts`](src/standard.ts) registers only the `exact` EVM scheme. The policy in [`src/client.ts`](src/client.ts) selects the USDC EIP-3009 option. AgentPay submits and pays gas for the payment transaction; the client signs an authorization.

AgentPay settles standard payments before running the backend. A backend error can therefore still mean payment succeeded. The script prints any `PAYMENT-RESPONSE` receipt before reporting an HTTP error. Review that receipt before retrying.

## Batch settlement

```sh
npm run batch -- price
npm run batch -- quote
```

[`src/batch.ts`](src/batch.ts) registers only `batch-settlement`. The SDK handles channel recovery, deposit authorization, voucher signatures, receipt reconciliation, and corrective 402 responses. The script never falls back to standard payments if batch is unavailable.

The SDK uses the advertised `extra.minDeposit` hint when present, otherwise a deposit sized for five requests. `MAX_DEPOSIT_AMOUNT` caps each initial deposit or top-up independently of the per-request cap. On a fresh channel with a 0.01 USDC price and 0.10 USDC deposit hint, three successful requests deposit 0.10, consume 0.03, and leave 0.07 available. Prices and hints can change; receipts determine the actual charges.

`REQUEST_COUNT` defaults to 3 and is limited to 100. Calls run sequentially with the same client so each voucher incorporates the previous receipt. Do not run multiple copies against the same wallet/channel concurrently. Channel state is stored in the ignored `.channels/` directory; keep it across runs.

AgentPay records batch charges after successful backend responses and settles outstanding vouchers periodically. Voucher receipts need not contain an onchain transaction hash. Deposits do. Unused funds remain in escrow until spent or refunded.

```sh
# Use the same endpoint, payer, network, and channel state.
npm run batch -- price --refund
# For the quote endpoint:
npm run batch -- quote --refund
```

The refund command uses the SDK's cooperative refund flow. Consult the [batch settlement documentation](https://agentpay.alchemy.com/docs/batch-settlement) for withdrawal timing and preview availability. The deposit cap applies per deposit, not to total spend across runs or repeated top-ups.

## Full price → approve → quote → swap flow

```sh
# Choose one payment mode per swap:
npm run standard -- swap
# Or:
npm run batch -- swap
```

**Each command executes one real Base mainnet swap.** `REQUEST_COUNT` does not repeat swaps. Base Sepolia test USDC only pays for testnet API access; it cannot fund the underlying Base swap.

[`src/swap.ts`](src/swap.ts) performs the same execution sequence for both payment modes:

1. Validate the 0x endpoint, Base USDC/WETH pair, sell amount, and taker. The taker must match `PRIVATE_KEY`'s address.
2. Confirm the swap RPC connects to Base mainnet, with sufficient Base USDC and ETH.
3. Fetch a paid price including `taker` and check liquidity, balances, and slippage.
4. Read the current onchain allowance. If insufficient, approve exactly `sellAmount` to the API's validated AllowanceHolder spender and wait for confirmation. Never approve Settler.
5. Fetch a fresh paid quote, validate its transaction and unresolved issues, and require its minimum output to be at least the indicative price's minimum output.
6. Recheck balance and allowance, estimate execution gas, and submit the quoted transaction. The example stops if the quote is more than 30 seconds old before submission.
7. Wait for confirmation and print the approval hash (if any), swap hash, and quoted minimum output. The minimum is a guarantee enforced by the trade, not a measurement of the actual received amount.

### Swap configuration and funding

Keep the sample `AGENTPAY_URL` and its swap parameters to sell 1 Base USDC for WETH, or reduce `sellAmount` in its query. Add the new settings from `.env.example` to your existing `.env`; do not overwrite your private key file.

| Setting | Default | Purpose |
| --- | --- | --- |
| `SWAP_RPC_URL` | Base public RPC | Swap execution RPC, separate from the payment `RPC_URL`. |
| `MAX_SELL_AMOUNT` | `1000000` | Maximum sell amount in USDC base units (1 USDC). |
| `SLIPPAGE_BPS` | `100` | 1% slippage; values from 0 to 500 accepted. This overrides any URL `slippageBps`. |
| `MAX_GAS_COST_WEI` | `1000000000000000` | Maximum `gas × maxFeePerGas` per approval or swap (0.001 ETH). |

For full swaps, the URL accepts only `chainId`, `sellToken`, `buyToken`, `sellAmount`, `taker`, and `slippageBps`; the scripts add the payer as taker for both requests. Custom recipients, integrator fees, and other swap parameters are outside this example's execution scope. Standalone price and quote commands retain their existing behavior.

The preflight deliberately reserves the configured maximum API funding amount, rather than assuming an advertised price or deposit size:

| Payment mode | Required Base USDC before starting |
| --- | --- |
| Standard | `sellAmount + 2 × MAX_PAYMENT_AMOUNT` (1.02 USDC with the defaults). |
| Batch | `sellAmount + MAX_DEPOSIT_AMOUNT` (3 USDC with the defaults). |

This reserve is conservative, including when API payments use testnet funds or the batch channel already has credit. Actual charges/deposits may be lower. Both modes reserve up to `2 × MAX_PAYMENT_AMOUNT` across signed API authorizations. Corrective retries also consume this authorization budget, so they may cause the workflow to stop. Batch additionally limits the combined deposits/top-ups across both requests to `MAX_DEPOSIT_AMOUNT` for the invocation. Existing standalone batch commands keep their per-deposit cap.

The wallet must also have Base ETH covering `2 × MAX_GAS_COST_WEI` (0.002 ETH with defaults), conservatively allowing one approval and one swap. The submitted gas limit uses an estimated-gas buffer of 20%; transactions exceeding the per-transaction cost cap are rejected. These are maximum funding requirements, not expected fees.

For batch swaps, one scheme and `.channels/` store are reused across price and quote. The SDK can reuse a compatible channel or establish a separate channel if its configuration differs. Logs show `deposit`/`voucher` and channel IDs so this behavior is visible. Cross-endpoint channel sharing has only been tested locally with mocked server accounting; live price-to-quote reuse is not yet verified. Unused escrow remains available; refunds are explicit using the existing price/quote refund commands.

### Failures and retries

The scripts stop on failed API payments, failed approvals, unresolved quote issues, exceeded limits, stale quotes, or reverted swaps. An approval can remain set if a later step fails; a paid API request or batch deposit may also have completed. Transaction submission is not automatically retried. If submission or confirmation times out, inspect the printed transaction hash and wallet activity before running another swap. A transport error may occur after broadcast even if no hash was returned to the script.

The `swap` command itself requests execution; it does not prompt between steps. Mainnet execution should be tested with an agreed small amount and configured limits. No merchant purchase or cross-chain funding is included.

## Price and quote URLs

| Resource | Testnet payment URL (Base Sepolia) | Production payment URL (Base) |
| --- | --- | --- |
| Indicative price | `https://agent.api.0x.org/v1/x402-testnet/swap-allowance-holder-price` | `https://agent.api.0x.org/v1/x402/swap-allowance-holder-price` |
| Firm quote | `https://agent.api.0x.org/v1/x402-testnet/swap-allowance-holder-quote` | `https://agent.api.0x.org/v1/x402/swap-allowance-holder-quote` |

Set `AGENTPAY_URL` in `.env` to a full price or quote URL including `chainId`, `sellToken`, `buyToken`, and `sellAmount`. The command selects the price or quote route automatically, preserving the payment channel and swap parameters. You do not need to edit the URL to switch resources.

For quotes, the script adds the `taker` address that would execute the swap. It uses `TAKER` from `.env` if set, otherwise an existing `taker` query parameter, otherwise the payment wallet's address. The API payment wallet and swap taker can differ. The taker needs the appropriate swap-chain balances and allowances to execute the returned transaction; the scripts only print it.

For example, keep the sample `AGENTPAY_URL` and optionally add `TAKER=0xYourSwapWalletAddress` to `.env`, replacing the placeholder with a valid address. Then use `npm run standard -- quote` or `npm run batch -- quote`.

The payment policy checks the final selected URL, including any added taker, against the resource URL in the payment challenge before signing.

## Testing

### 1. Run local checks

```sh
npm run typecheck
npm test
```

Tests use real SDK signing with a public dummy private key, mocked HTTP responses, and mocked onchain channel reads. They verify command parsing, resource selection, quote taker handling, binding payments to the selected URL, standard 402 negotiation, payment policy rejection, capped batch deposits followed by cumulative vouchers, and refusal to fall back from batch to exact. They do not send transactions or require your private key or funds. These local checks do not verify live settlement.

Full-flow tests mock wallet/RPC submission and cover approval-required/skipped paths, payment/deposit reserves, failed approvals and API requests, quote validation and freshness, gas limits, changed balances, and reverted swaps. A session test checks a deposit on the price URL followed by a cumulative voucher on the quote URL with the same channel ID. It simulates shared server accounting and does not establish that the deployed endpoints share it.

### 2. Run the examples on Base Sepolia

Follow the setup above, use `/x402-testnet/` in `AGENTPAY_URL`, set `CHAIN_ID=84532`, and fund the configured payer with Base Sepolia test USDC. Run the TypeScript examples directly to verify their integration with the endpoint:

```sh
npm run standard -- price
npm run batch -- price
npm run batch -- price --refund

# Test the quote resource using the same swap parameters:
npm run standard -- quote
npm run batch -- quote
npm run batch -- quote --refund
```

For the standard request, check that the API returns a price or quote and prints a successful settlement receipt.

For batch requests on a fresh channel, confirm the first receipt includes a deposit transaction and later requests use vouchers without a new deposit transaction while the channel has enough balance. A 0.10 test USDC deposit covers the default three requests at 0.01 each. Then check that the refund command succeeds for the unused balance.

For refunds, select the same resource used for the batch requests. Run from the same directory with the same `.env` configuration and `.channels/` files so the SDK can reuse the channel's local state. Each batch command makes `REQUEST_COUNT` paid requests; testing both resources makes two separate runs.

Example Base Sepolia transactions from these test runs:

| Action | Transaction |
| --- | --- |
| Standard payment | [View payment on BaseScan](https://sepolia.basescan.org/tx/0x0173b12f62c9527282774a6b61c925c92890ca200f19385cc9db0a134a4dd110) |
| Batch deposit — 0.10 test USDC | [View deposit on BaseScan](https://sepolia.basescan.org/tx/0x498e08c63460a16b59f5fb60eb6db6c750e05b2ce9f87ad3b9710543990428be) |
| Batch refund — 0.07 test USDC | [View refund on BaseScan](https://sepolia.basescan.org/tx/0x53a0068068b1f547f58eb4ee7e9af0e3ddd4c41af3dba6b12ca411f5125bdb5a) |

The second and third batch requests used offchain vouchers, so their receipts have no per-request transaction hash.

### 3. Test production payments

After the testnet runs succeed, replace `/x402-testnet/` with `/x402/` in `AGENTPAY_URL`, set `CHAIN_ID=8453`, verify `PAY_TO`, and fund the payer with Base USDC. Run the same commands to check mainnet behavior. Production runs spend real USDC; `MAX_PAYMENT_AMOUNT` caps each request and `MAX_DEPOSIT_AMOUNT` caps each batch deposit or top-up.

The example transactions above are from Base Sepolia. Mainnet API payments, approvals, and full swap execution have not been verified in these test runs. The new swap command has only been validated with local tests so far.

## References

- [Alchemy AgentPay overview](https://agentpay.alchemy.com/docs)
- [Standard x402 payments](https://agentpay.alchemy.com/docs/x402)
- [x402 testnet](https://agentpay.alchemy.com/docs/x402-testnet)
- [Batch settlement preview](https://agentpay.alchemy.com/docs/batch-settlement)
- [x402 SDK batch client documentation](https://github.com/x402-foundation/x402/blob/main/docs/schemes/batch-settlement.mdx)

The x402 packages are pinned to 2.30.0, which publishes the batch client and file storage exports used here. For MPP payments on Tempo, see the [MPP example](../mpp-headless-example).
