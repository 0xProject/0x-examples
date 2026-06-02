import { config as dotenv } from "dotenv";
import { Connection, VersionedTransaction, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { CrossChainClient } from "./crossChainClient";
import { loadConfig, TOKEN_ADDRESSES, CHAIN_IDS } from "./config";

dotenv({ quiet: true });

const configuration = loadConfig();

/**
 * Example: Solana to Base cross-chain swap with separate gas payer
 * Swaps WSOL on Solana to USDC on Base using a separate private key for paying gas fees
 * Requires both SOLANA_PRIVATE_KEY and SOLANA_GAS_PAYER_PRIVATE_KEY to be provided and different
 */
async function solanaToBaseWithGasPayerExample() {
  console.log("🌉 Solana to Base Cross-Chain Swap Example (with Gas Payer)");
  console.log("=========================================================");

  // Validate required private keys
  if (!configuration.solanaPrivateKey) {
    console.error("❌ SOLANA_PRIVATE_KEY is required for this example");
    process.exit(1);
  }

  if (!configuration.solanaGasPayerPrivateKey) {
    console.error(
      "❌ SOLANA_GAS_PAYER_PRIVATE_KEY is required for this example"
    );
    process.exit(1);
  }

  if (!configuration.evmReceiverAddress) {
    console.error("❌ EVM_RECEIVER_ADDRESS is required for this example");
    process.exit(1);
  }

  const crossChainClient = new CrossChainClient(configuration.zeroexApiKey);

  // Setup Solana connection and keypairs
  const connection = new Connection(configuration.rpcUrls.solana);

  const privateKeyArray = bs58.decode(configuration.solanaPrivateKey);
  const keypair = Keypair.fromSecretKey(privateKeyArray);
  const userAddress = keypair.publicKey.toBase58();

  const gasPayerPrivateKeyArray = bs58.decode(
    configuration.solanaGasPayerPrivateKey
  );
  const gasPayerKeypair = Keypair.fromSecretKey(gasPayerPrivateKeyArray);

  // Ensure gas payer is different from user
  if (gasPayerKeypair.publicKey.equals(keypair.publicKey)) {
    console.error("❌ Gas payer must be different from transaction signer");
    console.error(
      "SOLANA_GAS_PAYER_PRIVATE_KEY cannot be the same as SOLANA_PRIVATE_KEY"
    );
    process.exit(1);
  }

  const sellAmount = "1000000"; // 0.001 WSOL (9 decimals)
  const receiverAddress = configuration.evmReceiverAddress;

  console.log(`👤 Sender (Solana): ${userAddress}`);
  console.log(`⛽ Gas Payer (Solana): ${gasPayerKeypair.publicKey.toBase58()}`);
  console.log(`🎯 Receiver (Base): ${receiverAddress}`);

  try {
    // Step 1: Get the best quote
    console.log("\n📊 Getting cross-chain quote...");
    const quoteResponse = await crossChainClient.getQuotes({
      originChain: CHAIN_IDS.solana,
      destinationChain: CHAIN_IDS.base,
      sellToken: TOKEN_ADDRESSES.WSOL,
      buyToken: TOKEN_ADDRESSES.USDC_BASE,
      sellAmount,
      sortQuotesBy: "price",
      originAddress: userAddress,
      destinationAddress: receiverAddress,
      slippageBps: 100,
      gasPayer: gasPayerKeypair.publicKey.toBase58(),
      maxNumQuotes: 1,
    });

    if (!quoteResponse.liquidityAvailable) {
      console.log("❌ No liquidity available");
      return;
    }

    const quote = quoteResponse.quotes[0];
    console.log("✅ Quote received:");
    console.log(`  💰 Send: ${Number(quote.sellAmount) / 1e9} WSOL`);
    console.log(`  💱 Receive: ${Number(quote.buyAmount) / 1e6} USDC`);
    console.log(`  🛡️  Min Receive: ${Number(quote.minBuyAmount) / 1e6} USDC`);
    console.log(`  ⏱️  Estimated Time: ${quote.estimatedTimeSeconds}s`);

    // Display quote steps and bridge provider
    console.log(`  🔄 Steps: ${quote.steps.length}`);
    const bridgeStep = quote.steps.find((step) => step.type === "bridge");
    if (bridgeStep && bridgeStep.provider) {
      console.log(`  🌉 Bridge Provider: ${bridgeStep.provider}`);
    }

    quote.steps.forEach((step, i) => {
      if (step.type === "bridge") {
        console.log(
          `    ${i + 1}. Bridge via ${step.provider} (${step.originChainId} → ${step.destinationChainId})`
        );
      } else if (step.type === "swap") {
        console.log(`    ${i + 1}. Swap on chain ${step.chainId}`);
      } else {
        console.log(`    ${i + 1}. ${step.type.charAt(0).toUpperCase() + step.type.slice(1)} on chain ${step.chainId}`);
      }
    });

    // Display gas costs for Solana
    if (quote.gasCosts.chainType === "svm") {
      console.log(`  ⛽ Solana Transaction Fees (paid by gas payer):`);
      console.log(`    🔹 Base Fee: ${Number(quote.gasCosts.base) / 1e9} SOL`);
      console.log(
        `    🔸 Priority Fee: ${quote.gasCosts.priority ? Number(quote.gasCosts.priority) / 1e9 : 0
        } SOL`
      );
      console.log(
        `    🔺 Total Fee: ${Number(quote.gasCosts.total) / 1e9} SOL`
      );
    }

    // Step 2: Execute transaction
    console.log("\n🚀 Executing transaction...");

    if (quote.transaction.chainType !== "svm") {
      console.error("❌ Expected SVM transaction but got EVM transaction");
      return;
    }

    const serializedTx = quote.transaction.details.serializedTransaction;
    const transactionBuffer = Buffer.from(serializedTx, "base64");
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    console.log("📋 Transaction details:");
    console.log(
      `  📝 Instructions: ${transaction.message.compiledInstructions.length}`
    );
    console.log(
      `  🔑 Required signatures: ${transaction.message.header.numRequiredSignatures}`
    );

    // Sign transaction with both keypairs (gas payer first as fee payer)
    console.log("✍️  Signing transaction with gas payer and user keypairs...");
    transaction.sign([gasPayerKeypair, keypair]);

    // Send transaction
    console.log("📤 Sending transaction...");
    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    console.log(`📝 Transaction sent: ${signature}`);

    // Wait for confirmation
    console.log("⏳ Waiting for transaction confirmation...");
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        ...(await connection.getLatestBlockhash()),
      },
      "finalized"
    );

    if (confirmation.value.err) {
      console.error(
        `❌ Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
      return;
    }

    console.log(`✅ Transaction confirmed`);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);

    // Step 3: Monitor cross-chain transaction
    console.log("\n👀 Monitoring cross-chain transaction...");
    console.log("This may take several minutes...");

    try {
      const finalStatus = await crossChainClient.monitorTransaction(
        {
          originChain: CHAIN_IDS.solana,
          originTxHash: signature,
        },
        {
          maxAttempts: 120, // 10 minutes
          intervalMs: 5000,
          onUpdate: (status) => {
            const timestamp = new Date().toLocaleTimeString();
            console.log(
              `[${timestamp}] 📊 Status: ${status.status}`
            );

            if (status.transactions.length > 1) {
              console.log(
                `🔗 ${status.transactions.length} transactions found:`
              );
              status.transactions.forEach((tx, i) => {
                const explorerUrl =
                  tx.chainId === 8453
                    ? `https://basescan.org/tx/${tx.txHash}`
                    : tx.chainId === 999999999991
                      ? `https://solscan.io/tx/${tx.txHash}`
                      : tx.txHash;
                console.log(`  ${i + 1}. ${tx.chain}: ${explorerUrl}`);
              });
            }
          },
        }
      );

      console.log(`\n🏁 Final Status: ${finalStatus.status}`);

      if (finalStatus.status === "bridge_filled") {
        console.log("🎉 Cross-chain swap completed successfully!");
        console.log("\n📋 Final Transaction Summary:");
        finalStatus.transactions.forEach((tx, i) => {
          const date = new Date(tx.timestamp * 1000).toLocaleString();
          const explorerUrl =
            tx.chainId === 8453
              ? `https://basescan.org/tx/${tx.txHash}`
              : tx.chainId === 999999999991
                ? `https://solscan.io/tx/${tx.txHash}`
                : tx.txHash;
          console.log(`  ${i + 1}. ${tx.chain}: ${explorerUrl} (${date})`);
        });
      } else {
        console.log("❌ Cross-chain swap did not complete successfully");
        if (finalStatus.failure) {
          console.log(`   Reason: ${finalStatus.failure.reason}`);
        }
      }
    } catch (monitorError) {
      console.error(
        "⚠️  Monitoring failed, but transaction may still succeed:",
        monitorError
      );
      console.log(
        `You can manually check status at: https://solscan.io/tx/${signature}`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (require.main === module) {
  solanaToBaseWithGasPayerExample().catch(console.error);
}
