import { loadConfig } from "./config.js";
import { paidGet, standardClient } from "./client.js";
import { parseArgs, selectResource } from "./commands.js";

async function main() {
  const { resource } = parseArgs(process.argv.slice(2));
  const config = selectResource(loadConfig(), resource);
  console.log(`Payer: ${config.account.address}; network: ${config.network}; scheme: exact`);
  console.log(`Resource: ${resource}`);
  // The SDK fetches the 402, signs USDC's EIP-3009 authorization, and retries
  // with PAYMENT-SIGNATURE. AgentPay handles verification and onchain settlement.
  await paidGet(config.url, standardClient(config, config.account));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Standard payment failed.");
  process.exitCode = 1;
});
