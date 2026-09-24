import { fetchApiKey, ZEROEX_API_URL } from "./config";
import { SignatureVerificationError, signedFetch, verifySignedResponse } from "./verify";

// Sell 0.001 SOL for USDC. The order is in the POST body, which is bound to the
// signature through the request's Content-Digest header.
const body = JSON.stringify({
  token_in: "So11111111111111111111111111111111111111112",
  token_out: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  amount_in: 1000000,
  slippage_bps: 100,
  taker: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
});

const { request, response } = await signedFetch({
  method: "POST",
  url: `${ZEROEX_API_URL}/solana/swap-instructions`,
  headers: { "0x-api-key": fetchApiKey(), "content-type": "application/json" },
  body,
});

console.log(`📦 Swap instructions received: HTTP ${response.status}, ${response.body.length} bytes`);
console.log(`🔏 Signature-Input: ${response.headers.get("signature-input")}`);

const verified = verifySignedResponse(request, response);
console.log(`✅ Signature valid, keyid ${verified.keyId}, created ${verified.created}`);

const instructions = JSON.parse(response.body.toString());
console.log(`💰 Verified quote: ${instructions.amount_out} USDC base units, minimum ${instructions.min_amount_out}`);

// A response cannot be reused for a different order body.
const otherBody = body.replace('"amount_in":1000000', '"amount_in":2000000');
try {
  verifySignedResponse({ ...request, body: otherBody }, response);
  console.log("❌ Different order unexpectedly verified");
  process.exit(1);
} catch (e) {
  if (!(e instanceof SignatureVerificationError)) throw e;
  console.log(`🛡️ Different order rejected: ${e.message}`);
}
