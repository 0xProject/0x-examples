import assert from "node:assert/strict";
import test from "node:test";
import { wrapFetchWithPayment } from "@x402/fetch";
import type { PaymentPayload, PaymentRequired, PaymentRequirements } from "@x402/core/types";
import { InMemoryClientChannelStorage } from "@x402/evm/batch-settlement/client";
import { loadConfig } from "../src/config.js";
import { batchClient, standardClient } from "../src/client.js";

// Public fixture key used only for local signing. Never fund this account.
const config = loadConfig({
  AGENTPAY_URL: "https://api.example.com/weather",
  PRIVATE_KEY: `0x${"01".repeat(32)}`,
  PAY_TO: "0x1111111111111111111111111111111111111111",
});

function requirements(scheme: string, overrides: Partial<PaymentRequirements> = {}): PaymentRequirements {
  return {
    scheme, network: config.network, asset: config.asset,
    amount: "100", payTo: config.payTo, maxTimeoutSeconds: 300,
    extra: { name: "USDC", version: "2", receiverAuthorizer: config.payTo, withdrawDelay: 86400 },
    ...overrides,
  };
}

function challenge(accepts: PaymentRequirements[]): PaymentRequired {
  return { x402Version: 2, resource: { url: config.url }, accepts };
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

test("standard 402 negotiation signs exact USDC and retries the identical URL", async () => {
  let calls = 0;
  const mockFetch: typeof fetch = async (input) => {
    const request = new Request(input);
    assert.equal(request.url, config.url);
    calls++;
    if (calls === 1) {
      assert.equal(request.headers.has("PAYMENT-SIGNATURE"), false);
      const required = challenge([
        requirements("exact", { extra: { name: "GatewayWalletBatched", version: "1" } }),
        requirements("batch-settlement"), requirements("exact"),
      ]);
      return new Response(JSON.stringify(required), {
        status: 402, headers: { "PAYMENT-REQUIRED": encode(required) },
      });
    }
    const payment: PaymentPayload = JSON.parse(Buffer.from(request.headers.get("PAYMENT-SIGNATURE")!, "base64").toString());
    assert.equal(payment.accepted.scheme, "exact");
    assert.equal(payment.accepted.network, config.network);
    assert.equal(payment.payload.signature?.toString().length, 132);
    assert.deepEqual(payment.payload.authorization && {
      from: (payment.payload.authorization as Record<string, string>).from,
      to: (payment.payload.authorization as Record<string, string>).to,
      value: (payment.payload.authorization as Record<string, string>).value,
    }, { from: config.account.address, to: config.payTo, value: "100" });
    return new Response('{"weather":"sunny"}');
  };
  const response = await wrapFetchWithPayment(mockFetch, standardClient(config, config.account))(config.url);
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("rejects unexpected recipients, prices, assets, networks and resource URLs before signing", async () => {
  let signatures = 0;
  const client = standardClient(config, {
    address: config.account.address,
    async signTypedData() { signatures++; throw new Error("Must not sign"); },
  });
  for (const override of [
    { payTo: "0x2222222222222222222222222222222222222222" },
    { amount: "10001" }, { amount: "-1" }, { amount: "0" },
    { asset: config.payTo }, { network: "eip155:8453" as const },
  ]) {
    await assert.rejects(client.createPaymentPayload(challenge([requirements("exact", override)])));
  }
  await assert.rejects(client.createPaymentPayload({
    ...challenge([requirements("exact")]), resource: { url: "https://other.example.com" },
  }), /resource URL/);
  assert.equal(signatures, 0);
});

test("batch makes one capped deposit then cumulative vouchers using settlement receipts", async () => {
  const storage = new InMemoryClientChannelStorage();
  const { client } = batchClient({ ...config, maxDeposit: 500n }, {
    ...config.account,
    // Mock an empty onchain channel. No RPC or transaction is sent.
    async readContract() { return [0n, 0n]; },
  }, storage);
  const payments: PaymentPayload[] = [];
  const mockFetch: typeof fetch = async (input) => {
    const request = new Request(input);
    const header = request.headers.get("PAYMENT-SIGNATURE");
    if (!header) {
      const required = challenge([
        requirements("exact"),
        requirements("batch-settlement", { extra: {
          name: "USDC", version: "2", receiverAuthorizer: config.payTo,
          withdrawDelay: 86400, minDeposit: "2000000",
        } }),
      ]);
      return new Response(JSON.stringify(required), {
        status: 402, headers: { "PAYMENT-REQUIRED": encode(required) },
      });
    }
    const payment: PaymentPayload = JSON.parse(Buffer.from(header, "base64").toString());
    payments.push(payment);
    assert.equal(payment.accepted.scheme, "batch-settlement");
    return new Response("ok", { headers: {
      "PAYMENT-RESPONSE": encode({
        success: true, network: config.network, transaction: "",
        extra: { chargedAmount: "100" },
      }),
    } });
  };
  const paidFetch = wrapFetchWithPayment(mockFetch, client);
  for (let i = 0; i < 3; i++) await paidFetch(config.url);
  assert.deepEqual(payments.map((p) => p.payload.type), ["deposit", "voucher", "voucher"]);
  assert.equal((payments[0].payload.deposit as { amount: string }).amount, "500");
  assert.deepEqual(payments.map((p) => (p.payload.voucher as { maxClaimableAmount: string }).maxClaimableAmount), ["100", "200", "300"]);
});

test("batch refuses to fall back to exact and refuses a deposit above its cap", async () => {
  let signatures = 0;
  const { client } = batchClient({ ...config, maxDeposit: 99n }, {
    address: config.account.address,
    async readContract() { return [0n, 0n]; },
    async signTypedData() { signatures++; throw new Error("Must not sign"); },
  }, new InMemoryClientChannelStorage());
  await assert.rejects(client.createPaymentPayload(challenge([requirements("exact")])));
  await assert.rejects(client.createPaymentPayload(challenge([requirements("batch-settlement")])), /MAX_DEPOSIT_AMOUNT/);
  assert.equal(signatures, 0);
});
