import { createPublicClient, http } from "viem";
import { toClientEvmSigner } from "@x402/evm";
import { FileClientChannelStorage } from "@x402/evm/batch-settlement/client/file-storage";
import { loadConfig } from "./config.js";
import { batchClient, paidGet } from "./client.js";
import { parseArgs, selectResource } from "./commands.js";

async function main() {
  const { resource, refund } = parseArgs(process.argv.slice(2), true);
  const config = selectResource(loadConfig(), resource);
  const publicClient = createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) });
  const signer = toClientEvmSigner(config.account, publicClient);
  const { client, scheme } = batchClient(config, signer,
    new FileClientChannelStorage({ directory: ".channels" }));
  console.log(`Payer: ${config.account.address}; network: ${config.network}; scheme: batch-settlement`);
  console.log(`Resource: ${resource}`);

  if (refund) {
    // Cooperative refund of unused escrow; no new paid API call is made.
    console.log("Refund receipt:", await scheme.refund(config.url));
    return;
  }

  // Reuse the same scheme and channel state. The first call deposits USDC;
  // subsequent calls sign cumulative vouchers, topping up only when necessary.
  // Keep calls sequential so each voucher incorporates the previous receipt.
  for (let i = 0; i < config.requestCount; i++) {
    console.log(`Request ${i + 1}/${config.requestCount}`);
    await paidGet(config.url, client);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Batch payment failed.");
  process.exitCode = 1;
});
