import { isAddress } from "viem";
import type { Config } from "./config.js";
import { crossChainResources, selectCrossChainResource } from "./cross-chain.js";
import type { CrossChainResource } from "./cross-chain.js";

export type Resource = "price" | "quote";
export type RequestResource = Resource | CrossChainResource;
export type Command = RequestResource | "swap";

export function parseArgs(args: string[], allowRefund = false) {
  let resource: Command = "price";
  let selected = false;
  let refund = false;
  for (const arg of args) {
    if ((arg === "price" || arg === "quote" || arg === "swap" || crossChainResources.includes(arg as CrossChainResource)) && !selected) {
      resource = arg as Command;
      selected = true;
    } else if (arg === "--refund" && allowRefund && !refund) {
      refund = true;
    } else {
      throw new Error(`Unexpected argument: ${arg}. Usage: npm run ${allowRefund ? "batch" : "standard"} -- [price|quote|swap|${crossChainResources.join("|")}]${allowRefund ? " [--refund]" : ""}`);
    }
  }
  if (resource === "swap" && refund) throw new Error("Use price --refund or quote --refund to refund a batch channel.");
  return { resource, refund };
}

export function selectRequest(config: Config, resource: RequestResource, env: NodeJS.ProcessEnv = process.env): Config {
  return resource === "price" || resource === "quote"
    ? selectResource(config, resource) : selectCrossChainResource(config, resource, env);
}

export function selectResource(config: Config, resource: Resource): Config {
  const url = new URL(config.url);
  if (!/\/swap-allowance-holder-(price|quote)\/?$/.test(url.pathname)) {
    throw new Error("AGENTPAY_URL must point to a swap-allowance-holder-price or swap-allowance-holder-quote endpoint.");
  }
  url.pathname = url.pathname.replace(/swap-allowance-holder-(price|quote)(\/?)$/, `swap-allowance-holder-${resource}$2`);
  if (resource === "quote") {
    const taker = config.taker || url.searchParams.get("taker") || config.account.address;
    if (!isAddress(taker)) throw new Error("Quote taker must be an EVM address. Set TAKER in .env or taker in AGENTPAY_URL.");
    url.searchParams.set("taker", taker);
  }
  // The payment policy must check the final selected URL, including taker.
  return { ...config, url: url.href };
}
