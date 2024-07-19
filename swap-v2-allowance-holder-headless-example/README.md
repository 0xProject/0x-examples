# Swap v2 AllowanceHolder headless example (viem)

A headless example of how to use 0x Swap API v2 `/allowance-holder/price` and `/allowance-holder/quote` using [viem](https://viem.sh/)

Demonstrates the following on Base mainnet:

1. [Get a 0x API key](https://0x.org/docs/introduction/getting-started)
2. Get an indicative price (sell 0.1 USDC → buy WETH)
3. (If needed) Set token allowance for AllowanceHolder
4. Fetch a firm quote (sell 0.1 USDC → buy WETH)
5. Send transaction.

### What is the difference between Permit2 and AllowanceHolder?

<details>

<summary>Read more about when to use AllowanceHolder vs Permit2</summary>

0x Swap API offers you the optionality to either use [Permit2](https://0x.org/docs/next/introduction/0x-cheat-sheet#permit2-contract) or [AllowanceHolder](https://0x.org/docs/next/introduction/0x-cheat-sheet#allowanceholder-contract) as the allowance target.

For most applications, we recommend using the Permit2 flow for swaps and setting allowances on the Permit2 contract. This process requires two user signatures per trade: an offchain signature for limited approval and an onchain signature for the trade. If your integration doesn't support collecting offchain signatures, such as with smart contracts, we recommend using AllowanceHolder.

AllowanceHolder is an alternative to Permit2 as the allowance target. While Permit2's single-use method provides enhanced security, some projects may prefer not to use a double-signature UX. This applies to teams integrating Swap API into smart contracts or aggregating across multiple sources and wanting consistent UI.

Still have questions? [Reachout to our team](https://0x.org/docs/introduction/community#contact-support).

</details>
<br></br>

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

### Requirements

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
https://api.0x.org/swap/allowance-holder/price?chainId=8453&sellToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&buyToken=0x4200000000000000000000000000000000000006&sellAmount=100000
priceResponse:  {
  blockNumber: "17272561",
  buyAmount: "29247834891471",
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
  gas: "204097",
  gasPrice: "5890000",
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "28955356542556",
  route: {
    fills: [
      {
        from: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        to: "0x4200000000000000000000000000000000000006",
        source: "PancakeSwap_V2",
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
  totalNetworkFee: "1301007038488",
  zid: "0x124830c89e8c7cb87cf4d17d",
}
Approving AllowanceHolder to spend USDC... {
  abi: [
    {
      type: "function",
      name: "approve",
      stateMutability: "nonpayable",
      inputs: [
        {
          name: "spender",
          type: "address",
        }, {
          name: "amount",
          type: "uint256",
        }
      ],
      outputs: [
        {
          type: "bool",
        }
      ],
    }
  ],
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  args: [ "0x0000000000001ff3684f28c67538d4d072c22734", 115792089237316195423570985008687907853269984665640564039457584007913129639935n ],
  dataSuffix: undefined,
  functionName: "approve",
  account: {
    address: "0x4D2A422dB44144996E855ce15FB581a477dbB947",
    nonceManager: undefined,
    signMessage: [Function: signMessage],
    signTransaction: [Function: signTransaction],
    signTypedData: [Function: signTypedData],
    source: "privateKey",
    type: "local",
    publicKey: "0x043f19b73e60ad76e64038a21eae3c5f2314af790f8a2daa30f33171824dd4d80eac8bd123a95143a88d5ab8c66d3fedc30239335a48be5f7f457ce179bd031906",
  },
}
Approved AllowanceHolder to spend USDC. {
  blockHash: "0x790609ab79df05d68572e89b9f97c2c8b174ce2d7baa5c4b39585ea081a73ad1",
  blockNumber: 17272564n,
  contractAddress: null,
  cumulativeGasUsed: 6166642n,
  effectiveGasPrice: 6882812n,
  from: "0x4d2a422db44144996e855ce15fb581a477dbb947",
  gasUsed: 55713n,
  l1BaseFeeScalar: "0x8dd",
  l1BlobBaseFee: "0x1",
  l1BlobBaseFeeScalar: "0x101c12",
  l1Fee: 31390503531n,
  l1GasPrice: 8646568815n,
  l1GasUsed: 1600n,
  logs: [
    {
      address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      topics: [ "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
        "0x0000000000000000000000004d2a422db44144996e855ce15fb581a477dbb947", "0x0000000000000000000000000000000000001ff3684f28c67538d4d072c22734"
      ],
      data: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      blockNumber: 17272564n,
      transactionHash: "0xec4b662a11ff2f40fc1615851969007b81cd8618ae1a8f229400517b0ce3b9bb",
      transactionIndex: 42,
      blockHash: "0x790609ab79df05d68572e89b9f97c2c8b174ce2d7baa5c4b39585ea081a73ad1",
      logIndex: 104,
      removed: false,
    }
  ],
  logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000200000000000000000000000000000000000000000000020080000000000000000000000800000000000400000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000008000000008000008000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000",
  status: "success",
  to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  transactionHash: "0xec4b662a11ff2f40fc1615851969007b81cd8618ae1a8f229400517b0ce3b9bb",
  transactionIndex: 42,
  type: "eip1559",
  l1FeeScalar: null,
}
Fetching quote to swap 0.1 USDC for WETH
quoteResponse:  {
  blockNumber: "17272561",
  buyAmount: "29247834891471",
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
    allowance: {
      actual: "0",
      spender: "0x0000000000001ff3684f28c67538d4d072c22734",
    },
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "28955356542556",
  route: {
    fills: [
      {
        from: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        to: "0x4200000000000000000000000000000000000006",
        source: "PancakeSwap_V2",
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
  totalNetworkFee: "1206311137665",
  transaction: {
    to: "0x0000000000001ff3684f28c67538d4d072c22734",
    data: "0x2213bc0b00000000000000000000000055873e4b1dd63ab3fea3ca47c10277655ac2dce0000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000186a000000000000000000000000055873e4b1dd63ab3fea3ca47c10277655ac2dce000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000004a41fff991f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0f7e73edf1d056127cce9e6e8000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000002e000000000000000000000000000000000000000000000000000000000000000e4c1fb425e00000000000000000000000055873e4b1dd63ab3fea3ca47c10277655ac2dce0000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000066997bf400000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012438c9c147000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000000f000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000ad01c20d5886137e056775af56915de824c8fce50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c4103b48be0000000000000000000000004d2a422db44144996e855ce15fb581a477dbb947000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000271000000000000000000000000079474223aedd0339780bacce75abda0be84dcbf9000000000000000000000000000000000000000000000000000000000000190000000000000000000000000000000000000000000000000000001a55b1bdb65c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    gas: "188297",
    gasPrice: "5890000",
    value: "0",
  },
  zid: "0xf7e73edf1d056127cce9e6e8",
}
Tx hash:  0x1bd956b246b1faf5a1cc1b3bf629be424e1bacdf803a69744c744e9e07f70463
See tx details at https://basescan.org/tx/0x1bd956b246b1faf5a1cc1b3bf629be424e1bacdf803a69744c744e9e07f70463
```
