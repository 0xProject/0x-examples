import config from './config';

const { ZERO_EX_API_KEY, USDC_ADDRESS, CHAIN_ID } = config;

// Constants for USDC
const USDC_DECIMALS = 6;

let erc20Price: number = 0;

// Headers for the 0x API
const headers = new Headers({
  'Content-Type': 'application/json',
  '0x-api-key': ZERO_EX_API_KEY,
  '0x-version': 'v2',
});

/**
 * Fetches the price of an ERC20 token in terms of USDC.
 *
 * @param address - The contract address of the ERC20 token.
 * @param decimals - The number of decimals the ERC20 token uses.
 * @returns A promise that resolves to the price of the ERC20 token in USDC.
 *
 * @throws Will log an error message if there is an issue fetching the price.
 *
 * @example
 * ```typescript
 * const price = await getERC20Price('0x1234567890abcdef1234567890abcdef12345678', 18);
 * console.log(price); // Outputs the price of the token in USDC
 * ```
 */

async function getERC20Price(
  address: `0x${string}`,
  decimals: number
): Promise<number> {
  try {
    const priceParams = new URLSearchParams({
      chainId: CHAIN_ID,
      sellToken: address,
      buyToken: USDC_ADDRESS,
      sellAmount: (10 ** decimals).toString(), // 1 ETH in wei
    });

    const priceResponse = await fetch(
      'https://api.0x.org/swap/permit2/price?' + priceParams.toString(),
      { headers: headers }
    );

    const data = await priceResponse.json();
    if (data.buyAmount) {
      erc20Price = +data.buyAmount * 10 ** -USDC_DECIMALS; // ETH to USD
    } else if (!data.liquidityAvailable) {
      console.error('Liquidity not available');
    }
  } catch (error) {
    console.error('Error fetching price:', error);
  }
  return erc20Price;
}

export default getERC20Price;
