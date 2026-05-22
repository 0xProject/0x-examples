import { config as dotenv } from "dotenv";
import { TronWeb } from "tronweb";
import { CrossChainClient } from "./crossChainClient";
import {
  loadConfig,
  TOKEN_ADDRESSES,
  CHAIN_IDS,
  STATUS_CHAIN_IDS,
  DEFAULT_ADDRESSES,
} from "./config";

dotenv({ quiet: true });

const configuration = loadConfig();

const TRON_FEE_LIMIT = 150_000_000; // 150 TRX in sun
const TRON_POLL_INTERVAL_MS = 3_000;
const TRON_POLL_MAX_ATTEMPTS = 40;

/**
 * Example: Tron to Arbitrum cross-chain swap
 * Swaps USDT on Tron to USDC on Arbitrum
 */
async function tronToArbitrumExample() {
  console.log("🌉 Tron to Arbitrum Cross-Chain Swap Example");
  console.log("=============================================");

  const crossChainClient = new CrossChainClient(configuration.zeroexApiKey);

  // Setup Tron wallet if private key is provided
  let tronWeb: InstanceType<typeof TronWeb> | null = null;
  let userAddress: string;

  if (configuration.tronPrivateKey) {
    const cleanKey = configuration.tronPrivateKey.replace(/^0x/, "");
    tronWeb = new TronWeb({
      fullHost: configuration.rpcUrls.tron,
      privateKey: cleanKey,
    });
    userAddress = tronWeb.defaultAddress.base58 as string;
  } else {
    // Use default address for quote-only mode
    userAddress = DEFAULT_ADDRESSES.TRON;
    console.log(
      "⚠️  No TRON_PRIVATE_KEY provided - running in quote-only mode",
    );
  }

  const sellAmount = "5000000"; // 5 USDT (6 decimals)

  // Get receiver address or use default
  const receiverAddress =
    configuration.evmReceiverAddress || DEFAULT_ADDRESSES.EVM;

  // Safety check: if executing transactions, require explicit receiver address
  if (configuration.tronPrivateKey && !configuration.evmReceiverAddress) {
    console.log(
      "❌ SAFETY: EVM_RECEIVER_ADDRESS must be set when executing transactions",
    );
    console.log(
      "This prevents accidentally sending funds to a default address",
    );
    console.log("Set EVM_RECEIVER_ADDRESS in your environment or .env file");
    return;
  }

  console.log(`👤 Sender (Tron): ${userAddress}`);
  console.log(`🎯 Receiver (Arbitrum): ${receiverAddress}`);

  try {
    // Step 1: Get the best quote
    console.log("\n📊 Getting cross-chain quote...");
    const quoteResponse = await crossChainClient.getQuotes({
      originChain: CHAIN_IDS.tron,
      destinationChain: CHAIN_IDS.arbitrum,
      sellToken: TOKEN_ADDRESSES.USDT_TRON,
      buyToken: TOKEN_ADDRESSES.USDC_ARB,
      sellAmount,
      sortQuotesBy: "price",
      originAddress: userAddress,
      destinationAddress: receiverAddress,
      slippageBps: 100,
      maxNumQuotes: 1,
    });

    if (!quoteResponse.liquidityAvailable) {
      console.log("❌ No liquidity available");
      return;
    }

    const quote = quoteResponse.quotes[0];
    console.log("✅ Quote received:");
    console.log(`  💰 Send: ${Number(quote.sellAmount) / 1e6} USDT`);
    console.log(`  💱 Receive: ${Number(quote.buyAmount) / 1e6} USDC`);
    console.log(`  🛡️ Min Receive: ${Number(quote.minBuyAmount) / 1e6} USDC`);
    console.log(`  ⏱️ Estimated Time: ${quote.estimatedTimeSeconds}s`);

    // Display quote steps and bridge provider
    console.log(`  🔄 Steps: ${quote.steps.length}`);
    const bridgeStep = quote.steps.find((step) => step.type === "bridge");
    if (bridgeStep && bridgeStep.provider) {
      console.log(`  🌉 Bridge Provider: ${bridgeStep.provider}`);
    }

    quote.steps.forEach((step, i) => {
      if (step.type === "bridge") {
        console.log(
          `    ${i + 1}. Bridge via ${step.provider} (${step.originChainId} → ${step.destinationChainId})`,
        );
      } else if (step.type === "swap") {
        console.log(`    ${i + 1}. Swap on chain ${step.chainId}`);
      } else {
        console.log(
          `    ${i + 1}. ${step.type.charAt(0).toUpperCase() + step.type.slice(1)} on chain ${step.chainId}`,
        );
      }
    });

    if (quote.gasCosts.chainType === "tvm") {
      console.log(`  ⛽ Tron Transaction Fees:`);
      console.log(
        `    🔹 Energy Fee: ${Number(quote.gasCosts.energyFee) / 1e6} TRX`,
      );
      console.log(
        `    🔸 Bandwidth Fee: ${Number(quote.gasCosts.bandwidthFee) / 1e6} TRX`,
      );
      console.log(
        `    🔺 Total Fee: ${Number(quote.gasCosts.total) / 1e6} TRX`,
      );
    }

    // TRC-20 token approvals are NOT needed for Tron-origin cross-chain swaps.
    // The integrated bridge providers use direct TRC-20 transfers rather than
    // contract-based spending, so no separate approve() step is required.

    // Check for balance issues first - skip everything if insufficient balance
    if (quote.issues.balance) {
      console.log("❌ Insufficient balance detected");
      console.log(`  🔧 Token: ${quote.issues.balance.token}`);
      console.log(`  💰 Required: ${quote.issues.balance.expected}`);
      console.log(`  💰 Available: ${quote.issues.balance.actual}`);
      console.log(
        "\n⚠️  Cannot proceed with transaction - insufficient balance",
      );
      return;
    }

    // Step 2: Execute transaction (only if private key provided)
    if (quote.transaction.chainType === "tvm" && tronWeb) {
      const txDetails = quote.transaction.details;
      console.log("\n🚀 Executing transaction on Tron...");

      // Build unsigned tx via the Tron HTTP API directly (same approach as the Rust CLI).
      // TronWeb's triggerSmartContract + manual data override can fail validation in v6.
      const callValue = Number(txDetails.value || "0");
      if (callValue > Number.MAX_SAFE_INTEGER) {
        throw new Error(
          "call_value exceeds safe integer range — use the Tron API string format for high-value transactions",
        );
      }

      const triggerResponse = await fetch(
        `${configuration.rpcUrls.tron}/wallet/triggersmartcontract`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_address: tronWeb.address.toHex(txDetails.ownerAddress),
            contract_address: tronWeb.address.toHex(txDetails.to),
            function_selector: "",
            parameter: "",
            data: txDetails.data.replace(/^0x/, ""),
            call_value: callValue,
            fee_limit: TRON_FEE_LIMIT,
          }),
        },
      );

      if (!triggerResponse.ok) {
        const errorText = await triggerResponse.text();
        throw new Error(
          `Tron API error: ${triggerResponse.status} ${triggerResponse.statusText}\n${errorText}`,
        );
      }

      const triggerResult = await triggerResponse.json();
      if (!triggerResult.transaction) {
        throw new Error(
          `Failed to build Tron transaction: ${JSON.stringify(triggerResult)}`,
        );
      }

      const transaction = triggerResult.transaction;

      // Sign the transaction
      console.log("✍️  Signing transaction...");
      const signedTx = await tronWeb.trx.sign(transaction);

      // Broadcast
      console.log("📤 Broadcasting transaction...");
      const broadcastResult = await tronWeb.trx.sendRawTransaction(signedTx);

      if (!broadcastResult.result) {
        throw new Error(
          `Broadcast failed: ${JSON.stringify(broadcastResult)}`,
        );
      }

      const txHash = broadcastResult.txid;
      console.log(`📝 Transaction broadcast: ${txHash}`);
      console.log(
        `🔗 View on Tronscan: https://tronscan.org/#/transaction/${txHash}`,
      );

      // Poll for on-chain confirmation
      console.log("\n⏳ Waiting for Tron confirmation...");
      for (let i = 0; i < TRON_POLL_MAX_ATTEMPTS; i++) {
        await new Promise((r) => setTimeout(r, TRON_POLL_INTERVAL_MS));

        const info = await tronWeb.trx.getTransactionInfo(txHash);

        if (info && info.id) {
          if (info.receipt?.result === "SUCCESS") {
            console.log("✅ Tron transaction confirmed!");
            break;
          }
          if (info.receipt?.result && info.receipt.result !== "SUCCESS") {
            throw new Error(
              `Tron transaction failed: ${info.receipt.result}`,
            );
          }
        }

        if (i === TRON_POLL_MAX_ATTEMPTS - 1) {
          throw new Error("Tron transaction not confirmed within timeout");
        }
      }

      // Step 3: Monitor cross-chain transaction
      // Tron tx hashes need 0x prefix for the status API
      console.log("\n👀 Monitoring cross-chain transaction...");
      console.log("This may take several minutes...");

      try {
        const finalStatus = await crossChainClient.monitorTransaction(
          {
            originChain: CHAIN_IDS.tron,
            originTxHash: `0x${txHash}`,
          },
          {
            maxAttempts: 120, // 10 minutes
            intervalMs: 5000,
            onUpdate: (status) => {
              const timestamp = new Date().toLocaleTimeString();
              console.log(`[${timestamp}] 📊 Status: ${status.status}`);

              if (status.transactions.length > 1) {
                console.log(
                  `🔗 ${status.transactions.length} transactions found:`,
                );
                status.transactions.forEach((tx, i) => {
                  const explorerUrl =
                    tx.chainId === STATUS_CHAIN_IDS.tron
                      ? `https://tronscan.org/#/transaction/${tx.txHash?.replace(/^0x/, "")}`
                      : tx.chainId === STATUS_CHAIN_IDS.arbitrum
                        ? `https://arbiscan.io/tx/${tx.txHash}`
                        : tx.txHash;
                  console.log(`  ${i + 1}. ${tx.chain}: ${explorerUrl}`);
                });
              }
            },
          },
        );

        console.log(`\n🏁 Final Status: ${finalStatus.status}`);

        if (finalStatus.status === "bridge_filled") {
          console.log("🎉 Cross-chain swap completed successfully!");
          console.log("\n📋 Final Transaction Summary:");
          finalStatus.transactions.forEach((tx, i) => {
            const date = new Date(tx.timestamp * 1000).toLocaleString();
            const explorerUrl =
              tx.chainId === STATUS_CHAIN_IDS.tron
                ? `https://tronscan.org/#/transaction/${tx.txHash?.replace(/^0x/, "")}`
                : tx.chainId === STATUS_CHAIN_IDS.arbitrum
                  ? `https://arbiscan.io/tx/${tx.txHash}`
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
          monitorError,
        );
        console.log(
          `You can manually check status at: https://tronscan.org/#/transaction/${txHash}`,
        );
      }
    } else if (quote.transaction.chainType === "tvm") {
      console.log("\n💡 Transaction ready for execution:");
      console.log(`  📍 Contract: ${quote.transaction.details.to}`);
      console.log(`  👤 Owner: ${quote.transaction.details.ownerAddress}`);
      console.log(`  💎 Value: ${quote.transaction.details.value} sun`);
      console.log(
        `  📝 Data: ${quote.transaction.details.data.slice(0, 20)}...`,
      );
      console.log(
        "\n💡 To execute this transaction, provide TRON_PRIVATE_KEY in your environment",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (require.main === module) {
  tronToArbitrumExample().catch(console.error);
}
