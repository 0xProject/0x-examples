import { config as dotenv } from "dotenv";
import { Transaction, WIF, p2wpkh } from "@scure/btc-signer";
import { pubECDSA } from "@scure/btc-signer/utils";
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

/**
 * Example: Bitcoin to Arbitrum cross-chain swap
 * Swaps native BTC to USDC on Arbitrum
 */
async function bitcoinToArbitrumExample() {
  console.log("🌉 Bitcoin to Arbitrum Cross-Chain Swap Example");
  console.log("===============================================");

  const crossChainClient = new CrossChainClient(configuration.zeroexApiKey);

  let privateKey: Uint8Array | null = null;
  let userAddress: string;

  if (configuration.bitcoinPrivateKey) {
    privateKey = WIF().decode(configuration.bitcoinPrivateKey);
    const address = p2wpkh(pubECDSA(privateKey, true)).address;
    if (!address) {
      throw new Error(
        "Failed to derive a P2WPKH address from BITCOIN_PRIVATE_KEY",
      );
    }
    userAddress = address;
  } else {
    userAddress = DEFAULT_ADDRESSES.BITCOIN;
    console.log(
      "⚠️  No BITCOIN_PRIVATE_KEY provided - running in quote-only mode",
    );
  }

  const sellAmount = "50000"; // 0.0005 BTC (8 decimals)

  const receiverAddress =
    configuration.evmReceiverAddress || DEFAULT_ADDRESSES.EVM;

  if (configuration.bitcoinPrivateKey && !configuration.evmReceiverAddress) {
    console.log(
      "❌ SAFETY: EVM_RECEIVER_ADDRESS must be set when executing transactions",
    );
    console.log(
      "This prevents accidentally sending funds to a default address",
    );
    console.log("Set EVM_RECEIVER_ADDRESS in your environment or .env file");
    return;
  }

  console.log(`👤 Sender (Bitcoin): ${userAddress}`);
  console.log(`🎯 Receiver (Arbitrum): ${receiverAddress}`);

  try {
    console.log("\n📊 Getting cross-chain quote...");
    const quoteResponse = await crossChainClient.getQuotes({
      originChain: CHAIN_IDS.bitcoin,
      destinationChain: CHAIN_IDS.arbitrum,
      sellToken: TOKEN_ADDRESSES.BTC,
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
    console.log(`  💰 Send: ${Number(quote.sellAmount) / 1e8} BTC`);
    console.log(`  💱 Receive: ${Number(quote.buyAmount) / 1e6} USDC`);
    console.log(`  🛡️ Min Receive: ${Number(quote.minBuyAmount) / 1e6} USDC`);
    console.log(`  ⏱️ Estimated Time: ${quote.estimatedTimeSeconds}s`);

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

    if (quote.gasCosts.chainType === "btc") {
      console.log(
        `  ⛽ Bitcoin fee: ${Number(quote.gasCosts.total) / 1e8} BTC`,
      );
    }

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

    if (quote.transaction.chainType === "btc" && privateKey) {
      console.log("\n🚀 Executing transaction on Bitcoin...");
      const psbtHex = quote.transaction.details.psbt;
      if (!/^[0-9a-fA-F]+$/.test(psbtHex) || psbtHex.length % 2 !== 0) {
        throw new Error("Quote PSBT is not hex");
      }
      const tx = Transaction.fromPSBT(Buffer.from(psbtHex, "hex"), {
        allowUnknownOutputs: true,
      });
      console.log("✍️  Signing PSBT...");
      tx.sign(privateKey);
      tx.finalize();

      console.log("📤 Broadcasting transaction...");
      const response = await fetch(`${configuration.rpcUrls.bitcoin}/tx`, {
        method: "POST",
        body: tx.hex,
      });
      if (!response.ok) {
        throw new Error(
          `Broadcast failed: ${response.status} ${await response.text()}`,
        );
      }
      const txid = (await response.text()).trim();
      console.log(`📝 Transaction broadcast: ${txid}`);
      console.log(`🔗 View on mempool.space: https://mempool.space/tx/${txid}`);

      console.log("\n👀 Monitoring cross-chain transaction...");
      console.log("This may take about an hour...");

      try {
        const finalStatus = await crossChainClient.monitorTransaction(
          {
            originChain: CHAIN_IDS.bitcoin,
            originTxHash: txid,
          },
          {
            maxAttempts: 240, // 60 minutes
            intervalMs: 15_000,
            onUpdate: (status) => {
              const timestamp = new Date().toLocaleTimeString();
              console.log(`[${timestamp}] 📊 Status: ${status.status}`);

              if (status.transactions.length > 1) {
                console.log(
                  `🔗 ${status.transactions.length} transactions found:`,
                );
                status.transactions.forEach((txInfo, i) => {
                  const explorerUrl =
                    txInfo.chainId === STATUS_CHAIN_IDS.bitcoin
                      ? `https://mempool.space/tx/${txInfo.txHash?.replace(/^0x/, "")}`
                      : txInfo.chainId === STATUS_CHAIN_IDS.arbitrum
                        ? `https://arbiscan.io/tx/${txInfo.txHash}`
                        : txInfo.txHash;
                  console.log(`  ${i + 1}. ${txInfo.chain}: ${explorerUrl}`);
                });
              }
            },
          },
        );

        console.log(`\n🏁 Final Status: ${finalStatus.status}`);

        if (finalStatus.status === "bridge_filled") {
          console.log("🎉 Cross-chain swap completed successfully!");
          console.log("\n📋 Final Transaction Summary:");
          finalStatus.transactions.forEach((txInfo, i) => {
            const date = new Date(txInfo.timestamp * 1000).toLocaleString();
            const explorerUrl =
              txInfo.chainId === STATUS_CHAIN_IDS.bitcoin
                ? `https://mempool.space/tx/${txInfo.txHash?.replace(/^0x/, "")}`
                : txInfo.chainId === STATUS_CHAIN_IDS.arbitrum
                  ? `https://arbiscan.io/tx/${txInfo.txHash}`
                  : txInfo.txHash;
            console.log(
              `  ${i + 1}. ${txInfo.chain}: ${explorerUrl} (${date})`,
            );
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
          `You can manually check status at: https://mempool.space/tx/${txid}`,
        );
      }
    } else if (quote.transaction.chainType === "btc") {
      const psbt = quote.transaction.details.psbt;
      console.log("\n💡 Transaction ready for execution:");
      console.log(`  📝 PSBT (${psbt.length} hex chars): ${psbt.slice(0, 20)}...`);
      console.log(
        "\n💡 To execute this transaction, provide BITCOIN_PRIVATE_KEY in your environment",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (require.main === module) {
  bitcoinToArbitrumExample().catch(console.error);
}
