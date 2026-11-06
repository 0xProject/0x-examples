import { positiveInteger } from "./config.js";
import type { Config } from "./config.js";

export const crossChainResources = [
  "cross-chain-quotes", "cross-chain-status", "cross-chain-sources", "cross-chain-quotes-stream",
] as const;
export type CrossChainResource = typeof crossChainResources[number];

function parameters(raw: string | undefined, name: string): Record<string, string> {
  let value: unknown;
  try { value = JSON.parse(raw || "{}"); }
  catch { throw new Error(`${name} must be a JSON object of query parameters.`); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be a JSON object of query parameters.`);
  }
  const result: Record<string, string> = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    // Use strings for token amounts and hashes to avoid numeric precision loss.
    if (typeof item !== "string" || !item.trim()) throw new Error(`${name}.${key} must be a nonempty string.`);
    result[key] = item;
  }
  return result;
}

export function selectCrossChainResource(config: Config, resource: CrossChainResource, env: NodeJS.ProcessEnv = process.env): Config {
  const url = new URL(config.url);
  const route = url.pathname.match(/^\/v1\/(x402|x402-testnet)\/(?:swap-allowance-holder-(?:price|quote)|cross-chain-(?:quotes|status|sources|quotes-stream))\/?$/);
  if (url.hostname !== "agent.api.0x.org" || url.port || !route) {
    throw new Error("Cross-chain commands require a supported agent.api.0x.org x402 endpoint in AGENTPAY_URL.");
  }
  const channel = config.chain.id === 84532 ? "x402-testnet" : "x402";
  if (route[1] !== channel) throw new Error("AGENTPAY_URL payment channel must match CHAIN_ID.");
  // Keep the payment origin/channel; never carry same-chain swap query parameters over.
  url.pathname = `/v1/${channel}/${resource}`;
  url.search = "";
  if (resource !== "cross-chain-sources") {
    const status = resource === "cross-chain-status";
    const name = status ? "CROSS_CHAIN_STATUS_PARAMS" : "CROSS_CHAIN_PARAMS";
    const params = parameters(env[name], name);
    const quoteFields = ["originChain", "destinationChain", "sellToken", "buyToken", "sellAmount", "originAddress",
      "destinationAddress", "gasPayer", "solanaEphemeralSignerPubkey", "slippageBps", "excludedBridges",
      "includedBridges", "excludedSwapSources", "feeBps", "feePpm", "feeRecipient", "feeToken", "sortQuotesBy", "maxNumQuotes"];
    const allowed = status ? ["originChain", "originTxHash", "quoteId"] : quoteFields;
    for (const key of Object.keys(params)) {
      if (!allowed.includes(key)) throw new Error(`Unsupported ${name} parameter: ${key}`);
    }
    // originAddress may be an EVM, Solana, Bitcoin, or Tron address: provide it explicitly.
    const required = status ? ["originChain", "originTxHash"]
      : ["originChain", "destinationChain", "sellToken", "buyToken", "sellAmount", "originAddress"];
    for (const key of required) if (!params[key]) throw new Error(`Set ${name}.${key} before making a paid request.`);
    if (!status) positiveInteger(params.sellAmount, `${name}.sellAmount`);
    // Streaming quotes arrive in discovery order and do not accept sortQuotesBy.
    if (resource === "cross-chain-quotes-stream") delete params.sortQuotesBy;
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  }
  return { ...config, url: url.href };
}
