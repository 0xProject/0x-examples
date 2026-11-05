import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import type { SchemeNetworkClient } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/client";
import type { ClientChannelStorage } from "@x402/evm/batch-settlement/client";
import type { ClientEvmSigner } from "@x402/evm";
import type { Config } from "./config.js";

export interface PaymentSession {
  urls?: string[];
  maxTotalPayment?: bigint;
  maxTotalDeposit?: bigint;
}

// Register one scheme on one chain: batch must never fall back to per-call settlement.
export function paymentClient(config: Config, scheme: SchemeNetworkClient, session: PaymentSession = {}) {
  let authorized = 0n;
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
  client.onBeforePaymentCreation(async ({ paymentRequired, selectedRequirements }) => {
    if (!(session.urls ?? [config.url]).includes(paymentRequired.resource?.url ?? "")) {
      throw new Error("The payment resource URL must exactly match AGENTPAY_URL.");
    }
    const next = authorized + BigInt(selectedRequirements.amount);
    if (session.maxTotalPayment !== undefined && next > session.maxTotalPayment) {
      throw new Error("The swap's API payment budget is exhausted. Review receipts before retrying.");
    }
    // Reserve each signed authorization, including corrective retries.
    authorized = next;
  });
  return client;
}

export function standardClient(config: Config, signer: ClientEvmSigner, session?: PaymentSession) {
  return paymentClient(config, new ExactEvmScheme(signer), session);
}

export function batchClient(config: Config, signer: ClientEvmSigner, storage: ClientChannelStorage, session: PaymentSession = {}) {
  let deposited = 0n;
  const scheme = new BatchSettlementEvmScheme(signer, {
    storage,
    rpcUrl: config.rpcUrl,
    depositPolicy: { depositMultiplier: 5 },
    depositStrategy: ({ depositAmount, minimumDepositAmount }) => {
      // minDeposit hints can exceed the per-request price. Cap deposits separately.
      if (BigInt(minimumDepositAmount) > config.maxDeposit) {
        throw new Error("Required batch deposit exceeds MAX_DEPOSIT_AMOUNT.");
      }
      const remaining = session.maxTotalDeposit === undefined ? config.maxDeposit : session.maxTotalDeposit - deposited;
      const cap = remaining < config.maxDeposit ? remaining : config.maxDeposit;
      if (BigInt(minimumDepositAmount) > cap) throw new Error("The swap's batch deposit budget is exhausted.");
      const amount = BigInt(depositAmount) > cap ? cap : BigInt(depositAmount);
      deposited += amount;
      return amount;
    },
  });
  const client = paymentClient(config, scheme, session);
  client.onAfterPaymentCreation(async ({ paymentPayload }) => {
    const payload = paymentPayload.payload as { type?: string; voucher?: { channelId?: string } };
    console.log("Batch payment:", { type: payload.type, channelId: payload.voucher?.channelId });
  });
  return { client, scheme };
}

export async function paidGet(url: string, client: x402Client, fetchImpl = fetch) {
  const fetchWithPayment = wrapFetchWithPayment(fetchImpl, client);
  const response = await fetchWithPayment(url, { redirect: "error" });
  // Even a backend error can include a receipt: exact payments settle before execution.
  const header = response.headers.get("PAYMENT-RESPONSE");
  const receipt = header ? decodePaymentResponseHeader(header) : undefined;
  if (receipt) console.log("Payment receipt:", receipt);
  const body = await response.text();
  console.log(`HTTP ${response.status}:`, body);
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}. Review the receipt before retrying.`);
  return { data: JSON.parse(body) as unknown, receipt };
}
