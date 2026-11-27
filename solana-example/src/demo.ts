import { type Address, address, type Rpc, type SolanaRpcApi } from "@solana/kit";

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const MIN_DEMO_TAKER_LAMPORTS = 100_000_000n; // 0.1 SOL

// Lets the example run with only an API key: it simulates the swap as the fee
// payer of a recent transaction on `mint` that is a wallet (owned by the
// System Program, so it can pay fees) holding enough SOL. Nothing signs for it.
export async function findDemoTaker(rpc: Rpc<SolanaRpcApi>, mint: string): Promise<Address> {
  const signatures = await rpc.getSignaturesForAddress(address(mint), { limit: 10 }).send();
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
