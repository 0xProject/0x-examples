# Gasless v2 headless example (viem)

This demo showcases trading USDC (a token that supports gasless approvals) for WETH (a token that does not support gasless approvals).

```
➜  gasless-v2-headless-example git:(jlin/gasless-v2-headless-example) ✗ bun run index.ts
Fetching price to swap 0.1 USDC for WETH with Gasless API
https://api.0x.org/gasless/price?chainId=8453&sellToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&buyToken=0x4200000000000000000000000000000000000006&sellAmount=100000
priceResponse:  {
  blockNumber: "16540171",
  buyAmount: "26868050623322",
  buyToken: "0x4200000000000000000000000000000000000006",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "150",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "volume",
    },
    gasFee: {
      amount: "6929",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "gas",
    },
  },
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "26787446471453",
  route: {
    fills: [
      {
        from: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        to: "0x4200000000000000000000000000000000000006",
        source: "Uniswap_V3",
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
  target: "0x5ce929ddb01804bff35b2f5c77b735bdb094aac8",
}
Fetching quote to swap 0.1 USDC for WETH
quoteResponse:  {
  approval: {
    type: "permit",
    hash: "0xdf5da1fd18132295a3c17ef7f1606b09ead76f77e003c3b5999ff747ffac711e",
    eip712: {
      types: {
        EIP712Domain: [
          {
            name: "name",
            type: "string",
          }, {
            name: "version",
            type: "string",
          }, {
            name: "chainId",
            type: "uint256",
          }, {
            name: "verifyingContract",
            type: "address",
          }
        ],
        Permit: [
          {
            name: "owner",
            type: "address",
          }, {
            name: "spender",
            type: "address",
          }, {
            name: "value",
            type: "uint256",
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
        name: "USD Coin",
        version: "2",
        chainId: 8453,
        verifyingContract: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      },
      message: {
        owner: "0x4d2a422db44144996e855ce15fb581a477dbb947",
        spender: "0x000000000022d473030f116ddee9f6b43ac78ba3",
        value: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        nonce: 0,
        deadline: "1719870292",
      },
      primaryType: "Permit",
    },
  },
  blockNumber: "16540171",
  buyAmount: "26684304324484",
  buyToken: "0x4200000000000000000000000000000000000006",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "150",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "volume",
    },
    gasFee: {
      amount: "7564",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "gas",
    },
  },
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "26604251411511",
  route: {
    fills: [
      {
        from: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        to: "0x4200000000000000000000000000000000000006",
        source: "Uniswap_V3",
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
  target: "0x5ce929ddb01804bff35b2f5c77b735bdb094aac8",
  trade: {
    type: "settler_metatransaction",
    hash: "0xd07ee559049c1ef21a4f33bb56dfb5ef069bede8c430078378e546c7e254aea9",
    eip712: {
      types: {
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
        PermitWitnessTransferFrom: [
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
          }, {
            name: "slippageAndActions",
            type: "SlippageAndActions",
          }
        ],
        SlippageAndActions: [
          {
            name: "recipient",
            type: "address",
          }, {
            name: "buyToken",
            type: "address",
          }, {
            name: "minAmountOut",
            type: "uint256",
          }, {
            name: "actions",
            type: "bytes[]",
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
          amount: "92286",
        },
        spender: "0x5ce929ddb01804bff35b2f5c77b735bdb094aac8",
        nonce: "2241959297937691820908574931991583",
        deadline: "1719869991",
        slippageAndActions: {
          recipient: "0x0000000000000000000000000000000000000000",
          buyToken: "0x0000000000000000000000000000000000000000",
          minAmountOut: "0",
          actions: [ "0x0dfeb4190000000000000000000000005ce929ddb01804bff35b2f5c77b735bdb094aac8000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000001687e0000000000000000000000000000000000006e898131631616b1779bad70bc1f0000000000000000000000000000000000000000000000000000000066832227",
            "0x38c9c147000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000000000303000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000009f6601854dee374b1bfaf6350ffd27a97309d431000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "0x8d68a1560000000000000000000000004d2a422db44144996e855ce15fb581a477dbb947000000000000000000000000000000000000000000000000000000000000271000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000183248f47437000000000000000000000000000000000000000000000000000000000000002c833589fcd6edb6e08f4c7c32d4f71b54bda029130000006442000000000000000000000000000000000000060000000000000000000000000000000000000000"
          ],
        },
      },
      primaryType: "PermitWitnessTransferFrom",
    },
  },
}
```
