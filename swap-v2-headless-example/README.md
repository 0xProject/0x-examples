# Swap v2 Permit2 headless example (viem)

A headless example of how to use 0x Swap API v2 `/permit2/price` and `/permit2/quote` using [viem](https://viem.sh/). 
See the [Get started with Swap API guide](https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api) to learn how to use it.

This example demonstrates the following on Base mainnet:

0. [Get a 0x API key](https://0x.org/docs/introduction/getting-started)
1. Get an indicative price (sell 0.1 USDC → buy WETH)
2. (If needed) Set token allowance for Permit2
3. Fetch a firm quote (sell 0.1 USDC → buy WETH)
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
Fetching price to swap 0.1 USDC for WETH
https://api.0x.org/swap/permit2/price?chainId=8453&sellToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&buyToken=0x4200000000000000000000000000000000000006&sellAmount=100000
priceResponse:  {
  blockNumber: "16891368",
  buyAmount: "32749774604489",
  buyToken: "0x4200000000000000000000000000000000000006",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "150",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "volume",
    },
    gasFee: null,
  },
  gas: "183866",
  gasPrice: "2500000",
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "32422276858444",
  route: {
    fills: [
      {
        from: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        to: "0x4200000000000000000000000000000000000006",
        source: "BaseSwap",
        proportionBps: "10000",
      }
    ],
    tokens: [
      {
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        symbol: "USDC",
      }, {
        address: "0x4200000000000000000000000000000000000006",
        symbol: "WETH",
      }
    ],
  },
  sellAmount: "99850",
  sellToken: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  totalNetworkFee: "490472989917",
}
USDC already approved for Permit2
Fetching quote to swap 0.1 USDC for WETH
quoteResponse:  {
  blockNumber: "16891369",
  buyAmount: "32749774604489",
  buyToken: "0x4200000000000000000000000000000000000006",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "150",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
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
  minBuyAmount: "32422276858444",
  permit2: {
    type: "Permit2",
    hash: "0xd5a381b2d7270d8f8693441a3ca33f06480eb7a05117b0117c53fc518942f6b9",
    eip712: {
      types: {
        PermitTransferFrom: [
          {
            name: "permitted",
            type: "TokenPermissions",
          }, {
            name: "spender",
            type: "address",
          }, {
            name: "nonce",
            type: "uint256",
          }, {
            name: "deadline",
            type: "uint256",
          }
        ],
        EIP712Domain: [
          {
            name: "name",
            type: "string",
          }, {
            name: "chainId",
            type: "uint256",
          }, {
            name: "verifyingContract",
            type: "address",
          }
        ],
        TokenPermissions: [
          {
            name: "token",
            type: "address",
          }, {
            name: "amount",
            type: "uint256",
          }
        ],
      },
      domain: {
        name: "Permit2",
        chainId: 8453,
        verifyingContract: "0x000000000022d473030f116ddee9f6b43ac78ba3",
      },
      message: {
        permitted: {
          token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          amount: "100000",
        },
        spender: "0x55873e4b1dd63ab3fea3ca47c10277655ac2dce0",
        nonce: "2241959297937691820908574931991586",
        deadline: "1720572385",
      },
      primaryType: "PermitTransferFrom",
    },
  },
  route: {
    fills: [
      {
        from: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        to: "0x4200000000000000000000000000000000000006",
        source: "BaseSwap",
        proportionBps: "10000",
      }
    ],
    tokens: [
      {
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        symbol: "USDC",
      }, {
        address: "0x4200000000000000000000000000000000000006",
        symbol: "WETH",
      }
    ],
  },
  sellAmount: "99850",
  sellToken: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  totalNetworkFee: "490472989917",
  transaction: {
    to: "0x55873e4b1dd63ab3fea3ca47c10277655ac2dce0",
    data: "0x1fff991f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a09984987dddf5ad699c63dbe500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000144c1fb425e00000000000000000000000055873e4b1dd63ab3fea3ca47c10277655ac2dce0000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000186a00000000000000000000000000000000000006e898131631616b1779bad70bc2200000000000000000000000000000000000000000000000000000000668dd9e100000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000041ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012438c9c147000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000000f000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000ad01c20d5886137e056775af56915de824c8fce50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c4103b48be0000000000000000000000004d2a422db44144996e855ce15fb581a477dbb947000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000000002710000000000000000000000000ab067c01c7f5734da168c699ae9d23a4512c9fdb000000000000000000000000000000000000000000000000000000000000190000000000000000000000000000000000000000000000000000001d7ce64b824c00000000000000000000000000000000000000000000000000000000",
    gas: "183866",
    gasPrice: "2500000",
    value: "0",
  },
}
Signed permit2 message from quote response
Transaction hash: 0xcb9ec3b8ef7002f9fa232fa23f16a0ba365a1c1d48580f420977a1b20c86ab78
See tx details at https://basescan.org/tx/0xcb9ec3b8ef7002f9fa232fa23f16a0ba365a1c1d48580f420977a1b20c86ab78
```

## Supported Networks

See [here](https://0x.org/docs/introduction/0x-cheat-sheet#-chain-support) for the latest list of supported networks.
