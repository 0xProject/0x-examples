import assert from "node:assert/strict";
import test from "node:test";
import type { Hex } from "viem";
import { loadConfig } from "../src/config.js";
import { parseArgs } from "../src/commands.js";
import {
  BASE_USDC, BASE_WETH, BASE_ALLOWANCE_HOLDER,
  boundedGas, executeSwap, swapSettings, validateSwapResponse,
  type SwapActions,
} from "../src/swap.js";

// Public dummy key. Every wallet/RPC/API operation in these tests is mocked.
const config = loadConfig({
  PRIVATE_KEY: `0x${"01".repeat(32)}`, CHAIN_ID: "8453",
  PAY_TO: "0x1111111111111111111111111111111111111111",
  AGENTPAY_URL: `https://agent.api.0x.org/v1/x402/swap-allowance-holder-price?chainId=8453&sellToken=${BASE_USDC}&buyToken=${BASE_WETH}&sellAmount=1000000`,
});
const settings = swapSettings(config, {});
const approvalHash = `0x${"aa".repeat(32)}` as Hex;
const swapHash = `0x${"bb".repeat(32)}` as Hex;

function response(firm: boolean) {
  return {
    liquidityAvailable: true, sellToken: BASE_USDC, buyToken: BASE_WETH,
    sellAmount: "1000000", buyAmount: "400000000000000", minBuyAmount: "396000000000000",
    allowanceTarget: BASE_ALLOWANCE_HOLDER,
    issues: { allowance: firm ? null : { actual: "0", spender: BASE_ALLOWANCE_HOLDER },
      balance: null, simulationIncomplete: false, invalidSourcesPassed: [] },
    ...(firm ? { transaction: { to: BASE_ALLOWANCE_HOLDER, data: "0x12345678", value: "0" } } : {}),
  };
}

function harness(initialAllowance = 0n) {
  const events: string[] = [];
  let allowance = initialAllowance;
  const actions: SwapActions = {
    chainId: async () => 8453,
    tokenBalance: async () => 10_000_000n,
    ethBalance: async () => settings.maxGasCost * 2n,
    allowance: async () => allowance,
    approve: async (spender, amount) => {
      events.push("approve");
      assert.equal(spender, BASE_ALLOWANCE_HOLDER);
      assert.equal(amount, settings.sellAmount); // exact amount, never infinite
      return approvalHash;
    },
    wait: async (hash) => {
      events.push(hash === approvalHash ? "approval-confirmed" : "swap-confirmed");
      if (hash === approvalHash) allowance = settings.sellAmount;
      return { status: "success" };
    },
    sendSwap: async (tx, deadline) => {
      events.push("swap");
      assert.equal(tx.to, BASE_ALLOWANCE_HOLDER);
      assert.equal(tx.value, 0n);
      assert.equal(tx.data, "0x12345678");
      assert.ok(deadline > Date.now());
      return swapHash;
    },
  };
  const request = async (resource: "price" | "quote") => {
    events.push(resource);
    return response(resource === "quote");
  };
  return { events, actions, request };
}

test("swap commands are explicit and cannot be combined with refund", () => {
  assert.deepEqual(parseArgs(["swap"]), { resource: "swap", refund: false });
  assert.deepEqual(parseArgs(["swap"], true), { resource: "swap", refund: false });
  assert.throws(() => parseArgs(["swap", "--refund"], true), /refund/);
});

test("swap settings pin Base USDC/WETH, taker and limits; price and quote carry the same parameters", () => {
  const price = new URL(settings.price.url);
  const quote = new URL(settings.quote.url);
  assert.equal(price.searchParams.get("taker"), config.account.address);
  assert.equal(price.searchParams.get("slippageBps"), "100");
  assert.equal(price.search, quote.search);
  for (const env of [{ MAX_SELL_AMOUNT: "999999" }, { SLIPPAGE_BPS: "501" }]) {
    assert.throws(() => swapSettings(config, env));
  }
  assert.throws(() => swapSettings({ ...config, taker: config.payTo }, {}), /taker/);
  assert.throws(() => swapSettings({ ...config, url: config.url.replace("chainId=8453", "chainId=84532") }, {}), /Base mainnet/);
  assert.throws(() => swapSettings({ ...config, url: `${config.url}&recipient=${config.payTo}` }, {}), /Unsupported/);
  assert.throws(() => swapSettings({ ...config, url: config.url.replace("agent.api.0x.org", "example.com") }, {}), /agent.api/);
});

for (const mode of ["standard", "batch"] as const) {
  test(`${mode}: price -> exact approval -> confirmed receipt -> quote -> swap`, async () => {
    const h = harness();
    const result = await executeSwap(config, mode, settings, h.actions, h.request);
    assert.deepEqual(h.events, ["price", "approve", "approval-confirmed", "quote", "swap", "swap-confirmed"]);
    assert.equal(result.swapHash, swapHash);
    assert.equal(result.approvalHash, approvalHash);
  });
}

