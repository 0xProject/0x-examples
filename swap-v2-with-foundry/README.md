# Use Swap API in Your Smart Contract with Foundry

---

> ⚠️ **WARNING — READ BEFORE USING 0x API**
>
> - **NEVER** set an allowance on the [Settler contract](/introduction/0x-cheat-sheet#0x-settler-contracts).  
>   Doing so may lead to **loss of tokens** or **security risks**.  
>   The Settler contract does **not** require allowances — setting one enables misuse by other parties.
>
> - **ONLY** set allowances on [Permit2](/introduction/0x-cheat-sheet#permit2-contract) or [AllowanceHolder](/introduction/0x-cheat-sheet#allowanceholder-contract) — as specified by API responses.
>
> - The correct allowance target is returned in `issues.allowance.spender`.

> - This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

---

This repository contains a toy example of the `SimpleTokenSwap` contract, designed to demonstrate ERC20 token swaps with 0x Swap API v2 through a smart contract. The repo is built and tested using [Foundry](https://getfoundry.sh/).

> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

## Installation

### Prerequisites

Ensure you have Foundry installed. If not, install Foundry with:

```
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Clone the repository

Clone this repo and navigate into the project directory

### Install the dependencies

```
forge install
```

## Running tests

To run the test suite:

```
forge test
```

You can run tests with verbose output for detailed logs and traces:

```
forge test -vvvv
```

You can run a specific test using the `--match-test` flag

```
forge test --match-test testSwapCallInsufficientFunds -vvvv
```

## Fork Integration Testing

To run integration tests against a live network fork (e.g., Ethereum mainnet fork):

1. Start a local Anvil fork (or any Foundry-supported local fork):

```
anvil --fork-url <YOUR_RPC_URL>
```

2. Run the tests against the forked network:

```
forge test --fork-url <YOUR_RPC_URL>
```

> [!NOTE]
> Make sure the forked block contains the tokens and liquidity you intend to test with.
