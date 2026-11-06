import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs, selectRequest } from "../src/commands.js";
import { loadConfig } from "../src/config.js";
import { crossChainResources } from "../src/cross-chain.js";
import { standardClient } from "../src/client.js";
import { paidQuoteStream, readQuoteStream } from "../src/stream.js";

const env = {
  PRIVATE_KEY: `0x${"01".repeat(32)}`, PAY_TO: "0x1111111111111111111111111111111111111111",
  AGENTPAY_URL: "https://agent.api.0x.org/v1/x402-testnet/swap-allowance-holder-price?chainId=8453&sellToken=OLD&sellAmount=1000000",
};
const params = {
  originChain: "8453", destinationChain: "42161", sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  buyToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", sellAmount: "1000000",
  originAddress: "0x2222222222222222222222222222222222222222", sortQuotesBy: "price",
};
const crossEnv = { CROSS_CHAIN_PARAMS: JSON.stringify(params),
  CROSS_CHAIN_STATUS_PARAMS: JSON.stringify({ originChain: "8453", originTxHash: "0xexample", quoteId: "example-id" }) };

test("all cross-chain resources work with standard, batch, and explicit refunds", () => {
  for (const resource of crossChainResources) {
    assert.deepEqual(parseArgs([resource]), { resource, refund: false });
    assert.deepEqual(parseArgs([resource, "--refund"], true), { resource, refund: true });
    assert.throws(() => parseArgs([resource, "price"]), /Usage/);
  }
});

test("cross-chain selection preserves payment channel, separates queries, and does not modify config", () => {
  const config = loadConfig(env);
  for (const resource of crossChainResources) {
    const selected = selectRequest(config, resource, crossEnv);
    const url = new URL(selected.url);
    assert.equal(url.origin, "https://agent.api.0x.org");
    assert.equal(url.pathname, `/v1/x402-testnet/${resource}`);
    assert.equal(url.searchParams.has("chainId"), false);
    assert.equal(selected.account, config.account);
    if (resource === "cross-chain-status") assert.equal(url.searchParams.get("quoteId"), "example-id");
    else if (resource === "cross-chain-sources") assert.equal(url.search, "");
    else {
      assert.equal(url.searchParams.get("originAddress"), params.originAddress);
      assert.equal(url.searchParams.get("sellAmount"), "1000000");
      assert.equal(url.searchParams.has("sortQuotesBy"), resource === "cross-chain-quotes");
    }
  }
  assert.equal(config.url, env.AGENTPAY_URL);
  const mainnet = loadConfig({ ...env, CHAIN_ID: "8453", AGENTPAY_URL: env.AGENTPAY_URL.replace("x402-testnet", "x402") });
  assert.equal(new URL(selectRequest(mainnet, "cross-chain-sources", {}).url).pathname, "/v1/x402/cross-chain-sources");
});

test("cross-chain inputs fail before payment when missing, malformed, imprecise, or on a mismatched payment channel", () => {
  const config = loadConfig(env);
  for (const raw of ["bad json", "[]", "null", "{}", JSON.stringify({ ...params, sellAmount: 1000000 }),
    JSON.stringify({ ...params, sellAmount: "0" }), JSON.stringify({ ...params, extra: "unknown" }),
    JSON.stringify({ ...params, originAddress: "" })]) {
    assert.throws(() => selectRequest(config, "cross-chain-quotes", { CROSS_CHAIN_PARAMS: raw }));
  }
  assert.throws(() => selectRequest(config, "cross-chain-status", {}), /originChain/);
  assert.throws(() => selectRequest(loadConfig({ ...env, CHAIN_ID: "8453" }), "cross-chain-sources", {}), /match CHAIN_ID/);
  assert.throws(() => selectRequest(loadConfig({ ...env, AGENTPAY_URL: "https://other.example/v1/x402/cross-chain-quotes" }), "cross-chain-sources", {}), /agent.api.0x.org/);
  // No dummy transaction hash or source wallet is silently inserted for users.
  const { originAddress: _, ...withoutAddress } = params;
  assert.throws(() => selectRequest(config, "cross-chain-quotes", { CROSS_CHAIN_PARAMS: JSON.stringify(withoutAddress) }), /originAddress/);
  assert.doesNotThrow(() => selectRequest(config, "cross-chain-sources", {}));
});

