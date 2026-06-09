import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { fetchConfig } from "./config";
import {
  Instruction,
  InstructionAccount,
  ZeroExQuoteResponse,
  ZeroExQuoteResponseSchema,
} from "./schema";

const config = fetchConfig();

if (!process.env.ZEROEX_API_KEY) {
  throw new Error("ZEROEX_API_KEY is not set");
}

// === Step 1: Get a Quote ===
async function getQuote(): Promise<ZeroExQuoteResponse> {
  const response = await fetch("https://api.0x.org/solana/swap-instructions", {
    method: "POST",
    headers: {
      "0x-api-key": config.zeroexApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token_out: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      token_in: "So11111111111111111111111111111111111111112", // SOL
      amount_in: 1000000, // 0.001 SOL
      slippage_bps: 100, // Optional. Slippage tolerance in basis points (bps). Must be between 0 and 10,000.
      taker: config.keypairConfig.keypair.publicKey.toBase58(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch quote: ${response.statusText}`);
  }

  return ZeroExQuoteResponseSchema.parse(await response.json());
}

// === Step 2: Build Instructions ===
function decodePubkey(bytes: number[]): PublicKey {
  return new PublicKey(Uint8Array.from(bytes));
}

function buildInstructions(
  instructionsData: Instruction[]
): TransactionInstruction[] {
  return instructionsData.map((ix) => {
    const keys = ix.accounts.map((acc: InstructionAccount) => ({
      pubkey: decodePubkey(acc.pubkey),
      isSigner: acc.is_signer,
      isWritable: acc.is_writable,
    }));

    const programId = decodePubkey(ix.program_id);
    const data = Buffer.from(ix.data);

    return new TransactionInstruction({ keys, programId, data });
  });
}

// === Step 3: Resolve Address Lookup Tables ===
async function resolveAddressLookupTables(
  keys: string[]
): Promise<AddressLookupTableAccount[]> {
  const accountInfos = await config.connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  const accounts: AddressLookupTableAccount[] = [];
  for (let i = 0; i < keys.length; i++) {
    const accountInfo = accountInfos[i];
    if (!accountInfo) {
      throw new Error(
        `Failed to resolve address lookup table: ${keys[i]}`
      );
    }
    accounts.push(
      new AddressLookupTableAccount({
        key: new PublicKey(keys[i]),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      })
    );
  }

  console.debug(`Resolved ${accounts.length} address lookup table(s)`);

  return accounts;
}

// === Step 4: Execute Swap with Simulation and Confirmation ===
async function executeSwap() {
  try {
    const quote = await getQuote();
    console.log(`💰 Quote received: ${quote.amount_out} base units of USDC`);

    const instructions = buildInstructions(quote.instructions);
    const [addressLookupTableAccounts, latestBlockhash] = await Promise.all([
      resolveAddressLookupTables(quote.address_lookup_tables ?? []),
      config.connection.getLatestBlockhash(),
    ]);

    const messageV0 = new TransactionMessage({
      payerKey: config.keypairConfig.keypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const versionedTx = new VersionedTransaction(messageV0);
    versionedTx.sign([config.keypairConfig.keypair]);

    if (!config.keypairConfig.isUserProvided) {
      console.log(
        "No private key provided. Please provide a private key to enable simulation and transaction sending."
      );
      return;
    }

    // === Simulate Transaction ===
    const { value: simulationResult } =
      await config.connection.simulateTransaction(versionedTx, {
        sigVerify: true,
      });

    if (simulationResult.err) {
      console.error("❌ Simulation failed:", simulationResult.err);
      if (simulationResult.logs) {
        console.error("🪵 Logs:\n" + simulationResult.logs.join("\n"));
      }
      throw new Error("Aborting due to failed simulation.");
    } else {
      console.log("✅ Simulation succeeded");
    }

    if (config.dryRun) {
      console.log("🏁 Dry run complete. Set DRY_RUN=false to send the transaction.");
      return;
    }

    // === Send Transaction ===
    const signature = await config.connection.sendTransaction(versionedTx, {
      skipPreflight: false,
    });

    console.log(`✍️ Transaction sent with signature: ${signature}`);

    // === Confirm Transaction Status ===
    const confirmation = await config.connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    if (confirmation.value.err) {
      console.error(
        `❌ Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    } else {
      console.log(
        `✅ Transaction confirmed: https://solscan.io/tx/${signature}`
      );
    }
  } catch (error) {
    console.error("Failed to process quote and swap:", error);
  }
}

// === Run ===
executeSwap().catch(console.error);
