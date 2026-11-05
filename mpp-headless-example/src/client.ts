import { createClient, http } from "viem";
import { Mppx, tempo } from "mppx/client";
import { Credential, Receipt } from "mppx";
import type { Config } from "./config.js";

export function chargeMethod(config: Config) {
  const client = createClient({ chain: config.chain, transport: http(config.rpcUrl) });
  return tempo.charge({
    account: config.account,
    // Follow the 0x integration: broadcast the payment and send its hash.
    mode: "push",
    getClient: () => client,
    expectedChainId: config.chain.id,
    allowedChainIds: [config.chain.id],
    expectedRecipients: [config.payTo],
    currencies: [config.paymentToken],
    maxAtomicAmount: config.maxPayment,
    feeToken: config.paymentToken,
    autoSwap: false,
  });
}

export function paymentClient(config: Config, fetchImpl = fetch, method = chargeMethod(config)) {
  const client = Mppx.create({
    methods: [method],
    fetch: fetchImpl,
    polyfill: false,
    // One paid attempt per invocation; do not automatically pay a second challenge.
    maxPaymentRetries: 1,
    onChallenge: async (challenge, { createCredential }) => {
      if (challenge.realm !== new URL(config.baseUrl).hostname) throw new Error("Unexpected payment realm.");
      console.log("Payment challenge:", {
        method: challenge.method, intent: challenge.intent,
        chainId: config.chain.id, currency: challenge.request.currency,
        amount: challenge.request.amount, recipient: challenge.request.recipient,
      });
      return createCredential();
    },
  });
  client.onCredentialCreated(({ credential }) => {
    const { payload } = Credential.deserialize<{ type: string; hash?: string }>(credential);
    // Push mode broadcasts before retrying the API. Keep its hash visible even
    // if the backend fails or the response omits Payment-Receipt.
    if (payload.type === "hash") console.log("Payment transaction:", payload.hash);
  });
  return client;
}

export async function paidGet(url: string, client: ReturnType<typeof paymentClient>) {
  const response = await client.fetch(url, { redirect: "error" });
  const receipt = response.headers.get("Payment-Receipt");
  if (receipt) console.log("Payment receipt:", Receipt.deserialize(receipt));
  console.log(`HTTP ${response.status}:`, await response.text());
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}. Review any payment receipt or wallet transaction before retrying.`);
}
