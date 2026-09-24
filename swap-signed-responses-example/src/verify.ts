// Verifies RFC 9421 HTTP Message Signatures on 0x API responses.
// Depends only on node:crypto, so it can be copied into any Node.js project.

import { createHash, createPublicKey, verify, type JsonWebKey, type KeyObject } from "node:crypto";

// 0x response signing public keys, selected by the signature's `keyid`.
// Keys are rotated. Check the 0x docs at https://0x.org/docs for the current keys.
export const ZEROEX_PUBLIC_KEYS: Record<string, JsonWebKey> = {
  "0x-signing-key-prod-24092026": {
    kty: "OKP",
    crv: "Ed25519",
    x: "19P3C981JsyQsqwVho8Tlabx51rslvdruSH59mGuWn0",
  },
};

// Components every 0x signature must cover. POST requests must also cover "content-digest";req.
const REQUIRED_COMPONENTS = [
  "@status",
  "content-digest",
  "@method;req",
  "@authority;req",
  "@path;req",
  "@query;req",
];

export interface SignedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ReceivedResponse {
  status: number;
  headers: Headers;
  body: Buffer;
}

export interface VerifiedSignature {
  keyId: string;
  created: number;
  components: string[];
}

export class SignatureVerificationError extends Error {}

export function sha256ContentDigest(data: string | Buffer): string {
  return `sha-256=:${createHash("sha256").update(data).digest("base64")}:`;
}

// Sends a request that opts in to response signing and binds a POST body with Content-Digest.
export async function signedFetch(
  request: SignedRequest,
): Promise<{ request: SignedRequest; response: ReceivedResponse }> {
  const headers: Record<string, string> = {
    ...request.headers,
    "accept-signature": "sig=()",
  };
  if (request.body !== undefined) {
    headers["content-digest"] = sha256ContentDigest(request.body);
  }
  const sent = { ...request, headers };
  const res = await fetch(sent.url, { method: sent.method, headers, body: sent.body });
  const body = Buffer.from(await res.arrayBuffer());
  return { request: sent, response: { status: res.status, headers: res.headers, body } };
}

interface ParsedSignatureInput {
  components: { name: string; req: boolean }[];
  serializedParams: string;
  params: Record<string, string | number>;
}

function parseSignatureInput(header: string, label: string): ParsedSignatureInput {
  const prefix = `${label}=`;
  if (!header.startsWith(prefix)) {
    throw new SignatureVerificationError(`Signature-Input has no "${label}" signature`);
  }
  const serializedParams = header.slice(prefix.length);
  const match = serializedParams.match(/^\(([^)]*)\)(.*)$/);
  if (!match) {
    throw new SignatureVerificationError("Signature-Input is malformed");
  }
  const components = [...match[1].matchAll(/"([^"]+)"(;req)?/g)].map((m) => ({
    name: m[1],
    req: m[2] !== undefined,
  }));
  const params: Record<string, string | number> = {};
  for (const m of match[2].matchAll(/;([a-z]+)=(?:"([^"]*)"|(\d+))/g)) {
    params[m[1]] = m[2] !== undefined ? m[2] : Number(m[3]);
  }
  return { components, serializedParams, params };
}

function componentValue(
  component: { name: string; req: boolean },
  request: SignedRequest,
  response: ReceivedResponse,
): string {
  const url = new URL(request.url);
  if (component.req) {
    switch (component.name) {
      case "@method":
        return request.method.toUpperCase();
      case "@authority":
        return url.host.toLowerCase();
      case "@path":
        return url.pathname;
      case "@query":
        return url.search === "" ? "?" : url.search;
      default: {
        const value = request.headers[component.name.toLowerCase()];
        if (value === undefined) {
          throw new SignatureVerificationError(`request has no ${component.name} header`);
        }
        return value.trim();
      }
    }
  }
  if (component.name === "@status") {
    return String(response.status);
  }
  const value = response.headers.get(component.name);
  if (value === null) {
    throw new SignatureVerificationError(`response has no ${component.name} header`);
  }
  return value.trim();
}

// Throws SignatureVerificationError unless the response is signed by 0x for exactly this request.
export function verifySignedResponse(
  request: SignedRequest,
  response: ReceivedResponse,
  options: { keys?: Record<string, JsonWebKey>; maxAgeSeconds?: number; now?: number } = {},
): VerifiedSignature {
  const keys = options.keys ?? ZEROEX_PUBLIC_KEYS;
  const maxAgeSeconds = options.maxAgeSeconds ?? 60;
  const now = options.now ?? Math.floor(Date.now() / 1000);

  const signatureInput = response.headers.get("signature-input");
  const signature = response.headers.get("signature");
  if (!signatureInput || !signature) {
    throw new SignatureVerificationError("response is not signed");
  }
  const parsed = parseSignatureInput(signatureInput, "sig");

  // 1. The key must be one we trust, and the algorithm must be ed25519.
  const keyId = parsed.params.keyid;
  if (typeof keyId !== "string" || !(keyId in keys)) {
    throw new SignatureVerificationError(`unknown keyid ${String(keyId)}`);
  }
  if (parsed.params.alg !== "ed25519") {
    throw new SignatureVerificationError(`unexpected alg ${String(parsed.params.alg)}`);
  }

  // 2. The signature must be fresh.
  const created = parsed.params.created;
  if (typeof created !== "number" || now - created > maxAgeSeconds || created - now > maxAgeSeconds) {
    throw new SignatureVerificationError(`signature created at ${String(created)} is not fresh`);
  }

  // 3. The signature must cover the response and every part of the request that carries the order.
  const covered = parsed.components.map((c) => (c.req ? `${c.name};req` : c.name));
  const required = request.body !== undefined ? [...REQUIRED_COMPONENTS, "content-digest;req"] : REQUIRED_COMPONENTS;
  for (const name of required) {
    if (!covered.includes(name)) {
      throw new SignatureVerificationError(`signature does not cover ${name}`);
    }
  }

  // 4. The response body must match its Content-Digest, and a POST body must match the request's.
  if (response.headers.get("content-digest") !== sha256ContentDigest(response.body)) {
    throw new SignatureVerificationError("response body does not match Content-Digest");
  }
  if (request.body !== undefined && request.headers["content-digest"] !== sha256ContentDigest(request.body)) {
    throw new SignatureVerificationError("request body does not match its Content-Digest");
  }

  // 5. Rebuild the signature base and verify it against the key.
  const lines = parsed.components.map(
    (c) => `"${c.name}"${c.req ? ";req" : ""}: ${componentValue(c, request, response)}`,
  );
  lines.push(`"@signature-params": ${parsed.serializedParams}`);
  const signatureBase = lines.join("\n");

  const signatureMatch = signature.match(/^sig=:([A-Za-z0-9+/]+=*):$/);
  if (!signatureMatch) {
    throw new SignatureVerificationError("Signature is malformed");
  }
  const publicKey: KeyObject = createPublicKey({ key: keys[keyId], format: "jwk" });
  const valid = verify(null, Buffer.from(signatureBase), publicKey, Buffer.from(signatureMatch[1], "base64"));
  if (!valid) {
    throw new SignatureVerificationError("signature is invalid");
  }

  return { keyId, created, components: covered };
}
