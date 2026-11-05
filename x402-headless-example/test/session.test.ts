import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryClientChannelStorage } from "@x402/evm/batch-settlement/client";
import type { PaymentPayload, PaymentRequired, PaymentRequirements } from "@x402/core/types";
import { loadConfig } from "../src/config.js";
import { batchClient, paidGet, standardClient } from "../src/client.js";

const config = loadConfig({
  PRIVATE_KEY: `0x${"01".repeat(32)}`, PAY_TO: "0x1111111111111111111111111111111111111111",
  AGENTPAY_URL: "https://api.example.com/price", MAX_DEPOSIT_AMOUNT: "500",
});
const urls = [config.url, "https://api.example.com/quote"];
const session = { urls, maxTotalPayment: 200n, maxTotalDeposit: 500n };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");

function requirement(scheme: string): PaymentRequirements {
  return { scheme, network: config.network, asset: config.asset, payTo: config.payTo,
    amount: "100", maxTimeoutSeconds: 300,
    extra: { name: "USDC", version: "2", receiverAuthorizer: config.payTo, withdrawDelay: 86400 } };
}

function required(scheme: string, url: string): PaymentRequired {
  return { x402Version: 2, resource: { url }, accepts: [requirement(scheme)] };
}

test("one batch session reuses its deposit and advances vouchers from price to quote", async () => {
  const signer = { ...config.account, async readContract() { return [0n, 0n]; } };
  const { client } = batchClient(config, signer, new InMemoryClientChannelStorage(), session);
  const payments: PaymentPayload[] = [];
  const mockFetch: typeof fetch = async (input) => {
    const request = new Request(input);
    const header = request.headers.get("PAYMENT-SIGNATURE");
    if (!header) return new Response("", { status: 402, headers: {
      "PAYMENT-REQUIRED": encode(required("batch-settlement", request.url)),
    } });
    payments.push(JSON.parse(Buffer.from(header, "base64").toString()));
    return new Response('{"liquidityAvailable":true}', { headers: {
      "PAYMENT-RESPONSE": encode({ success: true, network: config.network, transaction: "",
        extra: { chargedAmount: "100" } }),
    } });
  };
  for (const url of urls) {
    const result = await paidGet(url, client, mockFetch);
    assert.deepEqual(result.data, { liquidityAvailable: true });
    assert.equal(result.receipt?.success, true);
  }
  assert.deepEqual(payments.map((p) => p.payload.type), ["deposit", "voucher"]);
  const vouchers = payments.map((p) => p.payload.voucher as { channelId: string; maxClaimableAmount: string });
  assert.equal(vouchers[0].channelId, vouchers[1].channelId);
  assert.deepEqual(vouchers.map((v) => v.maxClaimableAmount), ["100", "200"]);
  await assert.rejects(client.createPaymentPayload(required("batch-settlement", urls[1])), /budget/);
});

test("standard session accepts its two URLs but rejects unrelated URLs and a third authorization", async () => {
  const client = standardClient(config, config.account, session);
  await assert.rejects(client.createPaymentPayload(required("exact", "https://api.example.com/other")), /resource URL/);
  await client.createPaymentPayload(required("exact", urls[0]));
  await client.createPaymentPayload(required("exact", urls[1]));
  await assert.rejects(client.createPaymentPayload(required("exact", urls[1])), /budget/);
});

test("total deposit budget is shared across different batch channels", async () => {
  const { client } = batchClient(config, { ...config.account, async readContract() { return [0n, 0n]; } },
    new InMemoryClientChannelStorage(), session);
  await client.createPaymentPayload(required("batch-settlement", urls[0]));
  const quote = required("batch-settlement", urls[1]);
  quote.accepts[0].extra!.receiverAuthorizer = "0x2222222222222222222222222222222222222222";
  await assert.rejects(client.createPaymentPayload(quote), /deposit budget/);
});

test("paidGet returns an HTTP error without treating a receipt as a successful API response", async () => {
  const client = standardClient(config, config.account);
  const mockFetch: typeof fetch = async () => new Response('{"error":"backend unavailable"}', {
    status: 503, headers: { "PAYMENT-RESPONSE": encode({ success: true, network: config.network,
      transaction: `0x${"ab".repeat(32)}` }) },
  });
  await assert.rejects(paidGet(config.url, client, mockFetch), /HTTP 503/);
});
