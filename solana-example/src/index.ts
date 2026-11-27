import {
  AccountRole,
  type Address,
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  assertIsTransactionWithinSizeLimit,
  createKeyPairSignerFromBytes,
  createNoopSigner,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  estimateResourceLimitsFactory,
  getAddressDecoder,
  getBase58Encoder,
  getSignatureFromTransaction,
  type Instruction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLoadedAccountsDataSizeLimit,
  setTransactionMessagePriorityFeeLamports,
  signTransactionMessageWithSigners,
} from "@solana/kit";

try {
  process.loadEnvFile();
} catch {
  // No .env file: read the variables from the environment.
}

const API_KEY = process.env.ZEROEX_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com";
if (!API_KEY) throw new Error("Set ZEROEX_API_KEY in .env");
const DRY_RUN = !PRIVATE_KEY || process.env.DRY_RUN !== "false";

const NATIVE_SOL = "So11111111111111111111111111111111111111111";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const MIN_DEMO_TAKER_LAMPORTS = 100_000_000n; // 0.1 SOL

// Simulation measures the swap at the current pool state; the margin covers
// changes between simulation and execution.
const LIMIT_MARGIN = 1.1;
const MAX_COMPUTE_UNIT_LIMIT = 1_400_000;
const MAX_LOADED_ACCOUNTS_DATA_SIZE_LIMIT = 64 * 1024 * 1024;

type ZeroExInstruction = {
  program_id: number[];
  accounts: { pubkey: number[]; is_signer: boolean; is_writable: boolean }[];
  data: number[];
};

const rpc = createSolanaRpc(RPC_URL);
const rpcSubscriptions = createSolanaRpcSubscriptions(RPC_URL.replace(/^http/, "ws"));

// Without a private key, simulate as the fee payer of a recent USDC
// transaction that is a wallet (owned by the System Program, so it can pay
// fees) holding enough SOL. The script never signs for it.
async function findDemoTaker(): Promise<Address> {
  const signatures = await rpc.getSignaturesForAddress(address(USDC), { limit: 10 }).send();
  for (const { signature, err } of signatures) {
    if (err !== null) continue;
    const transaction = await rpc
      .getTransaction(signature, { encoding: "json", maxSupportedTransactionVersion: 1 })
      .send();
    const feePayer = transaction?.transaction.message.accountKeys[0];
    if (!feePayer) continue;
    const { value: account } = await rpc.getAccountInfo(feePayer, { encoding: "base64" }).send();
    if (account?.owner === SYSTEM_PROGRAM && account.lamports >= MIN_DEMO_TAKER_LAMPORTS) {
      return feePayer;
    }
  }
  throw new Error("No funded wallet found to simulate with: set PRIVATE_KEY");
}

const taker = PRIVATE_KEY
  ? await createKeyPairSignerFromBytes(getBase58Encoder().encode(PRIVATE_KEY))
  : createNoopSigner(await findDemoTaker());

// 1. Fetch swap instructions for a v1 transaction.
const response = await fetch("https://api.0x.org/solana/swap-instructions", {
  method: "POST",
  headers: { "0x-api-key": API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    token_in: NATIVE_SOL,
    token_out: USDC,
    amount_in: 1_000_000, // 0.001 SOL in lamports
    taker: taker.address,
    slippage_bps: 50,
    transaction_version: "v1",
  }),
});
const quote = await response.json();
if (!response.ok) throw new Error(`0x API error: ${JSON.stringify(quote)}`);
console.log(`Quote: ${quote.amount_out} USDC base units (at least ${quote.min_amount_out})`);

// 2. Convert the instructions to Solana Kit instructions, keeping their order.
const addressDecoder = getAddressDecoder();
const toRole = (isSigner: boolean, isWritable: boolean) =>
  isSigner
    ? isWritable
      ? AccountRole.WRITABLE_SIGNER
      : AccountRole.READONLY_SIGNER
    : isWritable
      ? AccountRole.WRITABLE
      : AccountRole.READONLY;
const instructions: Instruction[] = (quote.instructions as ZeroExInstruction[]).map((ix) => ({
  programAddress: addressDecoder.decode(Uint8Array.from(ix.program_id)),
  accounts: ix.accounts.map((account) => ({
    address: addressDecoder.decode(Uint8Array.from(account.pubkey)),
    role: toRole(account.is_signer, account.is_writable),
  })),
  data: Uint8Array.from(ix.data),
}));

// 3. Build the v1 transaction message. In v1 the priority fee is a total in lamports.
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
const message = pipe(
  createTransactionMessage({ version: 1 }),
  (m) => setTransactionMessageFeePayerSigner(taker, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
  (m) => appendTransactionMessageInstructions(instructions, m),
  (m) => setTransactionMessagePriorityFeeLamports(10_000n, m),
);

// 4. Simulate to set the compute unit and loaded accounts data size limits.
// A v1 transaction that does not set them has limits of zero and fails.
const estimate = await estimateResourceLimitsFactory({ rpc })(message);
const withLimits = pipe(
  message,
  (m) =>
    setTransactionMessageComputeUnitLimit(
      Math.min(Math.ceil(estimate.computeUnitLimit * LIMIT_MARGIN), MAX_COMPUTE_UNIT_LIMIT),
      m,
    ),
  (m) =>
    setTransactionMessageLoadedAccountsDataSizeLimit(
      Math.min(
        Math.ceil(estimate.loadedAccountsDataSizeLimit * LIMIT_MARGIN),
        MAX_LOADED_ACCOUNTS_DATA_SIZE_LIMIT,
      ),
      m,
    ),
);
console.log(
  `Simulation succeeded: ${estimate.computeUnitLimit} compute units, ` +
    `${estimate.loadedAccountsDataSizeLimit} bytes of account data`,
);

if (DRY_RUN) {
  console.log(
    PRIVATE_KEY
      ? "Dry run: set DRY_RUN=false to send the transaction."
      : `Dry run for ${taker.address}: set PRIVATE_KEY to swap from your own wallet.`,
  );
  process.exit(0);
}

// 5. Sign, send, and confirm.
const transaction = await signTransactionMessageWithSigners(withLimits);
assertIsTransactionWithinSizeLimit(transaction);
assertIsTransactionWithBlockhashLifetime(transaction);
const signature = getSignatureFromTransaction(transaction);
await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(transaction, {
  commitment: "confirmed",
});
console.log(`Swap confirmed: https://solscan.io/tx/${signature}`);
