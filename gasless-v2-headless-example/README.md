# Gasless v2 headless example (viem)

A headless example of how to use 0x Gasless API v2 using [viem](https://viem.sh/)

Demonstrates the following on Base mainnet:

1. Get an indicative price (sell 0.1 USDC → buy WETH) using `/gasless/price`
2. Get a firm quote (sell 0.1 USDC → buy WETH) using `/gasless/quote`
3. Submit the transaction using `/gasless/submit`
   a. Sign the gasless approval object(if applicable)
   b. Sign the trade object
   c. Split the signatures
   d. Package signed objects into a format that can be POST to `/submit`
   e. Compute trade hash
4. Check the trade status using `/gasless/status/{tradHash}`

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

4. This demo showcases trading 0.1 USDC (a token that supports gasless approvals) for WETH (a token that does not support gasless approvals).
