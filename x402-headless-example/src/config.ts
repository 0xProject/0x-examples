import "dotenv/config";
import { isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

export function positiveInteger(value: string, name: string): bigint {
  if (!/^[0-9]+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error(`${name} must be a positive integer in base units.`);
  }
  return BigInt(value);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const url = new URL(env.AGENTPAY_URL ?? "");
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("AGENTPAY_URL must be an HTTPS URL without credentials or a fragment.");
  }
  const chainId = env.CHAIN_ID ?? "84532";
  const chain = chainId === "84532" ? baseSepolia : chainId === "8453" ? base : undefined;
  if (!chain) throw new Error("CHAIN_ID must be 84532 (Base Sepolia) or 8453 (Base).");
  const privateKey = env.PRIVATE_KEY ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("Set PRIVATE_KEY to a 0x-prefixed 32-byte private key.");
  }
  const payTo = env.PAY_TO ?? "";
  if (!isAddress(payTo)) throw new Error("Set PAY_TO to the expected payment recipient address.");
  const maxPayment = positiveInteger(env.MAX_PAYMENT_AMOUNT ?? "10000", "MAX_PAYMENT_AMOUNT");
  const maxDeposit = positiveInteger(env.MAX_DEPOSIT_AMOUNT ?? "2000000", "MAX_DEPOSIT_AMOUNT");
  const count = positiveInteger(env.REQUEST_COUNT ?? "3", "REQUEST_COUNT");
  if (count > 100n) throw new Error("REQUEST_COUNT must be at most 100.");
  return {
    url: url.href,
    chain,
    network: `eip155:${chain.id}` as const,
    asset: chain.id === 84532
      ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
      : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    account: privateKeyToAccount(privateKey as `0x${string}`),
    payTo,
    maxPayment,
    maxDeposit,
    requestCount: Number(count),
    rpcUrl: env.RPC_URL || undefined,
    taker: env.TAKER || undefined,
  };
}

export type Config = ReturnType<typeof loadConfig>;
