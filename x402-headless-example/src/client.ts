import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import type { SchemeNetworkClient } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/client";
import type { ClientChannelStorage } from "@x402/evm/batch-settlement/client";
import type { ClientEvmSigner } from "@x402/evm";
import type { Config } from "./config.js";

// Register one scheme on one chain: batch must never fall back to per-call settlement.
export function paymentClient(config: Config, scheme: SchemeNetworkClient) {
  const client = new x402Client().register(config.network, scheme)
    // The policy below applies the explicit atomic USDC cap from .env.
    .setSpendControls({ maxAmountPerPayment: false });
  client.registerPolicy((version, options) => {
    const allowed = options.filter((option) =>
      version === 2 &&
      option.network === config.network &&
      option.scheme === scheme.scheme &&
      option.asset.toLowerCase() === config.asset.toLowerCase() &&
      option.payTo.toLowerCase() === config.payTo.toLowerCase() &&
      // Select the USDC EIP-3009 domain used by this example.
      (option.extra?.name === "USDC" || option.extra?.name === "USD Coin") &&
      option.extra?.version === "2" &&
      (option.extra?.assetTransferMethod === undefined || option.extra.assetTransferMethod === "eip3009") &&
      /^[0-9]+$/.test(option.amount) &&
      BigInt(option.amount) > 0n && BigInt(option.amount) <= config.maxPayment
    );
    if (!allowed.length) {
      throw new Error(`No allowed ${scheme.scheme} payment. Check scheme availability, chain, USDC, PAY_TO and MAX_PAYMENT_AMOUNT.`);
    }
    return allowed;
  });
  client.onBeforePaymentCreation(async ({ paymentRequired }) => {
    if (paymentRequired.resource?.url !== config.url) {
      throw new Error("The payment resource URL must exactly match AGENTPAY_URL.");
    }
  });
  return client;
}

export function standardClient(config: Config, signer: ClientEvmSigner) {
  return paymentClient(config, new ExactEvmScheme(signer));
}

export function batchClient(config: Config, signer: ClientEvmSigner, storage: ClientChannelStorage) {
  const scheme = new BatchSettlementEvmScheme(signer, {
    storage,
    rpcUrl: config.rpcUrl,
    depositPolicy: { depositMultiplier: 5 },
    depositStrategy: ({ depositAmount, minimumDepositAmount }) => {
      // minDeposit hints can exceed the per-request price. Cap deposits separately.
      if (BigInt(minimumDepositAmount) > config.maxDeposit) {
        throw new Error("Required batch deposit exceeds MAX_DEPOSIT_AMOUNT.");
      }
      return BigInt(depositAmount) > config.maxDeposit ? config.maxDeposit : undefined;
    },
  });
  return { client: paymentClient(config, scheme), scheme };
}

export async function paidGet(url: string, client: x402Client) {
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const response = await fetchWithPayment(url, { redirect: "error" });
  // Even a backend error can include a receipt: exact payments settle before execution.
  const receipt = response.headers.get("PAYMENT-RESPONSE");
  if (receipt) console.log("Payment receipt:", decodePaymentResponseHeader(receipt));
  console.log(`HTTP ${response.status}:`, await response.text());
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}. Review the receipt before retrying.`);
}
