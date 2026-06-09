import { config as dotenv } from "dotenv";
import { Connection, Keypair } from "@solana/web3.js";
import { z } from "zod";
import bs58 from "bs58";

dotenv();

const SOLANA_DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

const EnvironmentConfigurationSchema = z.object({
  ZEROEX_API_KEY: z.string().nonempty(),
  PRIVATE_KEY: z.string().optional(),
  RPC_URL: z.url().default(SOLANA_DEFAULT_RPC_URL),
  DRY_RUN: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v !== "false"),
});

interface KeypairConfig {
  keypair: Keypair;
  isUserProvided: boolean;
}

export interface Config {
  zeroexApiKey: string;
  connection: Connection;
  keypairConfig: KeypairConfig;
  dryRun: boolean;
}

export function fetchConfig(): Config {
  const environmentConfiguration = EnvironmentConfigurationSchema.parse(
    process.env
  );

  return {
    zeroexApiKey: environmentConfiguration.ZEROEX_API_KEY,
    connection: new Connection(environmentConfiguration.RPC_URL),
    dryRun: environmentConfiguration.DRY_RUN,
    keypairConfig: {
      keypair: environmentConfiguration.PRIVATE_KEY
        ? Keypair.fromSecretKey(
            bs58.decode(environmentConfiguration.PRIVATE_KEY)
          )
        : Keypair.generate(),
      isUserProvided: !!environmentConfiguration.PRIVATE_KEY,
    },
  };
}
