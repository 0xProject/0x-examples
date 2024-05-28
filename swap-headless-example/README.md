# Swap v1 headless example (viem)

A headless example of how to use 0x Swap [/price](https://0x.org/docs/0x-swap-api/api-references/get-swap-v1-price) and [/quote](https://0x.org/docs/0x-swap-api/api-references/get-swap-v1-quote) using [viem](https://viem.sh/)

Demonstrates the following on Polygon mainnet:

1. Build price params. Fetch price.
2. Check token approval
3. Build quote params. Fetch quote.
4. Send transaction.

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.


#### Requirements

- Install [Bun](https://bun.sh/) (v1.1.0+)
- An Ethereum private key

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

4. Here is an example of the output. It fetches a `price`, approves token allowance (if not already granted), fetches a `quote`, and submits the transaction, and shows the transaction hash: 

```bash
 priceResponse: {
  chainId: 137,
  price: "1.36371693611560431",
  grossPrice: "1.36574506754090255",
  estimatedPriceImpact: "0",
  value: "0",
  gasPrice: "30000010000",
  gas: "280000",
  estimatedGas: "280000",
  protocolFee: "0",
  minimumProtocolFee: "0",
  buyTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  buyAmount: "136371693611560431",
  grossBuyAmount: "136574506754090255",
  sellTokenAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  sellAmount: "100000",
  grossSellAmount: "100000",
  sources: [
    {
      name: "0x",
      proportion: "0",
    }, {
      name: "SushiSwap",
      proportion: "0",
    }, {
      name: "QuickSwap",
      proportion: "1",
    }, {
      name: "QuickSwap_V3",
      proportion: "0",
    }, {
      name: "Dfyn",
      proportion: "0",
    }, {
      name: "Curve",
      proportion: "0",
    }, {
      name: "DODO_V2",
      proportion: "0",
    }, {
      name: "DODO",
      proportion: "0",
    }, {
      name: "Curve_V2",
      proportion: "0",
    }, {
      name: "WaultSwap",
      proportion: "0",
    }, {
      name: "ApeSwap",
      proportion: "0",
    }, {
      name: "FirebirdOneSwap",
      proportion: "0",
    }, {
      name: "Balancer_V2",
      proportion: "0",
    }, {
      name: "KyberDMM",
      proportion: "0",
    }, {
      name: "IronSwap",
      proportion: "0",
    }, {
      name: "Aave_V2",
      proportion: "0",
    }, {
      name: "Uniswap_V3",
      proportion: "0",
    }, {
      name: "Synapse",
      proportion: "0",
    }, {
      name: "MeshSwap",
      proportion: "0",
    }, {
      name: "WOOFi",
      proportion: "0",
    }, {
      name: "Aave_V3",
      proportion: "0",
    }, {
      name: "KyberElastic",
      proportion: "0",
    }, {
      name: "Uniswap_V2",
      proportion: "0",
    }
  ],
  allowanceTarget: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  sellTokenToEthRate: "0.733762",
  buyTokenToEthRate: "1",
  fees: {
    zeroExFee: {
      feeType: "volume",
      feeToken: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      feeAmount: "202813142529824",
      billingType: "on-chain",
    },
  },
  auxiliaryChainData: {},
}
USDC already approved for 0x Exchange Proxy
quoteResponse:  {
  chainId: 137,
  price: "1.35425316616344121",
  grossPrice: "1.35626722298958073",
  estimatedPriceImpact: "0.4823",
  value: "0",
  gasPrice: "30000010000",
  gas: "298588",
  estimatedGas: "298588",
  protocolFee: "0",
  minimumProtocolFee: "0",
  buyTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  buyAmount: "135425316616344121",
  grossBuyAmount: "135626722298958073",
  sellTokenAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  sellAmount: "100000",
  grossSellAmount: "100000",
  sources: [
    {
      name: "0x",
      proportion: "1",
    }, {
      name: "SushiSwap",
      proportion: "0",
    }, {
      name: "QuickSwap",
      proportion: "0",
    }, {
      name: "QuickSwap_V3",
      proportion: "0",
    }, {
      name: "Dfyn",
      proportion: "0",
    }, {
      name: "Curve",
      proportion: "0",
    }, {
      name: "DODO_V2",
      proportion: "0",
    }, {
      name: "DODO",
      proportion: "0",
    }, {
      name: "Curve_V2",
      proportion: "0",
    }, {
      name: "WaultSwap",
      proportion: "0",
    }, {
      name: "ApeSwap",
      proportion: "0",
    }, {
      name: "FirebirdOneSwap",
      proportion: "0",
    }, {
      name: "Balancer_V2",
      proportion: "0",
    }, {
      name: "KyberDMM",
      proportion: "0",
    }, {
      name: "IronSwap",
      proportion: "0",
    }, {
      name: "Aave_V2",
      proportion: "0",
    }, {
      name: "Uniswap_V3",
      proportion: "0",
    }, {
      name: "Synapse",
      proportion: "0",
    }, {
      name: "MeshSwap",
      proportion: "0",
    }, {
      name: "WOOFi",
      proportion: "0",
    }, {
      name: "Aave_V3",
      proportion: "0",
    }, {
      name: "KyberElastic",
      proportion: "0",
    }, {
      name: "Uniswap_V2",
      proportion: "0",
    }
  ],
  allowanceTarget: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  sellTokenToEthRate: "0.733762",
  buyTokenToEthRate: "1",
  to: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  from: "0x4d2a422db44144996e855ce15fb581a477dbb947",
  data: "0x415565b00000000000000000000000003c499c542cef5e3811e1192ce70d8cc03d5c3359000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000001dc4f171077172c00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000044000000000000000000000000000000000000000000000000000000000000004e000000000000000000000000000000000000000000000000000000000000005e0000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000360000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003c499c542cef5e3811e1192ce70d8cc03d5c33590000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000003c499c542cef5e3811e1192ce70d8cc03d5c335900000000000000000000000000000000000000000000000001e1d7c90cae10f900000000000000000000000000000000000000000000000000000000000186a00000000000000000000000002c6bea966e83dff8619e54fd819da727ed5102e100000000000000000000000000000000000000000000000000000000000000000000000000000000000000004d2a422db44144996e855ce15fb581a477dbb9470000000066564ee9000000000000000000000000000000000000000066564e8f0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c22774081e5be1a4b9b394644554fa7400dd317861c4e70b6657da7397a3d2e6f696a5866fe1edbc217b9d62b64850f34206695132c1db864c7444eedf809066500000000000000000000000000000000000000000000000000000000000186a00000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000b000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000b72d6a2afec0000000000000000000000000ad01c20d5886137e056775af56915de824c8fce5000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000003c499c542cef5e3811e1192ce70d8cc03d5c33590000000000000000000000000000000000000000000000000000000000000000869584cd000000000000000000000000100000000000000000000000000000000000001100000000000000000000000000000000887aaf03cd5ae02198bae97a310c70bf",
  decodedUniqueId: "0x887aaf03cd5ae02198bae97a310c70bf",
  guaranteedPrice: "1.3406904939335454",
  orders: [
    {
      type: 3,
      source: "Native",
      makerToken: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      takerToken: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
      makerAmount: "135626722298958073",
      takerAmount: "100000",
      fill: {
        input: "100000",
        output: "135626722298958073",
        adjustedOutput: "133226721498958073",
        gas: 80000,
      },
      fillData: {
        type: 3,
        order: {
          makerToken: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
          takerToken: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
          makerAmount: "135626722298958073",
          takerAmount: "100000",
          maker: "0x2c6bea966e83dff8619e54fd819da727ed5102e1",
          taker: "0x0000000000000000000000000000000000000000",
          chainId: 137,
          verifyingContract: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
          txOrigin: "0x4d2a422db44144996e855ce15fb581a477dbb947",
          expiryAndNonce: "10777358901907395519432080907941505350453700235649464932964626747023",
          expiry: "1716932329",
          nonceBucket: "0",
          nonce: "1716932239",
        },
        signature: {
          v: 28,
          r: "0x22774081e5be1a4b9b394644554fa7400dd317861c4e70b6657da7397a3d2e6f",
          s: "0x696a5866fe1edbc217b9d62b64850f34206695132c1db864c7444eedf8090665",
          signatureType: 2,
        },
        fillableTakerAmount: "100000",
        fillableMakerAmount: "135626722298958073",
        fillableTakerFeeAmount: "0",
      },
    }
  ],
  fees: {
    zeroExFee: {
      feeType: "volume",
      feeToken: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      feeAmount: "201405682613952",
      billingType: "on-chain",
    },
  },
  auxiliaryChainData: {},
}
Tx hash:  0xd0159095f0815f2ca99e1694699deba64dfbc1a9e927296ea7d47b3f71a0f56e
See tx details at https://polygonscan.com/tx/0xd0159095f0815f2ca99e1694699deba64dfbc1a9e927296ea7d47b3f71a0f56e
```
