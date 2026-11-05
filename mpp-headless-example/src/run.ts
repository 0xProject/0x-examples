import { loadConfig, resourceUrl } from "./config.js";
import { paidGet, paymentClient } from "./client.js";

export async function run(resource: "price" | "quote") {
  try {
    const config = loadConfig();
    console.log(`Payer: ${config.account.address}; payment chain: ${config.chain.id}; method: tempo/charge`);
    await paidGet(resourceUrl(config, resource), paymentClient(config));
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : "MPP request failed.");
    process.exitCode = 1;
  }
}
