import {
  createPublicClient, createWalletClient, encodeFunctionData, erc20Abi, http, isAddress, isHex,
  type Address, type Hex,
} from "viem";
import { base } from "viem/chains";
import { toClientEvmSigner } from "@x402/evm";
import { FileClientChannelStorage } from "@x402/evm/batch-settlement/client/file-storage";
import { batchClient, paidGet, standardClient } from "./client.js";
import { positiveInteger, type Config } from "./config.js";
import { selectResource } from "./commands.js";

export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const BASE_WETH = "0x4200000000000000000000000000000000000006";
// Validation pin from https://docs.0x.org/docs/core-concepts/contracts.
// Approvals still use the spender returned by the API, after checking it.
export const BASE_ALLOWANCE_HOLDER = "0x0000000000001ff3684f28c67538d4d072c22734";
const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
type Mode = "standard" | "batch";

export function swapSettings(config: Config, env: NodeJS.ProcessEnv = process.env) {
  const url = new URL(selectResource(config, "price").url);
  if (url.hostname !== "agent.api.0x.org" || url.port ||
      !new RegExp(`^/v1/${config.chain.id === 84532 ? "x402-testnet" : "x402"}/swap-allowance-holder-(price|quote)/?$`).test(url.pathname)) {
    throw new Error("Swap execution requires a 0x agent.api.0x.org URL matching the payment chain.");
  }
  const allowed = ["chainId", "sellToken", "buyToken", "sellAmount", "taker", "slippageBps"];
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1) {
      throw new Error(`Unsupported or duplicate swap query parameter: ${key}`);
    }
  }
  if (url.searchParams.get("chainId") !== "8453" ||
      !sameAddress(url.searchParams.get("sellToken") ?? "", BASE_USDC) ||
      !sameAddress(url.searchParams.get("buyToken") ?? "", BASE_WETH)) {
    throw new Error("The swap command currently supports only USDC -> WETH on Base mainnet (chainId=8453).");
  }
  for (const taker of [config.taker, url.searchParams.get("taker")]) {
    if (taker && !sameAddress(taker, config.account.address)) throw new Error("Swap taker must match PRIVATE_KEY's address.");
  }
  const sellAmount = positiveInteger(url.searchParams.get("sellAmount") ?? "", "sellAmount");
  const maxSell = positiveInteger(env.MAX_SELL_AMOUNT ?? "1000000", "MAX_SELL_AMOUNT");
  if (sellAmount > maxSell) throw new Error("sellAmount exceeds MAX_SELL_AMOUNT.");
  const slippage = env.SLIPPAGE_BPS || url.searchParams.get("slippageBps") || "100";
  if (!/^\d+$/.test(slippage) || BigInt(slippage) > 500n) throw new Error("SLIPPAGE_BPS must be an integer from 0 to 500.");
  url.searchParams.set("slippageBps", slippage);
  // Include taker in price too, so the API can report allowance and balance issues.
  url.searchParams.set("taker", config.account.address);
  // Parameters are now finalized; subsequent route selection must preserve these checks.
  const selected = { ...config, baseUrl: undefined, url: url.href, taker: config.account.address };
  return {
    price: selectResource(selected, "price"), quote: selectResource(selected, "quote"),
    sellAmount, slippageBps: BigInt(slippage),
    maxGasCost: positiveInteger(env.MAX_GAS_COST_WEI ?? "1000000000000000", "MAX_GAS_COST_WEI"),
    rpcUrl: env.SWAP_RPC_URL || undefined,
  };
}

type Settings = ReturnType<typeof swapSettings>;
export interface SwapTransaction { to: Address; data: Hex; value: bigint }
interface Issues {
  allowance: null | { actual: string; spender: string };
  balance: null | Record<string, unknown>;
  simulationIncomplete: boolean;
  invalidSourcesPassed: unknown[];
}
interface SwapResponse {
  liquidityAvailable: boolean; sellToken: string; buyToken: string;
  sellAmount: string; buyAmount: string; minBuyAmount: string;
  allowanceTarget: string; issues: Issues;
  transaction?: { to: string; data: string; value: string };
}

