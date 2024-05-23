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
