# Gasless v2 headless example (viem)

A headless example of how to use 0x Gasless API v2 using [viem](https://viem.sh/)

Demonstrates the following on Base mainnet:

1. Get an indicative price (sell 0.1 USDC → buy WETH) using `/gasless/price`
2. Get a firm quote (sell 0.1 USDC → buy WETH) using `/gasless/quote`
3. Submit the transaction using `/gasless/submit`
   
   a. Sign the gasless approval object (if applicable)
   
   b. Sign the trade object
   
   c. Split the signatures
   
   d. Package signed objects into a format that can be POST to `/gasless/submit`
   
   e. Compute trade hash
   
4. Check the trade status using `/gasless/status/{tradeHash}`

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

#### Requirements

- Install [Bun](https://bun.sh/) (v1.1.0+)
- An Ethereum private key
- Setup a wallet with 1 USDC

## Usage

1. Create a `.env` file and setup the required environment variables (your Ethereum private keys & 0x API key).

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

4. This demo showcases trading 0.1 USDC (a token that supports gasless approvals) for WETH (a token that does not support gasless approvals). Here is an example output:

```
Fetching price to swap 0.1 USDC for WETH with Gasless API

http://api.0x.org/gasless/price?chainId=8453&sellToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&buyToken=0x4200000000000000000000000000000000000006&sellAmount=100000

🏷 priceResponse:  {
  blockNumber: "17147853",
  buyAmount: "25198428928253",
  buyToken: "0x4200000000000000000000000000000000000006",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "150",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "volume",
    },
    gasFee: {
      amount: "14002",
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
  minBuyAmount: "25122833641468",
  route: {
    fills: [
      {
        from: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        to: "0x4200000000000000000000000000000000000006",
        source: "DackieSwap_V3",
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
  zid: "0x50493e991b99c1737872d17d",
}

Fetching quote to swap 0.1 USDC for WETH with Gasless API

💸 quoteResponse:  {
  approval: {
    type: "permit",
    hash: "0x1d9dccad1cd6bdab464ec9b90a091f6d3fdecc68b367ba4134da14c26705a857",
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
        nonce: 1,
        deadline: "1721085656",
      },
      primaryType: "Permit",
    },
  },
  blockNumber: "17147854",
  buyAmount: "25421825704640",
  buyToken: "0x4200000000000000000000000000000000000006",
  fees: {
    integratorFee: null,
    zeroExFee: {
      amount: "150",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "volume",
    },
    gasFee: {
      amount: "13226",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      type: "gas",
    },
  },
  issues: {
    allowance: {
      actual: "0",
      spender: "0x000000000022d473030f116ddee9f6b43ac78ba3",
    },
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "25345560227526",
  route: {
    fills: [
      {
        from: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        to: "0x4200000000000000000000000000000000000006",
        source: "DackieSwap_V3",
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
  target: "0xca11bde05977b3631167028862be2a173976ca11",
  trade: {
    type: "settler_metatransaction",
    hash: "0x955f2009cc0fafa4f37de4ff5220a3d9028b4cf47f66bbeb09a916cc09fefbc7",
    eip712: {
      types: {
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
        spender: "0x5ce929ddb01804bff35b2f5c77b735bdb094aac8",
        nonce: "2241959297937691820908574931991581",
        deadline: "1721085355",
        slippageAndActions: {
          recipient: "0x4d2a422db44144996e855ce15fb581a477dbb947",
          buyToken: "0x4200000000000000000000000000000000000006",
          minAmountOut: "25345560227526",
          actions: [ "0x0dfeb4190000000000000000000000005ce929ddb01804bff35b2f5c77b735bdb094aac8000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000186a00000000000000000000000000000000000006e898131631616b1779bad70bc1d000000000000000000000000000000000000000000000000000000006695adab",
            "0x38c9c147000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000000000539000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000009f6601854dee374b1bfaf6350ffd27a97309d431000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "0x38c9c147000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000000002710000000000000000000000000195fbc5b8fbd5ac739c1ba57d4ef6d5a704f34f7000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000104b858183f000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000005ce929ddb01804bff35b2f5c77b735bdb094aac800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b833589fcd6edb6e08f4c7c32d4f71b54bda02913002710420000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
          ],
        },
      },
      primaryType: "PermitWitnessTransferFrom",
    },
  },
  zid: "0xa7d8a0cd09697907e88b9c91",
}

🪙 tokenApprovalRequired:  true
⛽ gaslessApprovalAvailable:  true
🖊️ approvalSignature:  0xddb4a6c699f604074b80332d79f5859525a70af821d636a2d74c216fcec8b8b87d32863c31f27aad0e74fe4a1a780cfc670180ae77fd1834d8db6bcf3b9c22f91c
🖊️ tradeSignature:  0x06e359425b5ff37cee27452d927a98e19161011141467822582476e3c75a8d71559f37a9a9b28783e61f228238eb10035d55bd07d0800c9de28b72be3cac18c91b
#️⃣ tradeHash:  0x955f2009cc0fafa4f37de4ff5220a3d9028b4cf47f66bbeb09a916cc09fefbc7
⏳ Transaction Pending
checks:  {
  status: "succeeded",
  transactions: [
    {
      hash: "0xc619aae86b1fbbb7418ab09cd849a21e4f0c07a316f87ec991ee6639fec67f5b",
      timestamp: 1721085056563,
    }
  ],
  zid: "0xd480bf2cca5769626b4549c7",
}
checks:  {
  status: "succeeded",
  transactions: [
    {
      hash: "0xc619aae86b1fbbb7418ab09cd849a21e4f0c07a316f87ec991ee6639fec67f5b",
      timestamp: 1721085056563,
    }
  ],
  zid: "0x78fd55b57dfbfdebd7565480",
}
checks:  {
  status: "confirmed",
  transactions: [
    {
      hash: "0xc619aae86b1fbbb7418ab09cd849a21e4f0c07a316f87ec991ee6639fec67f5b",
      timestamp: 1721085056563,
    }
  ],
  zid: "0x67e11e02ba701a762e58ebe4",
}
🎉 Transaction Completed!
```
## Supported Networks

See [here](https://0x.org/docs/introduction/0x-cheat-sheet#-chain-support) for the full list of 0x API supported networks. 
