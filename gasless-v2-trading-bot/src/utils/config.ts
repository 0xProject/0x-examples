import { config as dotenv } from 'dotenv';

// load env vars
dotenv();

/**
 * Configuration object containing environment variables and default values.
 *
 * @property {string} PRIVATE_KEY - The private key used for authentication, defaults to an empty string if not provided.
 * @property {string} ZERO_EX_API_KEY - The API key for 0x, defaults to an empty string if not provided.
 * @property {`0x${string}`} INPUT_TOKEN - The address of the input token, defaults to WETH address if not provided.
 * @property {`0x${string}`} USDC_ADDRESS - The address of the USDC token, defaults to a specific address if not provided. Required for getting prices of ERC20 tokens
 * @property {string} CHAIN_ID - The chain ID, defaults to '8453' (BASE) if not provided.
 */

export default {
  PRIVATE_KEY: process.env.PRIVATE_KEY ?? '',
  ZERO_EX_API_KEY: process.env.ZERO_EX_API_KEY ?? '',
  INPUT_TOKEN:
    (process.env.WETH_ADDRESS as `0x${string}`) ??
    '0x4200000000000000000000000000000000000006', // Example : WETH
  USDC_ADDRESS:
    (process.env.USDC_ADDRESS as `0x${string}`) ??
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  CHAIN_ID: process.env.CHAIN_ID ?? '8453', // BASE
};
