import "dotenv/config";
import { alchemy, base } from "@account-kit/infra";
import { createModularAccountV2Client } from "@account-kit/smart-contracts";
import { LocalAccountSigner } from "@aa-sdk/core";
import { type Hex } from "viem";

const { PRIVATE_KEY, ALCHEMY_API_KEY } = process.env;
if (!PRIVATE_KEY) throw new Error("missing PRIVATE_KEY");
if (!ALCHEMY_API_KEY) throw new Error("missing ALCHEMY_API_KEY");

async function main() {
  const client = await createModularAccountV2Client({
    mode: "default",
    chain: base,
    transport: alchemy({ apiKey: ALCHEMY_API_KEY }),
    signer: LocalAccountSigner.privateKeyToAccountSigner(
      `0x${PRIVATE_KEY}` as Hex
    ),
  });

  console.log("Smart wallet address (MAv2):", client.account.address);
  console.log("\nThis address exists before the contract is deployed — fund it now, and the contract deploys automatically on first use.");
  console.log("\nFund this address on Base with:");
  console.log("  - 1 USDC (to sell)");
  console.log("  - ~0.005 ETH (covers deployment + one-time Permit2 approval)");
  console.log("\nAfter the first transaction, all future swaps are fully gasless.");
}

main().catch(console.error);
