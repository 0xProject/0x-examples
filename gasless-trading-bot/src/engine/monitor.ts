import { EventEmitter } from 'events';
import getERC20Price from '../utils/getERC20Price';
import { spinner } from '@clack/prompts';

const s = spinner();

const interval = 5 * 1000; // 5 seconds
let totalTimeforTrade = 0;

/**
 * TokenMonitor class extends EventEmitter to monitor the price of an ERC20 token.
 * It emits events when the price reaches certain thresholds or a timeout is reached.
 *
 * @class TokenMonitor
 * @extends {EventEmitter}
 *
 * @property {`0x${string}`} contractAddress - The contract address of the ERC20 token.
 * @property {number} tp - Take profit percentage.
 * @property {number} sl - Stop loss percentage.
 * @property {number} timeout - Timeout duration in seconds.
 * @property {number} currentPrice - The current price of the token.
 * @property {number} erc20Decimals - The number of decimals for the ERC20 token.
 * @property {NodeJS.Timer | null} intervalId - The interval ID for the monitoring process.
 *
 * @constructor
 * @param {`0x${string}`} contractAddress - The contract address of the ERC20 token.
 * @param {number} tp - Take profit percentage.
 * @param {number} sl - Stop loss percentage.
 * @param {number} timeout - Timeout duration in seconds.
 * @param {number} currentPrice - The current price of the token.
 * @param {number} erc20Decimals - The number of decimals for the ERC20 token.
 *
 * @method startMonitoring - Starts the monitoring process.
 * @method stopMonitoring - Stops the monitoring process.
 * @method fetchNewPrice - Fetches the new price of the token.
 *
 * @event 'timeoutReached' - Emitted when the timeout is reached.
 * @event 'tpReached' - Emitted when the take profit threshold is reached.
 * @event 'slReached' - Emitted when the stop loss threshold is reached.
 */

class TokenMonitor extends EventEmitter {
  private contractAddress: `0x${string}`;
  private tp: number;
  private sl: number;
  private timeout: number;
  private currentPrice: number;
  private erc20Decimals: number;
  private intervalId: NodeJS.Timer | null = null;

  constructor(
    contractAddress: `0x${string}`,
    tp: number,
    sl: number,
    timeout: number,
    currentPrice: number,
    erc20Decimals: number
  ) {
    super();
    this.contractAddress = contractAddress;
    this.tp = tp;
    this.sl = sl;
    this.timeout = timeout;
    this.currentPrice = currentPrice;
    this.erc20Decimals = erc20Decimals;
  }

  startMonitoring() {
    if (this.intervalId !== null) {
      console.warn('Monitoring already started!');
      return;
    }

    s.start('Monitoring Token Price');

    this.intervalId = setInterval(async () => {
      // Check if timeout is reached
      if (totalTimeforTrade >= this.timeout * 1000) {
        s.stop('Monitoring Stopped');
        const newPrice = await this.fetchNewPrice();
        this.emit('timeoutReached', newPrice);
        this.stopMonitoring(); // Stop monitoring after timeout
        return;
      }

      const newPrice = await this.fetchNewPrice();
      if (newPrice === 0) {
        console.log('Price is 0, retrying');
      } else if (
        newPrice !== null &&
        newPrice >= this.currentPrice * (1 + this.tp / 100)
      ) {
        s.stop('Monitoring Stopped');
        this.emit('tpReached', newPrice);
      } else if (
        newPrice !== null &&
        newPrice <= this.currentPrice * (1 - this.sl / 100)
      ) {
        s.stop('Monitoring Stopped');
        this.emit('slReached', newPrice);
      }
      totalTimeforTrade += interval;
    }, interval); // Check every 5 seconds
  }

  stopMonitoring() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async fetchNewPrice(): Promise<number | null> {
    const priceData = await getERC20Price(
      this.contractAddress,
      this.erc20Decimals
    );
    if (priceData === null) {
      return null;
    }
    return priceData as number;
  }
  catch(error: unknown) {
    console.error('Error fetching price:', error);
    return undefined;
  }
}

export default TokenMonitor;
