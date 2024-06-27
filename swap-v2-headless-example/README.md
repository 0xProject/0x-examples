# Swap v2 headless example (viem)

A headless example of how to use 0x Swap API v2 /permit2/price and /permit2/quote using [viem](https://viem.sh/)

Demonstrates the following on Base mainnet:

1. Build price params (sell 0.1 USDC → buy WETH) Fetch price.
2. Check token approval
3. Build quote params (sell 0.1 USDC → buy WETH). Fetch quote.
4. Send transaction.

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

4. Here is an example of the output. It fetches a `price` (USCD → WETH), approves token allowance (if not already granted), fetches a `quote`, and submits the transaction, and shows the transaction hash:
