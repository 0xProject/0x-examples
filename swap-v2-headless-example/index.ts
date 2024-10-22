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
import { scroll } from "viem/chains";
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
  chain: scroll,
  transport: http(ALCHEMY_HTTP_TRANSPORT_URL),
}).extend(publicActions); // extend wallet client with publicActions for public client

const [address] = await client.getAddresses();

// set up contracts
const eth = getContract({
  address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  abi: erc20Abi,
  client,
});
const usdc = getContract({
  address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
  abi: usdcAbi,
  client,
});

const main = async () => {
  let sellAmount;

  // handle ETH separately (no need to call decimals on ETH)
  if (eth.address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    sellAmount = parseUnits("0.0001", 18); // ETH has 18 decimals
  } else {
    // specify sell amount for ERC-20 tokens
    sellAmount = parseUnits("0.0001", await eth.read.decimals());
  }
  // 1. fetch price
  const priceParams = new URLSearchParams({
    chainId: client.chain.id.toString(),
    sellToken: eth.address,
    buyToken: usdc.address,
    sellAmount: sellAmount.toString(),
    taker: client.account.address,
  });

  const priceResponse = await fetch(
    "https://api.0x.org/swap/permit2/price?" + priceParams.toString(),
    {
      headers,
    }
  );

  const price = await priceResponse.json();
  console.log("Fetching price to swap 0.0001 ETH for USDC");
  console.log(
    `https://api.0x.org/swap/permit2/price?${priceParams.toString()}`
  );
  console.log("priceResponse: ", price);

  // 2. Check if the sellToken is a native token (ETH) to skip allowance
  if (eth.address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    console.log("Native token detected, no need for allowance check");
  } else {
    // Check if allowance is required
    if (price.issues.allowance !== null) {
      try {
        const { request } = await eth.simulate.approve([
          price.issues.allowance.spender,
          maxUint256,
        ]);
        console.log("Approving Permit2 to spend sellToken...", request);
        // set approval
        const hash = await eth.write.approve(request.args);
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
    {
      headers,
    }
  );

  const quote = await quoteResponse.json();
  console.log("Fetching quote to swap 0.0001 ETH for USDC");
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

  // Check if it's a native token (like ETH)
  if (eth.address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    const nonce = await client.getTransactionCount({
      address: client.account.address,
    });
    // Directly sign and send the native token transaction
    const transaction = await client.sendTransaction({
      account: client.account,
      chain: client.chain,
      gas: !!quote?.transaction.gas
        ? BigInt(quote?.transaction.gas)
        : undefined,
      to: quote?.transaction.to,
      data: quote.transaction.data,
      value: BigInt(quote.transaction.value), // Ensure value is set for native tokens
      gasPrice: !!quote?.transaction.gasPrice
        ? BigInt(quote?.transaction.gasPrice)
        : undefined,
      nonce: nonce,
    });

    console.log("Transaction hash:", transaction);
    console.log(`See tx details at https://scrollscan.com/tx/${transaction}`);
  } else if (signature && quote.transaction.data) {
    const nonce = await client.getTransactionCount({
      address: client.account.address,
    });
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
    console.log(`See tx details at https://scrollscan.com/tx/${hash}`);
  } else {
    console.error("Failed to obtain a signature, transaction not sent.");
  }
};
main();
