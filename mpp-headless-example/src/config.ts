import "dotenv/config";
import { isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempo, tempoModerato } from "viem/chains";

function positiveInteger(value: string, name: string) {
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function address(value: string, name: string): `0x${string}` {
  if (!isAddress(value)) throw new Error(`${name} must be an EVM address.`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const chainId = env.CHAIN_ID ?? "42431";
  const chain = chainId === "42431" ? tempoModerato : chainId === "4217" ? tempo : undefined;
  if (!chain) throw new Error("CHAIN_ID must be 42431 (Tempo testnet) or 4217 (Tempo mainnet).");
  const baseUrl = new URL(env.AGENTPAY_URL || "https://agent.api.0x.org/v1/mpp-tempo-testnet");
  const channel = chain.id === 42431 ? "mpp-tempo-testnet" : "mpp-tempo";
  if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash ||
      baseUrl.pathname.replace(/\/$/, "") !== `/v1/${channel}`) {
    throw new Error(`AGENTPAY_URL must be an HTTPS base URL ending in /v1/${channel}, without query parameters or credentials.`);
  }
  const privateKey = env.PRIVATE_KEY ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error("Set PRIVATE_KEY to a 0x-prefixed 32-byte private key.");
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return {
    account, chain, baseUrl: baseUrl.href.replace(/\/$/, ""),
    paymentToken: address(env.PAYMENT_TOKEN || (chain.id === 42431
      ? "0x20c0000000000000000000000000000000000000"
      : "0x20C000000000000000000000b9537d11c60E8b50"), "PAYMENT_TOKEN"),
    payTo: address(env.PAY_TO ?? "", "PAY_TO"),
    maxPayment: positiveInteger(env.MAX_PAYMENT_AMOUNT ?? "10000", "MAX_PAYMENT_AMOUNT"),
    rpcUrl: env.RPC_URL || undefined,
    swapChainId: positiveInteger(env.SWAP_CHAIN_ID ?? "8453", "SWAP_CHAIN_ID"),
    sellToken: address(env.SELL_TOKEN || "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "SELL_TOKEN"),
    buyToken: address(env.BUY_TOKEN || "0x4200000000000000000000000000000000000006", "BUY_TOKEN"),
    sellAmount: positiveInteger(env.SELL_AMOUNT ?? "1000000", "SELL_AMOUNT"),
    taker: address(env.TAKER || account.address, "TAKER"),
  };
}

export type Config = ReturnType<typeof loadConfig>;

export function resourceUrl(config: Config, resource: "price" | "quote") {
  const url = new URL(`${config.baseUrl}/swap-allowance-holder-${resource}/`);
  url.search = new URLSearchParams({
    chainId: config.swapChainId, sellToken: config.sellToken,
    buyToken: config.buyToken, sellAmount: config.sellAmount,
    ...(resource === "quote" ? { taker: config.taker } : {}),
  }).toString();
  return url.href;
}