export function validateSwapResponse(value: unknown, settings: Settings, firm: boolean): SwapResponse {
  if (!value || typeof value !== "object") throw new Error("Invalid swap response.");
  const r = value as Partial<SwapResponse>;
  if (r.liquidityAvailable !== true) throw new Error("No swap liquidity available.");
  if (typeof r.sellToken !== "string" || typeof r.buyToken !== "string" ||
      !sameAddress(r.sellToken, BASE_USDC) || !sameAddress(r.buyToken, BASE_WETH) ||
      r.sellAmount !== settings.sellAmount.toString()) throw new Error("Response does not match the requested swap.");
  const buy = positiveInteger(String(r.buyAmount ?? ""), "buyAmount");
  const minimum = positiveInteger(String(r.minBuyAmount ?? ""), "minBuyAmount");
  const floor = buy * (10000n - settings.slippageBps) / 10000n;
  if (minimum > buy || minimum < floor) throw new Error("Response exceeds the configured slippage limit.");
  if (typeof r.allowanceTarget !== "string" || !sameAddress(r.allowanceTarget, BASE_ALLOWANCE_HOLDER)) {
    throw new Error("Unexpected AllowanceHolder target.");
  }
  const issues = r.issues;
  if (!issues || issues.balance !== null || issues.simulationIncomplete !== false ||
      !Array.isArray(issues.invalidSourcesPassed) || issues.invalidSourcesPassed.length) {
    throw new Error("Swap has unresolved balance, simulation, or source issues.");
  }
  if (issues.allowance !== null) {
    const allowance = issues.allowance;
    if (!allowance || typeof allowance.spender !== "string" || !sameAddress(allowance.spender, r.allowanceTarget) ||
        !/^\d+$/.test(allowance.actual)) throw new Error("Invalid allowance issue or spender.");
    if (firm) throw new Error("The firm quote still reports an allowance issue. Stop before submitting a swap.");
  }
  if (firm) {
    const tx = r.transaction;
    if (!tx || !isAddress(tx.to) || !sameAddress(tx.to, BASE_ALLOWANCE_HOLDER) ||
        !isHex(tx.data, { strict: true }) || tx.data.length < 10 || tx.data.length % 2 !== 0 || tx.value !== "0") {
      throw new Error("Invalid AllowanceHolder swap transaction.");
    }
  }
  return r as SwapResponse;
}

// Small boundary around RPC/wallet operations keeps orchestration testable without
// loading .env credentials or broadcasting transactions in local tests.
export interface SwapActions {
  chainId(): Promise<number>;
  ethBalance(): Promise<bigint>;
  tokenBalance(): Promise<bigint>;
  allowance(spender: Address): Promise<bigint>;
  approve(spender: Address, amount: bigint): Promise<Hex>;
  sendSwap(tx: SwapTransaction, deadline: number): Promise<Hex>;
  wait(hash: Hex): Promise<{ status: "success" | "reverted" }>;
}

export async function executeSwap(
  config: Config, mode: Mode, settings: Settings, actions: SwapActions,
  request: (resource: "price" | "quote") => Promise<unknown>,
  now = Date.now,
) {
  if (await actions.chainId() !== 8453) throw new Error("SWAP_RPC_URL must connect to Base mainnet.");
  const reserve = mode === "standard" ? config.maxPayment * 2n : config.maxDeposit;
  if (await actions.tokenBalance() < settings.sellAmount + reserve) {
    throw new Error(`Insufficient Base USDC. Reserve ${reserve} atomic units for ${mode === "standard" ? "API payments" : "batch deposits"} in addition to sellAmount.`);
  }
  if (await actions.ethBalance() < settings.maxGasCost * 2n) {
    throw new Error("Insufficient Base ETH for the configured approval and swap gas budgets.");
  }
  console.log("Swap plan:", { mode, payer: config.account.address, swapChain: 8453,
    sellToken: BASE_USDC, buyToken: BASE_WETH, sellAmount: settings.sellAmount.toString(),
    slippageBps: settings.slippageBps.toString(), apiReserve: reserve.toString(),
    maxGasCostWeiPerTransaction: settings.maxGasCost.toString() });

  const price = validateSwapResponse(await request("price"), settings, false);
  // Use the API's allowance spender, validated above; never transaction.to.
  const spender = (price.issues.allowance?.spender ?? price.allowanceTarget) as Address;
  let approvalHash: Hex | undefined;
  if (await actions.allowance(spender) < settings.sellAmount) {
    approvalHash = await actions.approve(spender, settings.sellAmount);
    console.log("Approval transaction:", approvalHash);
    if ((await actions.wait(approvalHash)).status !== "success") throw new Error("Approval reverted; no quote or swap was submitted.");
  } else {
    console.log("Existing allowance is sufficient; skipping approval.");
  }

  const quotedAt = now();
  const quote = validateSwapResponse(await request("quote"), settings, true);
  if (BigInt(quote.minBuyAmount) < BigInt(price.minBuyAmount)) {
    throw new Error("Quote minimum output fell below the indicative price's minimum. No swap submitted.");
  }
  if (await actions.tokenBalance() < settings.sellAmount) throw new Error("Insufficient USDC after API payments/deposits.");
  if (await actions.allowance(spender) < settings.sellAmount) throw new Error("Insufficient confirmed allowance before swap.");
  if (now() - quotedAt > 30_000) throw new Error("Quote is stale; no swap submitted. Run again for a fresh quote.");
  const tx = quote.transaction!;
  const swapHash = await actions.sendSwap({ to: tx.to as Address, data: tx.data as Hex, value: 0n }, quotedAt + 30_000);
  console.log("Swap transaction:", swapHash);
  const receipt = await actions.wait(swapHash);
  if (receipt.status !== "success") throw new Error(`Swap reverted: ${swapHash}`);
  console.log("Swap confirmed:", { approvalHash, swapHash, minBuyAmount: quote.minBuyAmount });
  return { approvalHash, swapHash, minBuyAmount: quote.minBuyAmount };
}

