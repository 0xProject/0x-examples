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
import { exchangeProxyAbi } from "./exchange-proxy-abi";
import { wethAbi } from "./weth-abi";

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

// fetch constants
const headers = new Headers({
  "Content-Type": "application/json",
  "0x-api-key": ZERO_EX_API_KEY,
});

// setup wallet client
const client = createWalletClient({
  account: privateKeyToAccount(("0x" + PRIVATE_KEY) as `0x${string}`),
  chain: base,
  transport: http(ALCHEMY_HTTP_TRANSPORT_URL),
}).extend(publicActions); // extend wallet client with publicActions for public client

const [address] = await client.getAddresses();

// set up contracts
const exchangeProxy = getContract({
  address: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  abi: exchangeProxyAbi,
  client,
});
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
  const sellAmount = parseUnits("0.1", await usdc.read.decimals());

  // 1. fetch price
  const priceParams = new URLSearchParams({
    sellToken: usdc.address,
    buyToken: weth.address,
    sellAmount: sellAmount.toString(),
  });

  const priceResponse = await fetch(
    "https://base.api.0x.org/swap/v1/price?" + priceParams.toString(),
    {
      headers,
    }
  );

  const price = await priceResponse.json();
  console.log("Fetching price to swap 0.1 USDC for WETH");
  console.log("priceResponse: ", price);

  // 2. check approval for 0x Exchange Proxy to spend sellToken
  if (
    sellAmount >
    (await usdc.read.allowance([client.account.address, exchangeProxy.address]))
  )
    try {
      const { request } = await usdc.simulate.approve([
        exchangeProxy.address,
        maxUint256,
      ]);
      console.log("Approving 0x Exchage Proxy to spend USDC...", request);
      // Set approval
      const hash = await usdc.write.approve(request.args);
      console.log(
        "Approved 0x EP to spend USDC.",
        await client.waitForTransactionReceipt({ hash })
      );
    } catch (error) {
      console.log("Error approving 0x Exchange Proxy:", error);
    }
  else {
    console.log("USDC already approved for 0x Exchange Proxy");
  }

  // 3. build quote params from price params + takerAddress
  const quoteParams = new URLSearchParams({
    takerAddress: client.account.address,
  });
  for (const [key, value] of priceParams.entries())
    quoteParams.append(key, value);

  // 4. fetch quote
  const quoteResponse = await fetch(
    "https://base.api.0x.org/swap/v1/quote?" + quoteParams.toString(),
    {
      headers,
    }
  );

  const quote = await quoteResponse.json();
  console.log("Fetching quote to swap 0.1 USDC for WETH");
  console.log("quoteResponse: ", quote);

  // 5. send txn
  const hash = await client.sendTransaction({
    to: quote.to,
    data: quote.data,
  });

  console.log("Tx hash: ", hash);
  console.log(`See tx details at https://basescan.org/tx/${hash}`);
};

main();
