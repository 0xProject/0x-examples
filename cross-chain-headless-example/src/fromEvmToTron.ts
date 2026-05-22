import { config as dotenv } from "dotenv";
import { createWalletClient, http, publicActions } from "viem";
import { arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi } from "viem";
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
 * Example: Arbitrum to Tron cross-chain swap
 * Swaps USDC on Arbitrum to USDT on Tron
 */
async function arbitrumToTronExample() {
  console.log("🌉 Arbitrum to Tron Cross-Chain Swap Example");
  console.log("=============================================");

  const crossChainClient = new CrossChainClient(configuration.zeroexApiKey);

  // Setup wallet if private key is provided
  let account = null;
  let walletClient = null;
  let userAddress: string;

  if (configuration.evmPrivateKey) {
    const normalizedKey = configuration.evmPrivateKey.startsWith("0x")
      ? configuration.evmPrivateKey
      : `0x${configuration.evmPrivateKey}`;
    account = privateKeyToAccount(normalizedKey as `0x${string}`);
    walletClient = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(configuration.rpcUrls.arbitrum),
    }).extend(publicActions);
    userAddress = account.address;
  } else {
    // Use default address for quote-only mode
    userAddress = DEFAULT_ADDRESSES.EVM;
    console.log(
      "⚠️  No EVM_PRIVATE_KEY provided - running in quote-only mode",
    );
  }

  const sellAmount = "4000000"; // 4 USDC (6 decimals)

  // Get receiver address or use default
  const receiverAddress =
    configuration.tronReceiverAddress || DEFAULT_ADDRESSES.TRON;

  // Safety check: if executing transactions, require explicit receiver address
  if (configuration.evmPrivateKey && !configuration.tronReceiverAddress) {
    console.log(
      "❌ SAFETY: TRON_RECEIVER_ADDRESS must be set when executing transactions",
    );
    console.log(
      "This prevents accidentally sending funds to a default address",
    );
    console.log(
      "Set TRON_RECEIVER_ADDRESS in your environment or .env file",
    );
    return;
  }

  console.log(`👤 Sender (Arbitrum): ${userAddress}`);
  console.log(`🎯 Receiver (Tron): ${receiverAddress}`);

  try {
    // Step 1: Get the best quote
    console.log("\n📊 Getting cross-chain quote...");
    const quoteResponse = await crossChainClient.getQuotes({
      originChain: CHAIN_IDS.arbitrum,
      destinationChain: CHAIN_IDS.tron,
      sellToken: TOKEN_ADDRESSES.USDC_ARB,
      buyToken: TOKEN_ADDRESSES.USDT_TRON,
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
    console.log(`  💰 Send: ${Number(quote.sellAmount) / 1e6} USDC`);
    console.log(`  💱 Receive: ${Number(quote.buyAmount) / 1e6} USDT`);
    console.log(`  🛡️ Min Receive: ${Number(quote.minBuyAmount) / 1e6} USDT`);
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

    // Check for issues and handle allowance
    if (quote.issues.allowance) {
      console.log("⚠️  Allowance issue detected - approval needed");
      console.log(`  📍 Spender: ${quote.issues.allowance.spender}`);
      console.log(
        `  💰 Current allowance: ${quote.issues.allowance.actual}`,
      );

      if (walletClient) {
        console.log("\n🔧 Handling token approval...");

        console.log("📤 Sending approval transaction...");
        const tokenAddress = TOKEN_ADDRESSES.USDC_ARB;
        const approveTxHash = await walletClient.writeContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [
            quote.issues.allowance.spender as `0x${string}`,
            BigInt(sellAmount),
          ],
        });
        console.log(`📝 Approval sent: ${approveTxHash}`);

        console.log("⏳ Waiting for approval confirmation...");
        await walletClient.waitForTransactionReceipt({
          hash: approveTxHash,
          confirmations: 1,
        });
        console.log("✅ Approval confirmed");
        console.log(
          `🔗 View approval: https://arbiscan.io/tx/${approveTxHash}`,
        );
      }
    }

    // Step 2: Execute transaction (only if private key provided)
    if (quote.transaction.chainType === "evm" && walletClient) {
      console.log("\n🚀 Executing transaction on Arbitrum...");

      const txRequest = {
        to: quote.transaction.details.to as `0x${string}`,
        data: quote.transaction.details.data as `0x${string}`,
        value: BigInt(quote.transaction.details.value),
        gas: quote.transaction.details.gas
          ? BigInt(quote.transaction.details.gas)
          : undefined,
      };

      console.log("📋 Transaction details:");
      console.log(`  📍 To: ${txRequest.to}`);
      console.log(`  💎 Value: ${txRequest.value} wei`);
      console.log(`  ⛽ Gas: ${txRequest.gas?.toString() || "estimated"}`);

      // Send transaction directly (API already simulated)
      console.log("📤 Sending transaction...");
      const txHash = await walletClient.sendTransaction(txRequest);
      console.log(`📝 Transaction sent: ${txHash}`);

      console.log("⏳ Waiting for transaction confirmation on Arbitrum...");
      const receipt = await walletClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 2,
      });
      console.log(
        `✅ Transaction confirmed in block: ${receipt.blockNumber}`,
      );
      console.log(`🔗 View on Arbiscan: https://arbiscan.io/tx/${txHash}`);

      // Step 3: Monitor cross-chain transaction
      console.log("\n👀 Monitoring cross-chain transaction...");
      console.log(
        "This may take several minutes for the bridge to complete...",
      );

      try {
        const finalStatus = await crossChainClient.monitorTransaction(
          {
            originChain: CHAIN_IDS.arbitrum,
            originTxHash: txHash,
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
                    tx.chainId === STATUS_CHAIN_IDS.arbitrum
                      ? `https://arbiscan.io/tx/${tx.txHash}`
                      : tx.chainId === STATUS_CHAIN_IDS.tron
                        ? `https://tronscan.org/#/transaction/${tx.txHash?.replace(/^0x/, "")}`
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
              tx.chainId === STATUS_CHAIN_IDS.arbitrum
                ? `https://arbiscan.io/tx/${tx.txHash}`
                : tx.chainId === STATUS_CHAIN_IDS.tron
                  ? `https://tronscan.org/#/transaction/${tx.txHash?.replace(/^0x/, "")}`
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
          `You can manually check status at: https://arbiscan.io/tx/${txHash}`,
        );
      }
    } else if (quote.transaction.chainType === "evm") {
      console.log("\n💡 Transaction ready for execution:");
      console.log(`  📍 To: ${quote.transaction.details.to}`);
      console.log(`  💎 Value: ${quote.transaction.details.value} wei`);
      console.log(
        `  📝 Data: ${quote.transaction.details.data.slice(0, 20)}...`,
      );
      console.log(
        "\n💡 To execute this transaction, provide EVM_PRIVATE_KEY in your environment",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (require.main === module) {
  arbitrumToTronExample().catch(console.error);
}
