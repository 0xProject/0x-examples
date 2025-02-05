import { config as dotenv } from "dotenv";
import {
  createWalletClient,
  http,
  getContract,
  erc20Abi,
  parseUnits,
  maxUint256,
  publicActions,
  concat,
  numberToHex,
  size,
} from "viem";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { usdcAbi } from "./abi/usdc-abi";

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
  account: privateKeyToAccount(`0x${PRIVATE_KEY}` as `0x${string}`),
  chain: base,
  transport: http(ALCHEMY_HTTP_TRANSPORT_URL),
}).extend(publicActions);

const [address] = await client.getAddresses();

// Contract addresses for Base network
const CONTRACTS = {
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  WETH: "0x4200000000000000000000000000000000000006",
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
} as const;

// set up contracts
const eth = getContract({
  address: CONTRACTS.ETH,
  abi: erc20Abi,
  client,
});

const weth = getContract({
  address: CONTRACTS.WETH,
  abi: erc20Abi,
  client,
});

const usdc = getContract({
  address: CONTRACTS.USDC,
  abi: usdcAbi,
  client,
});

type TokenType = "ETH" | "WETH";

const executeSwap = async (sellTokenType: TokenType) => {
  const sellToken = sellTokenType === "ETH" ? eth : weth;
  let sellAmount;

  // handle ETH separately (no need to call decimals on ETH)
  if (sellToken.address === CONTRACTS.ETH) {
    sellAmount = parseUnits("0.0001", 18); // ETH has 18 decimals
  } else {
    // specify sell amount for ERC-20 tokens
    sellAmount = parseUnits("0.0001", await sellToken.read.decimals());
  }

  // 1. fetch price
  const priceParams = new URLSearchParams({
    chainId: client.chain.id.toString(),
    sellToken: sellToken.address,
    buyToken: CONTRACTS.USDC,
    sellAmount: sellAmount.toString(),
    taker: client.account.address,
  });

  const priceResponse = await fetch(
    "https://api.0x.org/swap/permit2/price?" + priceParams.toString(),
    { headers }
  );

  const price = await priceResponse.json();
  console.log(`Fetching price to swap 0.0001 ${sellTokenType} for USDC`);
  console.log(
    `https://api.0x.org/swap/permit2/price?${priceParams.toString()}`
  );
  console.log("priceResponse: ", price);

  // 2. Check if the sellToken is a native token (ETH) to skip allowance
  if (sellToken.address === CONTRACTS.ETH) {
    console.log("Native token detected, no need for allowance check");
  } else {
    // Check if allowance is required
    if (price.issues.allowance !== null) {
      try {
        const { request } = await sellToken.simulate.approve([
          price.issues.allowance.spender,
          maxUint256,
        ]);
        console.log("Approving Permit2 to spend sellToken...", request);
        // set approval
        const hash = await sellToken.write.approve(request.args);
        console.log(
          "Approved Permit2 to spend sellToken.",
          await client.waitForTransactionReceipt({ hash })
        );
      } catch (error) {
        console.log("Error approving Permit2:", error);
      }
    } else {
      console.log("sellToken already approved for Permit2");
    }
  }

  // 3. fetch quote
  const quoteParams = new URLSearchParams();
  for (const [key, value] of priceParams.entries()) {
    quoteParams.append(key, value);
  }

  const quoteResponse = await fetch(
    "https://api.0x.org/swap/permit2/quote?" + quoteParams.toString(),
    { headers }
  );

  const quote = await quoteResponse.json();
  console.log(`Fetching quote to swap 0.0001 ${sellTokenType} for USDC`);
  console.log("quoteResponse: ", quote);

  // 4. sign permit2.eip712 returned from quote
  let signature: Hex | undefined;
  if (quote.permit2?.eip712) {
    try {
      signature = await client.signTypedData(quote.permit2.eip712);
      console.log("Signed permit2 message from quote response");
    } catch (error) {
      console.error("Error signing permit2 coupon:", error);
    }

    // 5. append sig length and sig data to transaction.data
    if (signature && quote?.transaction?.data) {
      const signatureLengthInHex = numberToHex(size(signature), {
        signed: false,
        size: 32,
      });

      const transactionData = quote.transaction.data as Hex;
      const sigLengthHex = signatureLengthInHex as Hex;
      const sig = signature as Hex;

      quote.transaction.data = concat([transactionData, sigLengthHex, sig]);
    } else {
      throw new Error("Failed to obtain signature or transaction data");
    }
  }

  // 6. submit txn with permit2 signature
  const nonce = await client.getTransactionCount({
    address: client.account.address,
  });

  // Check if it's a native token (like ETH)
  if (sellToken.address === CONTRACTS.ETH) {
    // Directly sign and send the native token transaction
    const transaction = await client.sendTransaction({
      account: client.account,
      chain: client.chain,
      gas: !!quote?.transaction.gas
        ? BigInt(quote?.transaction.gas)
        : undefined,
      to: quote?.transaction.to,
      data: quote.transaction.data,
      value: BigInt(quote.transaction.value),
      gasPrice: !!quote?.transaction.gasPrice
        ? BigInt(quote?.transaction.gasPrice)
        : undefined,
      nonce: nonce,
    });

    console.log("Transaction hash:", transaction);
    console.log(`See tx details at https://basescan.org/tx/${transaction}`);
  } else if (signature && quote.transaction.data) {
    // Handle ERC-20 token case (requires signature)
    const signedTransaction = await client.signTransaction({
      account: client.account,
      chain: client.chain,
      gas: !!quote?.transaction.gas
        ? BigInt(quote?.transaction.gas)
        : undefined,
      to: quote?.transaction.to,
      data: quote.transaction.data,
      gasPrice: !!quote?.transaction.gasPrice
        ? BigInt(quote?.transaction.gasPrice)
        : undefined,
      nonce: nonce,
    });

    const hash = await client.sendRawTransaction({
      serializedTransaction: signedTransaction,
    });

    console.log("Transaction hash:", hash);
    console.log(`See tx details at https://basescan.org/tx/${hash}`);
  } else {
    console.error("Failed to obtain a signature, transaction not sent.");
  }
};

const main = async () => {
  try {
    // Execute ETH to USDC swap
    console.log("Executing ETH to USDC swap...");
    await executeSwap("ETH");

    // Wait a few blocks before executing the next transaction
    console.log("Waiting before executing next swap...");
    await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait 15 seconds

    // Execute WETH to USDC swap
    console.log("\nExecuting WETH to USDC swap...");
    await executeSwap("WETH");
  } catch (error) {
    console.error("Error executing swaps:", error);
  }
};

main();
