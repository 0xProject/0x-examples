import { config as dotenv } from "dotenv";
import {
  createWalletClient,
  http,
  getContract,
  erc20Abi,
  parseUnits,
  maxUint256,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { wethAbi } from "./abi/weth-abi";

const qs = require("qs");

// load env vars
dotenv();
const { PRIVATE_KEY, ZERO_EX_API_KEY, ALCHEMY_HTTP_TRANSPORT_URL } =
  process.env;

// validate requirements
if (!PRIVATE_KEY) throw new Error("missing PRIVATE_KEY.");
if (!ZERO_EX_API_KEY) throw new Error("missing ZERO_EX_API_KEY.");
if (!ALCHEMY_HTTP_TRANSPORT_URL)
  throw new Error("missing ALCHEMY_HTTP_TRANSPORT_URL.");

// fetch headers
const headers = new Headers({
  "Content-Type": "application/json",
  "0x-api-key": ZERO_EX_API_KEY,
  "0x-version": "v2",
});

// setup wallet client
const client = createWalletClient({
  account: privateKeyToAccount(("0x" + PRIVATE_KEY) as `0x${string}`),
  chain: base,
  transport: http(ALCHEMY_HTTP_TRANSPORT_URL),
}).extend(publicActions); // extend wallet client with publicActions for public client

const [address] = await client.getAddresses();

// set up contracts
const usdc = getContract({
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  abi: erc20Abi,
  client,
});
const weth = getContract({
  address: "0x4200000000000000000000000000000000000006",
  abi: wethAbi,
  client,
});

const main = async () => {
  // specify sell amount
  const sellAmount = parseUnits("0.1", await usdc.read.decimals());

  // 1. fetch price
  const priceParams = new URLSearchParams({
    chainId: client.chain.id.toString(),
    sellToken: usdc.address,
    buyToken: weth.address,
    sellAmount: sellAmount.toString(),
  });

  const priceResponse = await fetch(
    "https://api.0x.org/swap/allowance-holder/price?" + priceParams.toString(),
    {
      headers,
    }
  );

  const price = await priceResponse.json();
  console.log("Fetching price to swap 0.1 USDC for WETH");
  console.log(
    `https://api.0x.org/swap/allowance-holder/price?${priceParams.toString()}`
  );
  console.log("priceResponse: ", price);

  // 2. check if taker needs to set an allowance for AllowanceHolder
  if (price.issues.allowance !== null) {
    try {
      const { request } = await usdc.simulate.approve([
        price.issues.allowance.spender,
        maxUint256,
      ]);
      console.log("Approving AllowanceHolder to spend USDC...", request);
      // set approval
      const hash = await usdc.write.approve(request.args);
      console.log(
        "Approved AllowanceHolder to spend USDC.",
        await client.waitForTransactionReceipt({ hash })
      );
    } catch (error) {
      console.log("Error approving AllowanceHolder:", error);
    }
  } else {
    console.log("USDC already approved for AllowanceHolder");
  }

  // 3. fetch quote
  const quoteParams = new URLSearchParams();

  quoteParams.append("taker", client.account.address);

  for (const [key, value] of priceParams.entries()) {
    quoteParams.append(key, value);
  }

  const quoteResponse = await fetch(
    "https://api.0x.org/swap/allowance-holder/quote?" + quoteParams.toString(),
    {
      headers,
    }
  );

  const quote = await quoteResponse.json();
  console.log("Fetching quote to swap 0.1 USDC for WETH");
  console.log("quoteResponse: ", quote);

  // 4. send txn
  const hash = await client.sendTransaction({
    to: quote?.transaction.to,
    data: quote?.transaction.data,
    value: quote?.transaction.value
      ? BigInt(quote.transaction.value)
      : undefined, // value is used for native tokens
  });

  console.log("Tx hash: ", hash);
  console.log(`See tx details at https://basescan.org/tx/${hash}`);
};

main();
