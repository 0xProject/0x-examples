import {
  AccountRole,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  assertIsTransactionWithinSizeLimit,
  createTransactionMessage,
  estimateResourceLimitsFactory,
  getAddressDecoder,
  getSignatureFromTransaction,
  type Instruction,
  pipe,
  type Rpc,
  type RpcSubscriptions,
  sendAndConfirmTransactionFactory,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLoadedAccountsDataSizeLimit,
  setTransactionMessagePriorityFeeLamports,
  signTransactionMessageWithSigners,
  type SolanaRpcApi,
  type SolanaRpcSubscriptionsApi,
  type TransactionSigner,
} from "@solana/kit";

export const NATIVE_SOL = "So11111111111111111111111111111111111111111";

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

export type SwapInstructions = {
  amount_out: number;
  min_amount_out: number;
  instructions: ZeroExInstruction[];
};

export type SwapRequest = {
  token_in: string;
  token_out: string;
  amount_in: number;
  taker: string;
  slippage_bps?: number;
};

// 1. Fetch swap instructions for a v1 transaction.
export async function getSwapInstructions(
  apiKey: string,
  request: SwapRequest,
): Promise<SwapInstructions> {
  const response = await fetch("https://api.0x.org/solana/swap-instructions", {
    method: "POST",
    headers: { "0x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, transaction_version: "v1" }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`0x API error: ${JSON.stringify(body)}`);
  return body;
}

// 2. Convert an instruction to Solana Kit's format. Keep the API's order.
const addressDecoder = getAddressDecoder();

function toRole(isSigner: boolean, isWritable: boolean): AccountRole {
  if (isSigner) return isWritable ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER;
  return isWritable ? AccountRole.WRITABLE : AccountRole.READONLY;
}

export function toKitInstruction(ix: ZeroExInstruction): Instruction {
  return {
    programAddress: addressDecoder.decode(Uint8Array.from(ix.program_id)),
    accounts: ix.accounts.map((account) => ({
      address: addressDecoder.decode(Uint8Array.from(account.pubkey)),
      role: toRole(account.is_signer, account.is_writable),
    })),
    data: Uint8Array.from(ix.data),
  };
}

// 3. Build the v1 transaction message, then simulate it to set the compute
// unit and loaded accounts data size limits. A v1 transaction that does not
// set them has limits of zero and fails. In v1 the priority fee is a total in
// lamports, not a price per compute unit.
export async function buildSwapTransaction(
  rpc: Rpc<SolanaRpcApi>,
  taker: TransactionSigner,
  instructions: Instruction[],
  priorityFeeLamports: bigint,
) {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 1 }),
    (m) => setTransactionMessageFeePayerSigner(taker, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
    (m) => setTransactionMessagePriorityFeeLamports(priorityFeeLamports, m),
  );

  // Throws if the swap would fail, so the user is not asked to sign it.
  const estimate = await estimateResourceLimitsFactory({ rpc })(message);
  return pipe(
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
}

// 4. Sign, send, and wait for confirmation.
export async function signAndSend(
  rpc: Rpc<SolanaRpcApi>,
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>,
  message: Awaited<ReturnType<typeof buildSwapTransaction>>,
): Promise<string> {
  const transaction = await signTransactionMessageWithSigners(message);
  assertIsTransactionWithinSizeLimit(transaction);
  assertIsTransactionWithBlockhashLifetime(transaction);
  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(transaction, {
    commitment: "confirmed",
  });
  return getSignatureFromTransaction(transaction);
}
