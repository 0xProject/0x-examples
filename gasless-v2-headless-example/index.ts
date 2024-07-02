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
import { permit2Abi } from "./abi/permit2-abi";
import { SignatureType, splitSignature } from "./utils/signature";

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
});

// setup wallet client
const client = createWalletClient({
  account: privateKeyToAccount(("0x" + PRIVATE_KEY) as `0x${string}`),
  chain: base,
  transport: http(ALCHEMY_HTTP_TRANSPORT_URL),
}).extend(publicActions); // extend wallet client with publicActions for public client

// set up contracts
const permit2 = getContract({
  address: "0x000000000022d473030f116ddee9f6b43ac78ba3",
  abi: permit2Abi,
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
  // specify sell amount
  // USDC supports gasless approvals because it is an ERC-20 that supports the Permit function
  const sellAmount = parseUnits("0.1", await usdc.read.decimals());

  // 1. fetch price
  const priceParams = new URLSearchParams({
    chainId: client.chain.id.toString(),
    sellToken: usdc.address,
    buyToken: weth.address,
    sellAmount: sellAmount.toString(),
  });

  const priceResponse = await fetch(
    "http://api.0x.org/gasless/price?" + priceParams.toString(),
    {
      headers,
    }
  );

  const price = await priceResponse.json();
  console.log("Fetching price to swap 0.1 USDC for WETH with Gasless API");
  console.log("priceResponse: ", price);

  // 2. fetch quote
  const quoteParams = new URLSearchParams({
    taker: client.account.address,
  });
  for (const [key, value] of priceParams.entries())
    quoteParams.append(key, value);

  const quoteResponse = await fetch(
    "http://api.0x.org/gasless/quote?" + quoteParams.toString(),
    {
      headers,
    }
  );

  const quote = await quoteResponse.json();
  console.log("Fetching quote to swap 0.1 USDC for WETH with Gasless API");
  console.log("quoteResponse: ", quote);

  // 3. check token allowance
  // check if approval is required and gasless approval is available
  if (quote.issues.allowance != null && quote.approval != null)
    try {
      // sign approval and trade objects
      const approvalSignature = await client.signTypedData({
        types: quote.approval.eip712.types,
        domain: quote.approval.eip712.domain,
        message: quote.approval.eip712.message,
        primaryType: quote.approval.eip712.primaryType,
      });
      console.log("approvalSignature ", approvalSignature);
      const tradeSignature = await client.signTypedData({
        types: quote.trade.eip712.types,
        domain: quote.trade.eip712.domain,
        message: quote.trade.eip712.message,
        primaryType: quote.trade.eip712.primaryType,
      });
      console.log("tradeSignature ", tradeSignature);

      // split both signatures
      let approvalDataToSubmit;
      let tradeDataToSubmit;

      // if approval exists, split signature for approval
      if (approvalSignature) {
        const approvalSplitSig = splitSignature(approvalSignature);
        console.log("approvalSplitSig: ", approvalSplitSig);

        approvalDataToSubmit = {
          type: quote.approval.type,
          eip712: quote.approval.eip712,
          signature: {
            ...approvalSplitSig,
            v: Number(approvalSplitSig.v),
            signatureType: SignatureType.EIP712,
          },
        };
      }

      // split signature for trade
      if (tradeSignature) {
        const tradeSplitSig = splitSignature(tradeSignature);
        console.log("tradeSplitSig: ", tradeSplitSig);

        tradeDataToSubmit = {
          type: quote.trade.type,
          eip712: quote.trade.eip712,
          signature: {
            ...tradeSplitSig,
            v: Number(tradeSplitSig.v),
            signatureType: SignatureType.EIP712,
          },
        };
      }
      console.log(
        "Can we access both data objects? ->",
        approvalDataToSubmit,
        tradeDataToSubmit
      );

      try {
        // POST approval and trade data to submit trade
        let successfulTradeHash;
        const response = await fetch("https://api.0x.org/gasless/submit", {
          method: "POST",
          headers: {
            "0x-api-key": process.env.ZERO_EX_API_KEY as string,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trade: tradeDataToSubmit,
            approval: approvalDataToSubmit,
            chainId: client.chain.id,
          }),
        });
        const data = await response.json();
        successfulTradeHash = data.tradeHash;
        // onSubmitSuccess(successfulTradeHash);
        console.log("tradeHash: ", successfulTradeHash);
      } catch (error) {
        console.error("Error submitting the gasless swap", error);
      }
    } catch (error) {
      console.log("Error signing", error);
    }
  // if approval is not required; in other words, (issues.allowance = null && approval = null
  // note this example does not account for the case where the sell token does not support gasless, but approval is required; in other words, issues.allowance != null && approval = null
  else {
    // just sign trade object
    // split signature
    // package signature
  }

  // 4. Submit transaction
};
main();
