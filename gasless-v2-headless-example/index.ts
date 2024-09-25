import { config as dotenv } from "dotenv";
import {
  createWalletClient,
  http,
  getContract,
  erc20Abi,
  parseUnits,
  maxUint256,
  publicActions,
  Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { wethAbi } from "./abi/weth-abi";
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
  "0x-version": "v2",
});

// setup wallet client
const client = createWalletClient({
  account: privateKeyToAccount(("0x" + PRIVATE_KEY) as `0x${string}`),
  chain: base,
  transport: http(ALCHEMY_HTTP_TRANSPORT_URL),
}).extend(publicActions); // extend wallet client with publicActions for public client

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
  console.log();
  console.log(`http://api.0x.org/gasless/price?${priceParams.toString()}`);
  console.log();
  console.log("🏷 priceResponse: ", price);
  console.log();

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
  console.log();
  console.log("💸 quoteResponse: ", quote);
  console.log();

  // 3. Check if token approval is required and if gasless approval is available
  const tokenApprovalRequired = quote.issues.allowance != null;
  const gaslessApprovalAvailable = quote.approval != null;

  console.log("🪙 tokenApprovalRequired: ", tokenApprovalRequired);
  console.log("⛽ gaslessApprovalAvailable: ", gaslessApprovalAvailable);

  let successfulTradeHash: any = null;

  successfulTradeHash = await executeTrade(
    tokenApprovalRequired,
    gaslessApprovalAvailable
  );

  async function executeTrade(
    tokenApprovalRequired: boolean,
    gaslessApprovalAvailable: boolean
  ) {
    let approvalSignature: Hex | null = null;
    let approvalDataToSubmit: any = null;
    let tradeDataToSubmit: any = null;
    let tradeSignature: any = null;

    if (tokenApprovalRequired) {
      if (gaslessApprovalAvailable) {
        approvalSignature = await signApprovalObject(); // Function to sign approval object
      } else {
        await standardApproval(); // Function to handle standard approval
      }
    }

    if (approvalSignature) {
      approvalDataToSubmit = await approvalSplitSigDataToSubmit(
        approvalSignature
      );
    }

    tradeSignature = await signTradeObject(); // Function to sign trade object
    tradeDataToSubmit = await tradeSplitSigDataToSubmit(tradeSignature);

    successfulTradeHash = await submitTrade(
      tradeDataToSubmit,
      approvalDataToSubmit
    ); // Function to submit trade
    return successfulTradeHash;
  }

  // Helper functions
  async function signTradeObject(): Promise<any> {
    // Logic to sign trade object
    const tradeSignature = await client.signTypedData({
      types: quote.trade.eip712.types,
      domain: quote.trade.eip712.domain,
      message: quote.trade.eip712.message,
      primaryType: quote.trade.eip712.primaryType,
    });
    console.log("🖊️ tradeSignature: ", tradeSignature);
    return tradeSignature;
  }

  async function signApprovalObject(): Promise<any> {
    // Logic to sign approval object
    const approvalSignature = await client.signTypedData({
      types: quote.approval.eip712.types,
      domain: quote.approval.eip712.domain,
      message: quote.approval.eip712.message,
      primaryType: quote.approval.eip712.primaryType,
    });
    console.log("🖊️ approvalSignature: ", approvalSignature);
    return approvalSignature;
  }

  async function standardApproval(): Promise<any> {
    if (quote.issues.allowance !== null) {
      try {
        const { request } = await usdc.simulate.approve([
          quote.issues.allowance.spender,
          maxUint256,
        ]);
        console.log("Approving Permit2 to spend USDC...", request);
        // set approval
        const hash = await usdc.write.approve(request.args);
        console.log(
          "Approved Permit2 to spend USDC.",
          await client.waitForTransactionReceipt({ hash })
        );
      } catch (error) {
        console.log("Error approving Permit2:", error);
      }
    } else {
      console.log("USDC already approved for Permit2");
    }
  }

  async function approvalSplitSigDataToSubmit(object: any): Promise<any> {
    // split approval signature and package data to submit
    const approvalSplitSig = await splitSignature(object);
    let approvalDataToSubmit = {
      type: quote.approval.type,
      eip712: quote.approval.eip712,
      signature: {
        ...approvalSplitSig,
        v: Number(approvalSplitSig.v),
        signatureType: SignatureType.EIP712,
      },
    };
    return approvalDataToSubmit; // Return approval object with split signature
  }

  async function tradeSplitSigDataToSubmit(object: any): Promise<any> {
    // split trade signature and package data to submit
    const tradeSplitSig = await splitSignature(object);
    let tradeDataToSubmit = {
      type: quote.trade.type,
      eip712: quote.trade.eip712,
      signature: {
        ...tradeSplitSig,
        v: Number(tradeSplitSig.v),
        signatureType: SignatureType.EIP712,
      },
    };
    return tradeDataToSubmit; // Return trade object with split signature
  }
  // 4. Make a POST request to submit trade with tradeObject (and approvalObject if available)
  async function submitTrade(
    tradeDataToSubmit: any,
    approvalDataToSubmit: any
  ): Promise<void> {
    try {
      let successfulTradeHash;
      const requestBody: any = {
        trade: tradeDataToSubmit,
        chainId: client.chain.id,
      };
      if (approvalDataToSubmit) {
        requestBody.approval = approvalDataToSubmit;
      }
      const response = await fetch("https://api.0x.org/gasless/submit", {
        method: "POST",
        headers: {
          "0x-api-key": process.env.ZERO_EX_API_KEY as string,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      successfulTradeHash = data.tradeHash;
      console.log("#️⃣ tradeHash: ", successfulTradeHash);
      return successfulTradeHash;
    } catch (error) {
      console.error("Error submitting the gasless swap", error);
    }
  }

  // 5. Check trade status
  async function fetchStatus(tradeHash: string) {
    const response = await fetch(
      "http://api.0x.org/gasless/status/" +
        tradeHash +
        "?" +
        "chainId=" +
        client.chain.id.toString(),
      {
        headers,
      }
    );
    const data = await response.json();
    return data;
  }

  async function fetchStatusPeriodically(tradeHash: string) {
    const intervalId = setInterval(async () => {
      const data = await fetchStatus(tradeHash);
      console.log("checks: ", data); // Handle or log the fetched data as needed

      if (data.status === "confirmed") {
        clearInterval(intervalId); // Stop interval if status is confirmed
        console.log("🎉 Transaction Completed!");
      }
    }, 3000);
    console.log("⏳ Transaction Pending");
    // Return intervalId to enable clearing the interval if needed externally
    return intervalId;
  }

  async function startStatusCheck(successfulTradeHash: string) {
    if (successfulTradeHash) {
      const intervalId = await fetchStatusPeriodically(successfulTradeHash);

      // Optionally, clear the interval after 60 seconds
      setTimeout(() => clearInterval(intervalId), 60000); // Stop after 60 seconds
    } else {
      console.log(
        "successfulTradeHash is null or undefined, skipping status check."
      );
    }
  }
  startStatusCheck(successfulTradeHash);
};
main();