test("skips approval when the onchain allowance already covers the trade", async () => {
  const h = harness(settings.sellAmount);
  const result = await executeSwap(config, "standard", settings, h.actions, h.request);
  assert.equal(result.approvalHash, undefined);
  assert.deepEqual(h.events, ["price", "quote", "swap", "swap-confirmed"]);
});

test("preflight reserves API payments or batch deposits as well as the sell amount and gas", async () => {
  for (const mode of ["standard", "batch"] as const) {
    const h = harness();
    const reserve = mode === "standard" ? config.maxPayment * 2n : config.maxDeposit;
    h.actions.tokenBalance = async () => settings.sellAmount + reserve - 1n;
    await assert.rejects(executeSwap(config, mode, settings, h.actions, h.request), /Insufficient Base USDC/);
    assert.deepEqual(h.events, []);
  }
  const h = harness();
  h.actions.ethBalance = async () => 0n;
  await assert.rejects(executeSwap(config, "standard", settings, h.actions, h.request), /Base ETH/);
  h.actions.chainId = async () => 1;
  await assert.rejects(executeSwap(config, "standard", settings, h.actions, h.request), /Base mainnet/);
});

test("failed approval or API request stops the workflow without submitting a swap", async () => {
  const h = harness();
  h.actions.wait = async () => ({ status: "reverted" });
  await assert.rejects(executeSwap(config, "standard", settings, h.actions, h.request), /Approval reverted/);
  assert.deepEqual(h.events, ["price", "approve"]);
  const h2 = harness();
  await assert.rejects(executeSwap(config, "batch", settings, h2.actions, async (resource) => {
    if (resource === "quote") throw new Error("API payment failed");
    return h2.request(resource);
  }), /API payment failed/);
  assert.equal(h2.events.includes("swap"), false);
});

test("rejects mismatched, illiquid, unresolved, or unsafe price/quote responses", () => {
  const changes = [
    { liquidityAvailable: false }, { sellAmount: "2000000" }, { buyToken: config.payTo },
    { allowanceTarget: config.payTo }, { minBuyAmount: "1" },
    { issues: { ...response(true).issues, balance: {} } },
    { issues: { ...response(true).issues, simulationIncomplete: true } },
    { issues: { ...response(true).issues, allowance: { actual: "0", spender: config.payTo } } },
    { transaction: { to: config.payTo, data: "0x12345678", value: "0" } },
    { transaction: { to: BASE_ALLOWANCE_HOLDER, data: "0x12345678", value: "1" } },
  ];
  for (const change of changes) assert.throws(() => validateSwapResponse({ ...response(true), ...change }, settings, true));
});

test("stale quotes and post-payment balance changes stop execution", async () => {
  const h = harness(settings.sellAmount);
  let calls = 0;
  await assert.rejects(executeSwap(config, "standard", settings, h.actions, h.request,
    () => ++calls === 1 ? 0 : 30_001), /stale/);
  assert.equal(h.events.includes("swap"), false);
  const h2 = harness(settings.sellAmount);
  let balanceReads = 0;
  h2.actions.tokenBalance = async () => ++balanceReads === 1 ? 10_000_000n : 0n;
  await assert.rejects(executeSwap(config, "batch", settings, h2.actions, h2.request), /after API/);
  assert.equal(h2.events.includes("swap"), false);
});

test("a reverted swap is reported and never automatically resubmitted", async () => {
  const h = harness(settings.sellAmount);
  h.actions.wait = async () => ({ status: "reverted" });
  await assert.rejects(executeSwap(config, "standard", settings, h.actions, h.request), /Swap reverted/);
  assert.equal(h.events.filter((event) => event === "swap").length, 1);
});

test("a worse quote minimum than the accepted indicative price stops execution", async () => {
  const h = harness(settings.sellAmount);
  await assert.rejects(executeSwap(config, "standard", settings, h.actions, async (resource) => {
    const result = response(resource === "quote");
    if (resource === "quote") { result.buyAmount = "390000000000000"; result.minBuyAmount = "386100000000000"; }
    return result;
  }), /minimum output/);
  assert.equal(h.events.includes("swap"), false);
});

test("gas limit includes a buffer and enforces the cost cap and available ETH", () => {
  assert.equal(boundedGas(101n, 2n, 1000n, 1000n), 122n);
  assert.throws(() => boundedGas(100n, 2n, 1000n, 239n), /MAX_GAS_COST/);
  assert.throws(() => boundedGas(100n, 2n, 239n, 1000n), /Insufficient ETH/);
});
