# Swap v2 Permit2 headless example (viem)

A headless example of how to use 0x Swap API v2 `/permit2/price` and `/permit2/quote` using [viem](https://viem.sh/). 
See the [Get started with Swap API guide](https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api) to learn how to use it.

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

## Features
This example demonstrates how to perform token swaps on Base mainnet, specifically swapping both ETH (native token) and WETH (ERC-20 token) to USDC.

0. [Get a 0x API key](https://0x.org/docs/introduction/getting-started)
1. Get an indicative price
   - swap 0.0001 ETH → USDC
   - swap 0.0001 WETH → USDC
2. (If needed) Set token allowance for Permit2
3. Fetch a firm quote
   - swap 0.0001 ETH → USDC
   - swap 0.0001 WETH →  USDC
4. Sign the Permit2 EIP-712 message (for ERC-20 tokens)
5. Append signature length and signature data to calldata
6. Submit both native (ETH) and ERC-20 (WETH) token swaps

## How It Works

The script performs two sequential swaps:

1. ETH → USDC Swap:
   - Fetches price quote for 0.0001 ETH
   - Handles native token transaction specifics
   - Submits transaction with proper value field

2. WETH → USDC Swap:
   - Fetches price quote for 0.0001 WETH
   - Checks and sets Permit2 allowance if needed
   - Signs Permit2 message
   - Submits transaction with signature

Note: There's a 15-second delay between swaps to allow for block confirmation from the same wallet between transactions

### What is the difference between Permit2 and AllowanceHolder?

<details>
<summary>Expand to read about the difference between using Permit2 and AllowanceHolder for Swap API.</summary>

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

Still have questions? [Reach out to our team](https://0x.org/docs/introduction/community#contact-support).


</details>



## Requirements

- Install [Bun](https://bun.sh/) (v1.1.0+)
- An Ethereum private key
- Setup a wallet with min 0.1 USDC and some ETH for gas
- A wallet with min 0.0001 ETH and WETH for swaps. Some additional ETH for gas fees.


## Usage

1. Create a `.env` file and setup the required environment variables (your Ethereum private keys, 0x API key, HTTP transport URL).

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

4. Here is an example of the output. It fetches a `price`, approves token allowance (if not already granted), fetches a `quote`, and submits the transaction, and shows the transaction hash:

```
➜  swap-v2-headless-example git:(main) ✗ bun run index.ts
Executing ETH to USDC swap...
Fetching price to swap 0.0001 ETH for USDC
https://api.0x.org/swap/permit2/price?chainId=8453&sellToken=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&buyToken=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&sellAmount=100000000000000&taker=0x4D2A422dB44144996E855ce15FB581a477dbB947
priceResponse:  {
  blockNumber: "25966971",
  buyAmount: "271195",
  buyToken: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "407",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "volume",
    },
    gasFee: null,
  },
  gas: "276281",
  gasPrice: "5402191",
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "268488",
  route: {
    fills: [
      {
        from: "0x4200000000000000000000000000000000000006",
        to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        source: "0x_RFQ",
        proportionBps: "10000",
      }
    ],
    tokens: [
      {
        address: "0x4200000000000000000000000000000000000006",
        symbol: "WETH",
      }, {
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
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
  totalNetworkFee: "2750629941787",
  zid: "0xde6282442e6b58bf05bed170",
}
Native token detected, no need for allowance check
Fetching quote to swap 0.0001 ETH for USDC
quoteResponse:  {
  blockNumber: "25966971",
  buyAmount: "271316",
  buyToken: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "408",
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
  minBuyAmount: "268596",
  permit2: null,
  route: {
    fills: [
      {
        from: "0x4200000000000000000000000000000000000006",
        to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        source: "Uniswap_V4",
        proportionBps: "10000",
      }
    ],
    tokens: [
      {
        address: "0x4200000000000000000000000000000000000006",
        symbol: "WETH",
      }, {
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
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
  totalNetworkFee: "2324700742147",
  transaction: {
    to: "0x6a57a0579e91a5b7ce9c2d08b93e1a9b995f974f",
    data: "0x1fff991f0000000000000000000000004d2a422db44144996e855ce15fb581a477dbb947000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000004193400000000000000000000000000000000000000000000000000000000000000a02c9b5012e6a197f668396e2800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000004a0000000000000000000000000000000000000000000000000000000000000010438c9c147000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000027100000000000000000000000004200000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000024d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010438c9c147000000000000000000000000420000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000027100000000000000000000000004200000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000242e1a7d4d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000164af72634f0000000000000000000000006a57a0579e91a5b7ce9c2d08b93e1a9b995f974f000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000271000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000ffffffffffffffc5000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034271001833589fcd6edb6e08f4c7c32d4f71b54bda029130001f400000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012438c9c147000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000000f000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000ad01c20d5886137e056775af56915de824c8fce500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    gas: "245663",
    gasPrice: "5399961",
    value: "100000000000000",
  },
  zid: "0x2c9b5012e6a197f668396e28",
}
Transaction hash: 0xdd1b4f36ece05daad58d8ea784442f3fabe68f5b62c406a55280b09870b67349
See tx details at https://basescan.org/tx/0xdd1b4f36ece05daad58d8ea784442f3fabe68f5b62c406a55280b09870b67349
Waiting before executing next swap...

Executing WETH to USDC swap...
Fetching price to swap 0.0001 WETH for USDC
https://api.0x.org/swap/permit2/price?chainId=8453&sellToken=0x4200000000000000000000000000000000000006&buyToken=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&sellAmount=100000000000000&taker=0x4D2A422dB44144996E855ce15FB581a477dbB947
priceResponse:  {
  blockNumber: "25966979",
  buyAmount: "271018",
  buyToken: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "407",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "volume",
    },
    gasFee: null,
  },
  gas: "289084",
  gasPrice: "5388574",
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "268299",
  route: {
    fills: [
      {
        from: "0x4200000000000000000000000000000000000006",
        to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        source: "0x_RFQ",
        proportionBps: "10000",
      }
    ],
    tokens: [
      {
        address: "0x4200000000000000000000000000000000000006",
        symbol: "WETH",
      }, {
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        symbol: "USDC",
      }
    ],
  },
  sellAmount: "100000000000000",
  sellToken: "0x4200000000000000000000000000000000000006",
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
  totalNetworkFee: "3098432017802",
  zid: "0x2af758d72403b7e6f704c827",
}
sellToken already approved for Permit2
Fetching quote to swap 0.0001 WETH for USDC
quoteResponse:  {
  blockNumber: "25966980",
  buyAmount: "271316",
  buyToken: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "408",
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
  minBuyAmount: "268596",
  permit2: {
    type: "Permit2",
    hash: "0xa0a1b4676826d055e3cfca8ce0ce4228fe269b786fdc928a9345e80c44d09202",
    eip712: {
      types: {
        TokenPermissions: [
          {
            name: "token",
            type: "address",
          }, {
            name: "amount",
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
      },
      domain: {
        name: "Permit2",
        chainId: 8453,
        verifyingContract: "0x000000000022d473030f116ddee9f6b43ac78ba3",
      },
      message: {
        permitted: {
          token: "0x4200000000000000000000000000000000000006",
          amount: "100000000000000",
        },
        spender: "0x6a57a0579e91a5b7ce9c2d08b93e1a9b995f974f",
        nonce: "2241959297937691820908574931991624",
        deadline: "1738723608",
      },
      primaryType: "PermitTransferFrom",
    },
  },
  route: {
    fills: [
      {
        from: "0x4200000000000000000000000000000000000006",
        to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        source: "Uniswap_V4",
        proportionBps: "10000",
      }
    ],
    tokens: [
      {
        address: "0x4200000000000000000000000000000000000006",
        symbol: "WETH",
      }, {
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        symbol: "USDC",
      }
    ],
  },
  sellAmount: "100000000000000",
  sellToken: "0x4200000000000000000000000000000000000006",
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
  totalNetworkFee: "2619627504443",
  transaction: {
    to: "0x6a57a0579e91a5b7ce9c2d08b93e1a9b995f974f",
    data: "0x1fff991f0000000000000000000000004d2a422db44144996e855ce15fb581a477dbb947000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000004193400000000000000000000000000000000000000000000000000000000000000a089cc724d2cb6df9e8dbd9f3c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000004c0000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000360000000000000000000000000000000000000000000000000000000000000010438c9c147000000000000000000000000420000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000027100000000000000000000000004200000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000242e1a7d4d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000164af72634f0000000000000000000000006a57a0579e91a5b7ce9c2d08b93e1a9b995f974f000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000271000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000ffffffffffffffc5000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034271001833589fcd6edb6e08f4c7c32d4f71b54bda029130001f400000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012438c9c147000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000000f000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000ad01c20d5886137e056775af56915de824c8fce500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffc1fb425e0000000000000000000000006a57a0579e91a5b7ce9c2d08b93e1a9b995f974f000000000000000000000000420000000000000000000000000000000000000600000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000006e898131631616b1779bad70bc480000000000000000000000000000000000000000000000000000000067a2d11800000000000000000000000000000000000000000000000000000000000000c0",
    gas: "258490",
    gasPrice: "5389998",
    value: "0",
  },
  zid: "0x89cc724d2cb6df9e8dbd9f3c",
}
Signed permit2 message from quote response
Transaction hash: 0x0ba0819897c95fb164d183c6d0e491d1404039aa02b3ebe67cc4c4d1dd34e243
See tx details at https://basescan.org/tx/0x0ba0819897c95fb164d183c6d0e491d1404039aa02b3ebe67cc4c4d1dd34e243

```

## Supported Networks

See [here](https://0x.org/docs/introduction/0x-cheat-sheet#-chain-support) for the latest list of supported networks.

## Developer Support
For questions about:

- 0x API: Check the [0x documentation](https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api)
- This example: Open an issue in the repository
