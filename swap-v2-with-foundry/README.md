# Use Swap API in Your Smart Contract with Foundry

This repository contains a toy example of the `SimpleTokenSwap` contract, designed to demonstrate ERC20 token swaps with 0x Swap API v2 through a smart contract. The repo is built and tested using [Foundry](https://getfoundry.sh/).

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