import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";
import { selectRequest } from "../src/commands.js";
import { swapSettings } from "../src/swap.js";

const params = {
  chainId: "8453", sellToken: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  buyToken: "0x4200000000000000000000000000000000000006", sellAmount: "1000000",
};
const env = {
  PRIVATE_KEY: `0x${"01".repeat(32)}`, PAY_TO: "0x1111111111111111111111111111111111111111",
  X402_BASE_URL: "https://agent.api.0x.org/v1/x402-testnet/", SWAP_PARAMS: JSON.stringify(params),
};

test("base URL stays resource-agnostic until a command selects its route and parameters", () => {
  const config = loadConfig(env);
  assert.equal(config.url, "https://agent.api.0x.org/v1/x402-testnet");
  for (const resource of ["price", "quote"] as const) {
    const url = new URL(selectRequest(config, resource).url);
    assert.equal(url.pathname, `/v1/x402-testnet/swap-allowance-holder-${resource}`);
    for (const [key, value] of Object.entries(params)) assert.equal(url.searchParams.get(key), value);
    assert.equal(url.searchParams.get("taker"), resource === "quote" ? config.account.address : null);
  }
});

test("legacy request URLs still work, while the new base URL takes precedence without mixing settings", () => {
  const legacyUrl = `https://agent.api.0x.org/v1/x402-testnet/swap-allowance-holder-price?${new URLSearchParams(params)}`;
  const legacy = loadConfig({ PRIVATE_KEY: env.PRIVATE_KEY, PAY_TO: env.PAY_TO, AGENTPAY_URL: legacyUrl });
  const modern = loadConfig({ ...env, AGENTPAY_URL: "https://ignored.example/legacy?secret=do-not-copy" });
  assert.equal(selectRequest(legacy, "quote").url, selectRequest(modern, "quote").url);
  assert.throws(() => selectRequest(loadConfig({ ...env, SWAP_PARAMS: undefined, AGENTPAY_URL: legacyUrl }), "price"), /SWAP_PARAMS/);
});

test("base URL rejects endpoints, query parameters, credentials, unsupported origins, and payment-chain mismatches", () => {
  for (const url of ["http://agent.api.0x.org/v1/x402-testnet", "https://other.example/v1/x402-testnet",
    "https://agent.api.0x.org/v1/x402", "https://agent.api.0x.org/v1/x402-testnet?chainId=8453",
    "https://agent.api.0x.org/v1/x402-testnet/swap-allowance-holder-price", "https://user:pass@agent.api.0x.org/v1/x402-testnet",
    "https://agent.api.0x.org/v1/x402-testnet#fragment"]) {
    assert.throws(() => loadConfig({ ...env, X402_BASE_URL: url }), /X402_BASE_URL/);
  }
  assert.equal(loadConfig({ ...env, CHAIN_ID: "8453", X402_BASE_URL: "https://agent.api.0x.org/v1/x402" }).chain.id, 8453);
});

test("cross-chain requests do not require SWAP_PARAMS or inherit same-chain query parameters", () => {
  const config = loadConfig({ ...env, SWAP_PARAMS: "invalid JSON, deliberately unused" });
  assert.equal(selectRequest(config, "cross-chain-sources", {}).url, `${config.baseUrl}/cross-chain-sources`);
  const cross = { originChain: "8453", destinationChain: "42161", sellToken: "USDC", buyToken: "USDC", sellAmount: "1000000", originAddress: config.account.address };
  const url = new URL(selectRequest(config, "cross-chain-quotes", { CROSS_CHAIN_PARAMS: JSON.stringify(cross) }).url);
  assert.equal(url.searchParams.has("chainId"), false);
  assert.equal(url.searchParams.get("destinationChain"), "42161");
  for (const raw of ["[]", "null", "bad JSON", "{}", JSON.stringify({ ...params, sellAmount: 1000000 })]) {
    assert.throws(() => selectRequest(loadConfig({ ...env, SWAP_PARAMS: raw }), "price"), /SWAP_PARAMS/);
  }
});

test("full swap resolves both routes from the base URL without losing the validated taker or slippage", () => {
  const config = loadConfig({ ...env, SWAP_PARAMS: JSON.stringify({ ...params, slippageBps: "200" }) });
  const settings = swapSettings(config, { SLIPPAGE_BPS: "75" });
  for (const [resource, selected] of [["price", settings.price], ["quote", settings.quote]] as const) {
    const url = new URL(selected.url);
    assert.equal(url.pathname, `/v1/x402-testnet/swap-allowance-holder-${resource}`);
    assert.equal(url.searchParams.get("slippageBps"), "75");
    assert.equal(url.searchParams.get("taker"), config.account.address);
  }
  assert.equal(settings.sellAmount, 1000000n);
});
