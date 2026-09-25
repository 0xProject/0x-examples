# 0x Signed Responses Example

This TypeScript project shows how to request and verify signed responses from the 0x Swap, Solana and Cross-Chain APIs. A valid signature proves that the response came from 0x and that it answers the exact request you sent, so a quote cannot be altered in transit or reused for a different order.

Responses are signed with [RFC 9421 HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421) using Ed25519.

## Example Output

```bash
➜  swap-signed-responses-example git:(main) npm run evm

📦 Quote received: HTTP 200, 5402 bytes
🔏 Signature-Input: sig=("@status" "content-type" "content-digest" "@method";req "@authority";req "@path";req "@query";req);created=1790267249;keyid="0x-signing-key-prod-24092026";alg="ed25519";tag="0x-swap-api"
✅ Signature valid, keyid 0x-signing-key-prod-24092026, created 1790267249
💰 Verified quote: 370995023701508 WETH base units for 1000000 USDC base units
🛡️ Tampered request rejected: signature is invalid
```

```bash
➜  swap-signed-responses-example git:(main) npm run solana

📦 Swap instructions received: HTTP 200, 5966 bytes
🔏 Signature-Input: sig=("@status" "content-type" "content-digest" "@method";req "@authority";req "@path";req "@query";req "content-digest";req);created=1790267250;keyid="0x-signing-key-prod-24092026";alg="ed25519";tag="0x-swap-api"
✅ Signature valid, keyid 0x-signing-key-prod-24092026, created 1790267250
💰 Verified quote: 117011 USDC base units, minimum 115840
🛡️ Different order rejected: request body does not match its Content-Digest
```

```bash
➜  swap-signed-responses-example git:(main) npm run cross-chain

📦 Cross-chain quotes received: HTTP 200, 16336 bytes
🔏 Signature-Input: sig=("@status" "content-type" "content-digest" "@method";req "@authority";req "@path";req "@query";req);created=1790346365;keyid="0x-signing-key-prod-24092026";alg="ed25519";tag="0x-swap-api"
✅ Signature valid, keyid 0x-signing-key-prod-24092026, created 1790346365
💰 Verified 3 quotes, best: 4986045 USDC base units on Arbitrum for 5 USDC on Base
🛡️ Tampered request rejected: signature is invalid
```

## What It Does

- `npm run evm` requests an AllowanceHolder quote on Base, verifies its signature, and shows that changing `sellAmount` afterwards breaks verification.
- `npm run solana` requests Solana swap instructions, binds the request body with a `Content-Digest` header, verifies the signature, and shows that the response cannot be reused for a different order.
- `npm run cross-chain` requests cross-chain quotes from Base to Arbitrum, verifies their signature, and shows that changing `sellAmount` afterwards breaks verification.

[`src/verify.ts`](./src/verify.ts) has no dependencies beyond `node:crypto` and can be copied into your own project.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a `.env` File

Copy the example from [.env.example](./.env.example) into a new `.env` file:

| Variable Name    | Description                                                                 | Required |
| ---------------- | --------------------------------------------------------------------------- | -------- |
| `ZEROEX_API_KEY` | Your 0x API key. Get one from the [0x Dashboard](https://dashboard.0x.org). | ✅       |

### 3. Run the Examples

```bash
npm run evm
npm run solana
npm run cross-chain
```

## How Signing Works

Signing is opt-in per request. Send an `Accept-Signature` header and the response carries three extra headers:

```
Content-Digest: sha-256=:<base64 sha-256 of the response body>:
Signature-Input: sig=("@status" "content-type" "content-digest" "@method";req "@authority";req "@path";req "@query";req);created=...;keyid="...";alg="ed25519";tag="0x-swap-api"
Signature: sig=:<base64 ed25519 signature>:
```

The signature covers the response status, content type and body digest, plus the method, host, path and query of your request. For `POST` requests, such as Solana swap instructions, send a `Content-Digest` header with the sha-256 of your request body. The signature then covers it too. 0x checks the header against the body and returns `400` if they do not match.

## Verifying a Response

`verifySignedResponse` in [`src/verify.ts`](./src/verify.ts) performs these checks, and rejects the response if any of them fails:

1. The `keyid` is a known 0x key and `alg` is `ed25519`.
2. `created` is recent, within 60 seconds by default.
3. The signature covers `@status`, `content-digest` and the request's `@method`, `@authority`, `@path` and `@query`, plus the request's `content-digest` for `POST` requests.
4. The response body matches its `Content-Digest`, and a `POST` body matches the request's `Content-Digest`.
5. The Ed25519 signature is valid over the signature base rebuilt from the request and response.

A signature binds a response to the request's parameters, not to a single request. The same signed response could be returned again for an identical request. The freshness check in step 2 limits that to responses at most 60 seconds old.

## 🔑 Public Keys

Signatures are made with the key named by `keyid`. The current key is pinned in [`src/verify.ts`](./src/verify.ts):

```json
{
  "kty": "OKP",
  "crv": "Ed25519",
  "kid": "0x-signing-key-prod-24092026",
  "x": "19P3C981JsyQsqwVho8Tlabx51rslvdruSH59mGuWn0"
}
```

Keys are rotated. Always check the [0x docs](https://0x.org/docs) for the current keys before pinning one.

## 📝 Notes

- Responses rejected before reaching the API, such as invalid API keys or rate limits, are not signed.
- Streaming endpoints such as `/cross-chain/quotes/stream` are not signed. Do not send `Accept-Signature` to them.
- Token addresses and amounts are hardcoded for simplicity.
