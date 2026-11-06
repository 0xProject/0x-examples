import { loadConfig } from "./config.js";
import { paidGet, standardClient } from "./client.js";
import { paidQuoteStream } from "./stream.js";
import { parseArgs, selectRequest } from "./commands.js";
import { runSwap } from "./swap.js";

async function main() {
  const { resource } = parseArgs(process.argv.slice(2));
  if (resource === "swap") return runSwap(loadConfig(), "standard");
  const config = selectRequest(loadConfig(), resource);
  console.log(`Payer: ${config.account.address}; network: ${config.network}; scheme: exact`);
  console.log(`Resource: ${resource}`);
  // The SDK fetches the 402, signs USDC's EIP-3009 authorization, and retries
  // with PAYMENT-SIGNATURE. The facilitator handles verification and onchain settlement.
  const client = standardClient(config, config.account);
  if (resource === "cross-chain-quotes-stream") await paidQuoteStream(config.url, client);
  else await paidGet(config.url, client);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Standard payment failed.");
  process.exitCode = 1;
});
