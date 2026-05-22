import { z } from "zod";
import { isAddress as isEvmAddress } from "viem";
import { isAddress as isSolanaAddress } from "@solana/addresses";

const EnvironmentConfigurationSchema = z.object({
  ZEROEX_API_KEY: z.string(),
  EVM_PRIVATE_KEY: z
    .string()
    .optional()
    .refine((key) => {
      if (!key) return true; // Optional field
      // Remove 0x prefix if present
      const cleanKey = key.startsWith("0x") ? key.slice(2) : key;
      // Must be exactly 64 hex characters
      return /^[0-9a-fA-F]{64}$/.test(cleanKey);
    }, "Invalid EVM private key format (must be 64 hex characters, optionally prefixed with 0x)"),
  SOLANA_PRIVATE_KEY: z
    .string()
    .optional()
    .refine((key) => {
      if (!key) return true; // Optional field
      // Must be 44 or 88 characters and valid base58
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{44,88}$/;
      return base58Regex.test(key);
    }, "Invalid Solana private key format (must be 44 or 88 character base58 string)"),
  SOLANA_GAS_PAYER_PRIVATE_KEY: z
    .string()
    .optional()
    .refine((key) => {
      if (!key) return true; // Optional field
      // Must be 44 or 88 characters and valid base58
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{44,88}$/;
      return base58Regex.test(key);
    }, "Invalid Solana gas payer private key format (must be 44 or 88 character base58 string)"),
  TRON_PRIVATE_KEY: z
    .string()
    .optional()
    .refine((key) => {
      if (!key) return true; // Optional field
      // Must be exactly 64 hex characters (no 0x prefix)
      const cleanKey = key.startsWith("0x") ? key.slice(2) : key;
      return /^[0-9a-fA-F]{64}$/.test(cleanKey);
    }, "Invalid Tron private key format (must be 64 hex characters)"),
  EVM_RECEIVER_ADDRESS: z
    .string()
    .optional()
    .refine((address) => {
      if (!address) return true; // Optional field
      return isEvmAddress(address);
    }, "Invalid EVM address format"),
  SOLANA_RECEIVER_ADDRESS: z
    .string()
    .optional()
    .refine((address) => {
      if (!address) return true; // Optional field
      try {
        return isSolanaAddress(address);
      } catch {
        return false;
      }
    }, "Invalid Solana address format"),
  TRON_RECEIVER_ADDRESS: z
    .string()
    .optional()
    .refine((address) => {
      if (!address) return true; // Optional field
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    }, "Invalid Tron address format (must be Base58Check starting with T)"),
  BASE_RPC_URL: z.string().url().default("https://mainnet.base.org"),
  ARBITRUM_RPC_URL: z.string().url().default("https://arb1.arbitrum.io/rpc"),
  SOLANA_RPC_URL: z
    .string()
    .url()
    .default("https://api.mainnet-beta.solana.com"),
  TRON_RPC_URL: z.string().url().default("https://api.trongrid.io"),
});

export interface Config {
  zeroexApiKey: string;
  evmPrivateKey?: string;
  solanaPrivateKey?: string;
  solanaGasPayerPrivateKey?: string;
  tronPrivateKey?: string;
  evmReceiverAddress?: string;
  solanaReceiverAddress?: string;
  tronReceiverAddress?: string;
  rpcUrls: {
    base: string;
    arbitrum: string;
    solana: string;
    tron: string;
  };
}

export function loadConfig(): Config {
  const environmentConfiguration = EnvironmentConfigurationSchema.parse(
    process.env,
  );

  return {
    zeroexApiKey: environmentConfiguration.ZEROEX_API_KEY,
    evmPrivateKey: environmentConfiguration.EVM_PRIVATE_KEY,
    solanaPrivateKey: environmentConfiguration.SOLANA_PRIVATE_KEY,
    solanaGasPayerPrivateKey: environmentConfiguration.SOLANA_GAS_PAYER_PRIVATE_KEY,
    tronPrivateKey: environmentConfiguration.TRON_PRIVATE_KEY,
    evmReceiverAddress: environmentConfiguration.EVM_RECEIVER_ADDRESS,
    solanaReceiverAddress: environmentConfiguration.SOLANA_RECEIVER_ADDRESS,
    tronReceiverAddress: environmentConfiguration.TRON_RECEIVER_ADDRESS,
    rpcUrls: {
      base: environmentConfiguration.BASE_RPC_URL,
      arbitrum: environmentConfiguration.ARBITRUM_RPC_URL,
      solana: environmentConfiguration.SOLANA_RPC_URL,
      tron: environmentConfiguration.TRON_RPC_URL,
    },
  };
}

export const CHAIN_IDS = {
  base: 8453,
  arbitrum: 42161,
  solana: "solana",
  tron: "tron",
} as const;

export const TOKEN_ADDRESSES = {
  // Base
  ETH_BASE: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  USDC_BASE: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  WETH_BASE: "0x4200000000000000000000000000000000000006",

  // Arbitrum
  ETH_ARB: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  USDC_ARB: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  WETH_ARB: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",

  // Solana
  SOL: "So11111111111111111111111111111111111111112",
  WSOL: "So11111111111111111111111111111111111111112",
  USDC_SOL: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",

  // Tron
  USDT_TRON: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
} as const;

// Numeric chain IDs returned in status API responses
// (different from the string identifiers used in the quote API for non-EVM chains)
export const STATUS_CHAIN_IDS = {
  base: 8453,
  arbitrum: 42161,
  solana: 999999999991,
  tron: 999999999993,
} as const;

export const DEFAULT_ADDRESSES = {
  EVM: "0xABf40AADf960e20B4283dc5A06387A429Ba02456",
  SOLANA: "9FzTJNUfMVSPPNEsUDfUHuE1gSE7uDBamcGHq1CseUUZ",
  TRON: "TJnN6n7T3KTSzEyUMUcHeq3J4gwSDmUuZv",
} as const;
