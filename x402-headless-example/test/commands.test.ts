import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs, selectResource } from "../src/commands.js";
import { loadConfig } from "../src/config.js";
import { standardClient } from "../src/client.js";

const env = {
  PRIVATE_KEY: `0x${"01".repeat(32)}`,
  PAY_TO: "0x1111111111111111111111111111111111111111",
  AGENTPAY_URL: "https://agent.api.0x.org/v1/x402-testnet/swap-allowance-holder-price?chainId=8453&sellToken=USDC&buyToken=WETH&sellAmount=1000000",
};

test("commands default to price and accept explicit resources and batch refunds", () => {
  assert.deepEqual(parseArgs([]), { resource: "price", refund: false });
  assert.deepEqual(parseArgs(["quote"]), { resource: "quote", refund: false });
  assert.deepEqual(parseArgs(["price", "--refund"], true), { resource: "price", refund: true });
  assert.deepEqual(parseArgs(["quote", "--refund"], true), { resource: "quote", refund: true });
  assert.deepEqual(parseArgs(["--refund"], true), { resource: "price", refund: true });
  for (const args of [["qu ote"], ["price", "quote"], ["--refund"], ["--unknown"]]) {
    assert.throws(() => parseArgs(args), /Usage/);
  }
});

test("selects either route without changing origin, payment channel, or swap parameters", () => {
  const config = loadConfig(env);
  const quote = selectResource(config, "quote");
  const url = new URL(quote.url);
  assert.equal(url.origin, "https://agent.api.0x.org");
  assert.equal(url.pathname, "/v1/x402-testnet/swap-allowance-holder-quote");
  assert.equal(url.searchParams.get("chainId"), "8453");
  assert.equal(url.searchParams.get("sellAmount"), "1000000");
  assert.equal(url.searchParams.get("taker"), config.account.address);
  assert.equal(config.url, env.AGENTPAY_URL);
  assert.equal(selectResource(config, "price").url, config.url);
  assert.equal(new URL(selectResource(quote, "price").url).pathname, "/v1/x402-testnet/swap-allowance-holder-price");
  const trailing = loadConfig({ ...env, AGENTPAY_URL: env.AGENTPAY_URL.replace("price?", "price/?") });
  assert.equal(new URL(selectResource(trailing, "quote").url).pathname, "/v1/x402-testnet/swap-allowance-holder-quote/");
});

test("quote taker uses env override, then URL, then payer; rejects invalid takers or routes", () => {
  const urlTaker = "0x2222222222222222222222222222222222222222";
  const envTaker = "0x3333333333333333333333333333333333333333";
  const withTaker = { ...env, AGENTPAY_URL: `${env.AGENTPAY_URL}&taker=${urlTaker}` };
  assert.equal(new URL(selectResource(loadConfig(withTaker), "quote").url).searchParams.get("taker"), urlTaker);
  assert.equal(new URL(selectResource(loadConfig({ ...withTaker, TAKER: envTaker }), "quote").url).searchParams.get("taker"), envTaker);
  assert.throws(() => selectResource(loadConfig({ ...env, TAKER: "invalid" }), "quote"), /taker/);
  assert.throws(() => selectResource(loadConfig({ ...env, AGENTPAY_URL: "https://example.com/other" }), "price"), /endpoint/);
});

test("payment policy binds to the selected quote URL including its taker", async () => {
  const config = selectResource(loadConfig(env), "quote");
  const client = standardClient(config, config.account);
  const required = {
    x402Version: 2, resource: { url: config.url }, accepts: [{
      scheme: "exact", network: config.network, amount: "100", asset: config.asset,
      payTo: config.payTo, maxTimeoutSeconds: 300, extra: { name: "USDC", version: "2" },
    }],
  };
  const payment = await client.createPaymentPayload(required);
  assert.equal(payment.resource?.url, config.url);
  await assert.rejects(client.createPaymentPayload({ ...required, resource: { url: env.AGENTPAY_URL } }), /resource URL/);
});
