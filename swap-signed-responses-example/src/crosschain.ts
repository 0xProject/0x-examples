import { fetchApiKey, ZEROEX_API_URL } from "./config";
import { SignatureVerificationError, signedFetch, verifySignedResponse } from "./verify";

// Bridge 5 USDC from Base to Arbitrum.
const params = new URLSearchParams({
  originChain: "8453",
  destinationChain: "42161",
  sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  buyToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  sellAmount: "5000000",
  originAddress: "0x56EB0aD2dC746540Fab5C02478B31e2AA9DdC38C",
  destinationAddress: "0x56EB0aD2dC746540Fab5C02478B31e2AA9DdC38C",
  sortQuotesBy: "price",
});

const { request, response } = await signedFetch({
  method: "GET",
  url: `${ZEROEX_API_URL}/cross-chain/quotes?${params}`,
  headers: { "0x-api-key": fetchApiKey() },
});

console.log(`📦 Cross-chain quotes received: HTTP ${response.status}, ${response.body.length} bytes`);
console.log(`🔏 Signature-Input: ${response.headers.get("signature-input")}`);

const verified = verifySignedResponse(request, response);
console.log(`✅ Signature valid, keyid ${verified.keyId}, created ${verified.created}`);

const { quotes } = JSON.parse(response.body.toString());
console.log(`💰 Verified ${quotes.length} quotes, best: ${quotes[0]?.buyAmount} USDC base units on Arbitrum for 5 USDC on Base`);

// Tampering with the order parameters breaks the signature.
try {
  verifySignedResponse({ ...request, url: request.url.replace("sellAmount=5000000", "sellAmount=6000000") }, response);
  console.log("❌ Tampered request unexpectedly verified");
  process.exit(1);
} catch (e) {
  if (!(e instanceof SignatureVerificationError)) throw e;
  console.log(`🛡️ Tampered request rejected: ${e.message}`);
}