function stream(chunks: string[]) {
  return new ReadableStream<Uint8Array>({ start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
    controller.close();
  } });
}

test("SSE parsing handles split frames, CRLF, heartbeats, and multiline data; stops on final result", async () => {
  const events: unknown[] = [];
  const result = await readQuoteStream(stream([
    ': heartbeat\r\n\r\ndata: {"event": {"type": "quo',
    'te",\r\ndata: "data": {"quoteId":"first"}}}\r\n\r',
    '\ndata: {"event":{"type":"result","data":{"liquidityAvailable":true}}}\n\n',
    'data: invalid ignored after result\n\n',
  ]), e => events.push(e));
  assert.equal(result.events, 2);
  assert.deepEqual(events[0], { event: { type: "quote", data: { quoteId: "first" } } });
});

test("SSE errors, malformed data, truncated streams, and oversized responses are reported without reconnecting", async () => {
  for (const chunks of [[], ['data: {"event":{"type":"quote"}}\n\n'], ['data: {"event":{"type":"result"}}'],
    ['data: broken\n\n'], ['data: {"event":{"type":"error","data":{"message":"backend failed"}}}\n\n']]) {
    await assert.rejects(readQuoteStream(stream(chunks), () => {}));
  }
  await assert.rejects(readQuoteStream(stream(["x".repeat(10 * 1024 * 1024 + 1)]), () => {}), /10 MiB/);
  await assert.rejects(readQuoteStream(stream(['data: {"event":{"type":"quote"}}\n\n'.repeat(101)]), () => {}), /100-event/);
});

test("stream payment negotiation signs only the selected cross-chain URL and reads events", async () => {
  const config = selectRequest(loadConfig(env), "cross-chain-quotes-stream", crossEnv);
  const client = standardClient(config, config.account);
  let calls = 0;
  const fakeFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    assert.equal(request.url, config.url);
    assert.equal(request.headers.get("Accept"), "text/event-stream");
    assert.equal(request.redirect, "error");
    if (++calls === 1) {
      const challenge = { x402Version: 2, resource: { url: config.url }, accepts: [{
        scheme: "exact", network: config.network, amount: "10000", asset: config.asset,
        payTo: config.payTo, maxTimeoutSeconds: 300, extra: { name: "USDC", version: "2" },
      }] };
      return new Response(null, { status: 402, headers: { "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(challenge)).toString("base64") } });
    }
    assert.ok(request.headers.get("PAYMENT-SIGNATURE"));
    return new Response(stream(['data: {"event":{"type":"result","data":{"liquidityAvailable":false}}}\n\n']), {
      headers: { "Content-Type": "text/event-stream", "PAYMENT-RESPONSE": Buffer.from(JSON.stringify({ success: true, network: config.network, transaction: "" })).toString("base64") },
    });
  };
  const result = await paidQuoteStream(config.url, client, fakeFetch);
  assert.equal(calls, 2);
  assert.equal(result.events, 1);
  assert.equal(result.receipt?.success, true);
});

test("stream HTTP failures stop without parsing events or reconnecting", async () => {
  const config = selectRequest(loadConfig(env), "cross-chain-quotes-stream", crossEnv);
  let calls = 0;
  await assert.rejects(paidQuoteStream(config.url, standardClient(config, config.account), async () => {
    calls++;
    return new Response('{"error":"backend unavailable"}', { status: 503 });
  }), /HTTP 503/);
  assert.equal(calls, 1);
});
