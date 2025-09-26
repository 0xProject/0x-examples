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

// fetch headers (shared)
const headers = new Headers({
  "Content-Type": "application/json",
  "0x-api-key": ZERO_EX_API_KEY!,
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

// Small helper to safely parse JSON (and surface non-JSON errors)
async function fetchJsonOrThrow(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || !ct.includes("application/json")) {
    const bodyText = await res.text().catch(() => "<unreadable body>");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}\n` +
        `Content-Type: ${ct}\n` +
        `Body:\n${bodyText}`
    );
  }
  return res.json();
}

const main = async () => {
  // specify sell amount
  // USDC supports gasless approvals because it is an ERC-20 that supports Permit/Permit2
  const sellAmount = parseUnits("0.1", await usdc.read.decimals());

  // 1. fetch price
  const priceParams = new URLSearchParams({
    chainId: client.chain.id.toString(),
    sellToken: usdc.address,
    buyToken: weth.address,
    sellAmount: sellAmount.toString(),
  });

  const priceUrl = "https://api.0x.org/gasless/price?" + priceParams.toString();
  const priceResponse = await fetch(priceUrl, { headers });
  const price = await fetchJsonOrThrow(priceResponse);

  console.log("Fetching price to swap 0.1 USDC for WETH with Gasless API\n");
  console.log(priceUrl + "\n");
  console.log("🏷 priceResponse: ", price, "\n");

  // 2. fetch quote
  const quoteParams = new URLSearchParams({ taker: client.account.address });
  for (const [key, value] of priceParams.entries())
    quoteParams.append(key, value);

  const quoteUrl = "https://api.0x.org/gasless/quote?" + quoteParams.toString();
  const quoteResponse = await fetch(quoteUrl, { headers });
  const quote = await fetchJsonOrThrow(quoteResponse);

  console.log("Fetching quote to swap 0.1 USDC for WETH with Gasless API\n");
  console.log("💸 quoteResponse: ", quote, "\n");

  // 3. Check if token approval is required and if gasless approval is available
  const tokenApprovalRequired = quote.issues?.allowance != null;
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

    const tradeHash = await submitTrade(
      tradeDataToSubmit,
      approvalDataToSubmit
    ); // Function to submit trade
    return tradeHash;
  }

  // Helper functions
  async function signTradeObject(): Promise<any> {
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
    const approvalSplitSig = await splitSignature(object);
    const approvalDataToSubmit = {
      type: quote.approval.type,
      eip712: quote.approval.eip712,
      signature: {
        ...approvalSplitSig,
        v: Number(approvalSplitSig.v),
        signatureType: SignatureType.EIP712, // 2
      },
    };
    return approvalDataToSubmit;
  }

  async function tradeSplitSigDataToSubmit(object: any): Promise<any> {
    const tradeSplitSig = await splitSignature(object);
    const tradeDataToSubmit = {
      type: quote.trade.type, // "settler_metatransaction"
      eip712: quote.trade.eip712,
      signature: {
        ...tradeSplitSig,
        v: Number(tradeSplitSig.v),
        signatureType: SignatureType.EIP712, // 2
      },
    };
    return tradeDataToSubmit;
  }

  // 4. Make a POST request to submit trade with tradeObject (and approvalObject if available)
  async function submitTrade(
    tradeDataToSubmit: any,
    approvalDataToSubmit: any
  ): Promise<string | undefined> {
    try {
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
          "0x-api-key": ZERO_EX_API_KEY!,
          "0x-version": "v2",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await fetchJsonOrThrow(response);
      const successfulTradeHash = data.tradeHash as string | undefined;
      console.log("#️⃣ tradeHash: ", successfulTradeHash);
      return successfulTradeHash;
    } catch (error) {
      console.error("Error submitting the gasless swap\n", error);
    }
  }

  // 5. Check trade status
  async function fetchStatus(tradeHash: string) {
    const url =
      "https://api.0x.org/gasless/status/" +
      tradeHash +
      "?" +
      "chainId=" +
      client.chain.id.toString();

    const response = await fetch(url, { headers });
    return fetchJsonOrThrow(response);
  }

  async function fetchStatusPeriodically(tradeHash: string) {
    const intervalId = setInterval(async () => {
      try {
        const data = await fetchStatus(tradeHash);
        console.log("checks: ", data); // Handle or log the fetched data as needed

        if (data.status === "confirmed") {
          clearInterval(intervalId); // Stop interval if status is confirmed
          console.log("🎉 Transaction Completed!");
        }
      } catch (e) {
        // Surface intermittent API errors but keep polling for a bit
        console.error("status poll error:", e);
      }
    }, 3000);
    console.log("⏳ Transaction Pending");
    return intervalId;
  }

  async function startStatusCheck(successfulTradeHash: string | undefined) {
    if (successfulTradeHash) {
      const intervalId = await fetchStatusPeriodically(successfulTradeHash);
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
