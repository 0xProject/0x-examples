# Swap v2 Permit2 headless example (viem)

A headless example of how to use 0x Swap API v2 `/permit2/price` and `/permit2/quote` using [viem](https://viem.sh/). 
See the [Get started with Swap API guide](https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api) to learn how to use it.

This example demonstrates the following on Scroll mainnet:

0. [Get a 0x API key](https://0x.org/docs/introduction/getting-started)
1. Get an indicative price (sell 0.0001 ETH → buy ETH)
2. (If needed) Set token allowance for Permit2
3. Fetch a firm quote (sell 0.0001 ETH → buy USDC)
4. Sign the Permit2 EIP-712 message
5. Append signature length and signature data to calldata
6. Submit the transaction with permit2 signature



### What is the difference between Permit2 and AllowanceHolder?

<details>
<summary>What is the difference between using Permit2 and AllowanceHolder for Swap API?</summary>

0x Swap API allows you to choose between two allowance methods: [Permit2](https://0x.org/docs/introduction/0x-cheat-sheet#permit2-contractcontract) or [AllowanceHolder]([../introduction/0x-cheat-sheet#allowanceholder-contract](https://0x.org/docs/introduction/0x-cheat-sheet#allowanceholder-contract)).

The decision when choosing between Permit2 or AllowanceHolder boils down to mainly UX and integration type.

**When to Use Permit2**

For most applications, we recommend using Permit2. This method requires two user signatures per trade:

-   A signature for limited approval
-   A signature for the trade itself

Permit2 is also recommended for setups involving multisig or smart contract wallets, as long as the smart contract supports [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271), which most do.

Additionally, Permit2 is a standard that allows users to share token approvals across smart contracts. If a user has an infinite allowance set on Permite2 via another app, they don't need to reset the allowance.

**When to Use AllowanceHolder**

We recommend using Permit2 for most situations. However, if your integration doesn't support a double-signature flow, such as with smart contracts that aren't compatible with [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271), AllowanceHolder is a better choice. It works best for single-signature use cases, including:

-   Projects integrating the Swap API into smart contracts without EIP-1271 support.
-   Teams aggregating across multiple sources and aiming for a consistent user experience across all integrations.

If you're concerned about upgrade speed, consider using AllowanceHolder, as it closely resembles the 0x Swap v1 integration. This approach can help streamline the upgrade process for teams that previously used Swap v1.

**Key Points:**

-   **Permit2:** Ideal for for most applications. Involves two signatures, one signature for limited approval and one signature for the trade itself. Also recommended for multisig or smart contract wallets.
-   **AllowanceHolder:** Best for single-signature use cases, especially in smart contracts that don't support [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) or meta-aggregators.

For more details, check out the [Permit2 and AllowanceHolder contracts](https://0x.org/docs/introduction/0x-cheat-sheet#permit2-contract)

Still have questions? [Reachout to our team](https://0x.org/docs/introduction/community#contact-support).


</details>

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

#### Requirements

- Install [Bun](https://bun.sh/) (v1.1.0+)
- An Ethereum private key
- Setup a wallet with min 0.1 USDC and some ETH for gas

## Usage

1. Create an `.env` file and setup the required environment variables (your Etheruem private keys & 0x API key).

```sh
cp .env.example .env
```

2. Install dependencies

```sh
bun install
```

3. Run the script with either

```sh
# Run the script once
bun run index.ts
```

or

```sh
# Run the script in watch mode. Code automatically recompiles and re-executes upon changes.
bun --watch index.ts

```

4. Here is an example of the output. It fetches a `price` (sell 0.1 USCD → WETH), approves token allowance (if not already granted), fetches a `quote`, and submits the transaction, and shows the transaction hash:

```
➜  swap-v2-headless-example git:(jlin/add-eth-support-to-headless-example) ✗ bun run index.ts
Fetching price to swap 0.0001 ETH for USDC
https://api.0x.org/swap/permit2/price?chainId=534352&sellToken=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&buyToken=0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4&sellAmount=100000000000000&taker=0x4D2A422dB44144996E855ce15FB581a477dbB947
priceResponse:  {
  blockNumber: "10266584",
  buyAmount: "258030",
  buyToken: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "388",
      token: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
      type: "volume",
    },
    gasFee: null,
  },
  gas: "267649",
  gasPrice: "131752701",
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "255450",
  route: {
    fills: [
      {
        from: "0x5300000000000000000000000000000000000004",
        to: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
        source: "Metavault_V2",
        proportionBps: "10000",
      }
    ],
    tokens: [
      {
        address: "0x5300000000000000000000000000000000000004",
        symbol: "WETH",
      }, {
        address: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
        symbol: "USDC",
      }
    ],
  },
  sellAmount: "100000000000000",
  sellToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  tokenMetadata: {
    buyToken: {
      buyTaxBps: "0",
      sellTaxBps: "0",
    },
    sellToken: {
      buyTaxBps: "0",
      sellTaxBps: "0",
    },
  },
  totalNetworkFee: "43583426628363",
  zid: "0xfa830aee6d84ea29a558fab5",
}
Native token detected, no need for allowance check
Fetching quote to swap 0.0001 ETH for USDC
quoteResponse:  {
  blockNumber: "10266585",
  buyAmount: "258030",
  buyToken: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "388",
      token: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
      type: "volume",
    },
    gasFee: null,
  },
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "255450",
  permit2: null,
  route: {
    fills: [
      {
        from: "0x5300000000000000000000000000000000000004",
        to: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
        source: "Metavault_V2",
        proportionBps: "10000",
      }
    ],
    tokens: [
      {
        address: "0x5300000000000000000000000000000000000004",
        symbol: "WETH",
      }, {
        address: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
        symbol: "USDC",
      }
    ],
  },
  sellAmount: "100000000000000",
  sellToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  tokenMetadata: {
    buyToken: {
      buyTaxBps: "0",
      sellTaxBps: "0",
    },
    sellToken: {
      buyTaxBps: "0",
      sellTaxBps: "0",
    },
  },
  totalNetworkFee: "41016151070462",
  transaction: {
    to: "0x6c403dba21f072e16b7de2b013f8adeae9c2e76e",
    data: "0x1fff991f0000000000000000000000004d2a422db44144996e855ce15fb581a477dbb94700000000000000000000000006efdbff2a14a7c8e15944d1f4a48f9f95f663a4000000000000000000000000000000000000000000000000000000000003e5da00000000000000000000000000000000000000000000000000000000000000a079d6ebef652d6bf467ba244500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000000000000000010438c9c147000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000027100000000000000000000000005300000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000024d0e30db00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c4103b48be0000000000000000000000006c403dba21f072e16b7de2b013f8adeae9c2e76e00000000000000000000000053000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000002710000000000000000000000000135fd47054677f53395e2e483df7cd4f8cf5e0b00000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012438c9c14700000000000000000000000006efdbff2a14a7c8e15944d1f4a48f9f95f663a4000000000000000000000000000000000000000000000000000000000000000f00000000000000000000000006efdbff2a14a7c8e15944d1f4a48f9f95f663a4000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000ad01c20d5886137e056775af56915de824c8fce500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    gas: "267649",
    gasPrice: "122160752",
    value: "100000000000000",
  },
  zid: "0x79d6ebef652d6bf467ba2445",
}
Transaction hash: 0xbb7dd48cd2256ced6bb87a37876a706652b12cd267b20072632fab76617ea78b
See tx details at https://scrollscan.com/tx/0xbb7dd48cd2256ced6bb87a37876a706652b12cd267b20072632fab76617ea78b

```

## Supported Networks

See [here](https://0x.org/docs/introduction/0x-cheat-sheet#-chain-support) for the latest list of supported networks.
