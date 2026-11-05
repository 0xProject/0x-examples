import assert from "node:assert/strict";
import test from "node:test";
import { Challenge, Credential, Receipt } from "mppx";
import { loadConfig, resourceUrl } from "../src/config.js";
import { chargeMethod, paymentClient } from "../src/client.js";

// Public dummy key. No funded wallet or private .env is used by these tests.
const env = {
  PRIVATE_KEY: `0x${"01".repeat(32)}`,
  PAY_TO: "0x1111111111111111111111111111111111111111",
};
const config = loadConfig(env);
const hash = `0x${"ab".repeat(32)}`;

function challenge(overrides: Record<string, unknown> = {}, realm = "agent.api.0x.org") {
  return Challenge.from({
    id: "local-test-challenge", realm, method: "tempo", intent: "charge",
    expires: new Date(Date.now() + 300_000).toISOString(),
    request: {
      amount: "1000", currency: config.paymentToken, recipient: config.payTo,
      methodDetails: { chainId: 42431 }, ...overrides,
    },
  });
}

function required(value = challenge()) {
  return new Response("Payment required", { status: 402, headers: {
    "WWW-Authenticate": Challenge.serialize(value),
  } });
}

test("builds separate price and quote URLs, keeping payment and swap chains independent", () => {
  const price = new URL(resourceUrl(config, "price"));
  const quote = new URL(resourceUrl(config, "quote"));
  assert.equal(config.chain.id, 42431);
  assert.equal(price.searchParams.get("chainId"), "8453");
  assert.equal(price.searchParams.has("taker"), false);
  assert.equal(quote.pathname, "/v1/mpp-tempo-testnet/swap-allowance-holder-quote/");
  assert.equal(quote.searchParams.get("taker"), config.account.address);
  assert.throws(() => loadConfig({ ...env, CHAIN_ID: "4217" }), /mpp-tempo/);
  assert.equal(loadConfig({ ...env, CHAIN_ID: "4217", AGENTPAY_URL: "https://agent.api.0x.org/v1/mpp-tempo" }).chain.id, 4217);
});

test("MPP wrapper handles a 402, attaches a Payment credential, and returns the receipt", async () => {
  let calls = 0;
  let credentials = 0;
  const realMethod = chargeMethod(config);
  // Keep the real SDK challenge policy and HTTP negotiation. Mock only the
  // payment broadcast/credential creation so this test cannot move funds.
  const method: typeof realMethod = {
    ...realMethod,
    createCredential: async ({ challenge }) => {
      credentials++;
      return Credential.serialize({ challenge, payload: { type: "hash", hash } });
    },
  };
  const url = resourceUrl(config, "price");
  const mockFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    assert.equal(request.url, url);
    calls++;
    if (calls === 1) {
      assert.equal(request.headers.has("Authorization"), false);
      return required();
    }
    const credential = Credential.deserialize<{ hash: string; type: string }>(request.headers.get("Authorization")!);
    assert.equal(credential.challenge.method, "tempo");
    assert.equal(credential.payload.hash, hash);
    return new Response('{"liquidityAvailable":true}', { headers: {
      "Payment-Receipt": Receipt.serialize({ method: "tempo", reference: hash,
        status: "success", timestamp: new Date().toISOString() }),
    } });
  };
  const response = await paymentClient(config, mockFetch, method).fetch(url);
  assert.equal(response.status, 200);
  assert.equal(Receipt.deserialize(response.headers.get("Payment-Receipt")!).reference, hash);
  assert.equal(calls, 2);
  assert.equal(credentials, 1);
});

test("rejects wrong chain, currency, recipient and excessive charges before creating credentials", async () => {
  let credentials = 0;
  const realMethod = chargeMethod(config);
  const method: typeof realMethod = { ...realMethod, createCredential: async () => {
    credentials++;
    throw new Error("Must not create credential");
  } };
  for (const overrides of [
    { amount: "10001" },
    { currency: config.payTo },
    { recipient: "0x2222222222222222222222222222222222222222" },
    { methodDetails: { chainId: 4217 } },
  ]) {
    const mockFetch: typeof fetch = async () => required(challenge(overrides));
    await assert.rejects(paymentClient(config, mockFetch, method).fetch(resourceUrl(config, "price")), /No method found/);
  }
  assert.equal(credentials, 0);
});

test("rejects an unexpected realm and never creates a second payment after a paid retry", async () => {
  const realMethod = chargeMethod(config);
  let credentials = 0;
  const method: typeof realMethod = { ...realMethod, createCredential: async ({ challenge }) => {
    credentials++;
    return Credential.serialize({ challenge, payload: { type: "hash", hash } });
  } };
  const wrongRealm: typeof fetch = async () => required(challenge({}, "other.example.com"));
  await assert.rejects(paymentClient(config, wrongRealm, method).fetch(resourceUrl(config, "price")), /realm/);
  assert.equal(credentials, 0);
  let calls = 0;
  const stillUnpaid: typeof fetch = async () => { calls++; return required(); };
  const response = await paymentClient(config, stillUnpaid, method).fetch(resourceUrl(config, "price"));
  assert.equal(response.status, 402);
  assert.equal(credentials, 1);
  assert.equal(calls, 2);
});
