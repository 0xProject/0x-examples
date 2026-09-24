import { fetchApiKey, ZEROEX_API_URL } from "./config";
import { SignatureVerificationError, signedFetch, verifySignedResponse } from "./verify";

// Sell 1 USDC for WETH on Base with AllowanceHolder.
const params = new URLSearchParams({
  chainId: "8453",
  sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  buyToken: "0x4200000000000000000000000000000000000006",
  sellAmount: "1000000",
  taker: "0x70a9f34f9b34c64957b9c401a97bfed35b95049e",
});

const { request, response } = await signedFetch({
  method: "GET",
  url: `${ZEROEX_API_URL}/swap/allowance-holder/quote?${params}`,
  headers: { "0x-api-key": fetchApiKey(), "0x-version": "v2" },
});

console.log(`📦 Quote received: HTTP ${response.status}, ${response.body.length} bytes`);
console.log(`🔏 Signature-Input: ${response.headers.get("signature-input")}`);

const verified = verifySignedResponse(request, response);
console.log(`✅ Signature valid, keyid ${verified.keyId}, created ${verified.created}`);

const quote = JSON.parse(response.body.toString());
console.log(`💰 Verified quote: ${quote.buyAmount} WETH base units for ${quote.sellAmount} USDC base units`);

// Tampering with the order parameters breaks the signature.
try {
  verifySignedResponse({ ...request, url: request.url.replace("sellAmount=1000000", "sellAmount=2000000") }, response);
  console.log("❌ Tampered request unexpectedly verified");
  process.exit(1);
} catch (e) {
  if (!(e instanceof SignatureVerificationError)) throw e;
  console.log(`🛡️ Tampered request rejected: ${e.message}`);
}