export function boundedGas(estimate: bigint, maxFeePerGas: bigint, balance: bigint, maxCost: bigint) {
  if (estimate <= 0n || maxFeePerGas <= 0n) throw new Error("Invalid gas estimate.");
  const gas = (estimate * 120n + 99n) / 100n;
  if (gas * maxFeePerGas > maxCost) throw new Error("Estimated transaction cost exceeds MAX_GAS_COST_WEI.");
  if (balance < gas * maxFeePerGas) throw new Error("Insufficient ETH for transaction gas.");
  return gas;
}

function walletActions(config: Config, settings: Settings): SwapActions {
  const rpc = createPublicClient({ chain: base, transport: http(settings.rpcUrl) });
  // Transaction submissions are not automatically retried after transport errors.
  const wallet = createWalletClient({ account: config.account, chain: base,
    transport: http(settings.rpcUrl, { retryCount: 0 }) });
  async function send(tx: SwapTransaction, deadline?: number) {
    const estimate = await rpc.estimateGas({ ...tx, account: config.account });
    const fees = await rpc.estimateFeesPerGas();
    const gas = boundedGas(estimate, fees.maxFeePerGas,
      await rpc.getBalance({ address: config.account.address }), settings.maxGasCost);
    if (deadline !== undefined && Date.now() > deadline) throw new Error("Quote is stale after gas estimation; no swap submitted.");
    return wallet.sendTransaction({ ...tx, gas, ...fees });
  }
  return {
    chainId: () => rpc.getChainId(),
    ethBalance: () => rpc.getBalance({ address: config.account.address }),
    tokenBalance: () => rpc.readContract({ address: BASE_USDC, abi: erc20Abi,
      functionName: "balanceOf", args: [config.account.address] }),
    allowance: (spender) => rpc.readContract({ address: BASE_USDC, abi: erc20Abi,
      functionName: "allowance", args: [config.account.address, spender] }),
    approve: async (spender, amount) => {
      // Simulate the ERC-20 call as well, checking its boolean result.
      const simulated = await rpc.simulateContract({ account: config.account, address: BASE_USDC,
        abi: erc20Abi, functionName: "approve", args: [spender, amount] });
      if (!simulated.result) throw new Error("Token approval simulation returned false.");
      return send({ to: BASE_USDC, value: 0n, data: encodeFunctionData({ abi: erc20Abi,
        functionName: "approve", args: [spender, amount] }) });
    },
    sendSwap: (tx, deadline) => send(tx, deadline),
    wait: (hash) => rpc.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 }),
  };
}

export async function runSwap(config: Config, mode: Mode) {
  const settings = swapSettings(config);
  const session = { urls: [settings.price.url, settings.quote.url],
    maxTotalPayment: config.maxPayment * 2n, maxTotalDeposit: config.maxDeposit };
  const paymentRpc = createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) });
  const client = mode === "standard" ? standardClient(config, config.account, session)
    : batchClient(config, toClientEvmSigner(config.account, paymentRpc),
      new FileClientChannelStorage({ directory: ".channels" }), session).client;
  return executeSwap(config, mode, settings, walletActions(config, settings), async (resource) => {
    const result = await paidGet(settings[resource].url, client);
    if (!result.receipt?.success) throw new Error("Missing or unsuccessful API payment receipt; no further swap steps will run.");
    return result.data;
  });
}
