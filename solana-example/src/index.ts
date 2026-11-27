import {
  createKeyPairSignerFromBytes,
  createNoopSigner,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getBase58Encoder,
} from "@solana/kit";
import { findDemoTaker } from "./demo.js";
import {
  buildSwapTransaction,
  getSwapInstructions,
  NATIVE_SOL,
  signAndSend,
  toKitInstruction,
} from "./swap.js";

try {
  process.loadEnvFile();
} catch {
  // No .env file: read the variables from the environment.
}

const API_KEY = process.env.ZEROEX_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com";
const DRY_RUN = !PRIVATE_KEY || process.env.DRY_RUN !== "false";
if (!API_KEY) throw new Error("Set ZEROEX_API_KEY in .env");

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const rpc = createSolanaRpc(RPC_URL);
const rpcSubscriptions = createSolanaRpcSubscriptions(RPC_URL.replace(/^http/, "ws"));
const taker = PRIVATE_KEY
  ? await createKeyPairSignerFromBytes(getBase58Encoder().encode(PRIVATE_KEY))
  : createNoopSigner(await findDemoTaker(rpc, USDC));

const swap = await getSwapInstructions(API_KEY, {
  token_in: NATIVE_SOL,
  token_out: USDC,
  amount_in: 1_000_000, // 0.001 SOL in lamports
  taker: taker.address,
  slippage_bps: 50,
});
console.log(`Quote: ${swap.amount_out} USDC base units (at least ${swap.min_amount_out})`);

const transaction = await buildSwapTransaction(
  rpc,
  taker,
  swap.instructions.map(toKitInstruction),
  10_000n,
);
console.log("Simulation succeeded");

if (DRY_RUN) {
  console.log(
    PRIVATE_KEY
      ? "Dry run: set DRY_RUN=false to send the transaction."
      : `Dry run for ${taker.address}: set PRIVATE_KEY to swap from your own wallet.`,
  );
  process.exit(0);
}

const signature = await signAndSend(rpc, rpcSubscriptions, transaction);
console.log(`Swap confirmed: https://solscan.io/tx/${signature}`);
