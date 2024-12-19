import TokenMonitor from './monitor';
import {
  createWalletClient,
  http,
  getContract,
  erc20Abi,
  publicActions,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { ZeroExService } from './0xservice';
import getERC20Price from '../utils/getERC20Price';
import { connect, User, Order, Trade } from '../db';
import { Types } from 'mongoose';
import { intro, select } from '@clack/prompts';
import { log } from '@clack/prompts';

// Types
import { SwapData } from '../types/types';

class TradeEngine {
  constructor(
    private contractAddress: `0x${string}`,
    private privateKey: string,
    private stopLoss: string,
    private takeProfit: string,
    private amountETH: string,
    private timeout: string,
    private currentPrice: number = 0
  ) {
    this.contractAddress = contractAddress;
    this.privateKey = privateKey;
    this.stopLoss = stopLoss;
    this.takeProfit = takeProfit;
    this.amountETH = amountETH;
    this.timeout = timeout;
  }

  /**
   * Initiates the trading process. This function connects to the blockchain,
   * retrieves or creates a user, checks for existing incomplete orders, and
   * either continues the previous trade or starts a new one. It also sets up
   * monitoring for take profit, stop loss, and timeout conditions.
   *
   * @async
   * @function
   * @returns {Promise<void>} - A promise that resolves when the trading process is initiated.
   */

  async startTrade() {
    connect();

    const zeroEx = new ZeroExService(this.privateKey);
    const account = privateKeyToAccount(
      `0x${this.privateKey}` as `0x${string}`
    );
    const client = createWalletClient({
      account: account,
      chain: base,
      transport: http(),
    }).extend(publicActions);

    const publicKey = account.address;

    let user = await User.findOne({ walletAddress: publicKey }).populate({
      path: 'orders',
      populate: { path: 'trades' },
    });

    if (!user) {
      user = new User({
        walletAddress: publicKey,
        totalPnl: 0,
        orders: [],
      });
      await user.save(); // Save the new user
    }

    const erc20 = getContract({
      address: this.contractAddress as `0x${string}`,
      abi: erc20Abi,
      client: client,
    });

    const decimals: number = (await erc20.read.decimals()) as number;
    let swapData: SwapData;

    let order = await Order.findOne({
      user: user._id,
      tokenAddress: this.contractAddress,
      completed: false,
    });

    if (order) {
      intro('🤔 Existing incomplete order found');
      console.info(`
        📃 Trade Info:
        ---------------------------------
        Token Address   : ${order.tokenAddress}
        Timestamp       : ${order.timestamp}
        Amount (ETH)    : ${order.amount}
        Take Profit (%) : ${order.tp}
        Stop Loss (%)   : ${order.sl}
        Timeout (sec)   : ${order.timeout}
        ---------------------------------
      `);

      const continueTrade = await select({
        message: 'Do you want to continue the previous trade?',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      });
      if (continueTrade === 'yes') {
        log.info('Continuing previous trade!');
        this.takeProfit =
          order.tp && !isNaN(order.tp) ? order.tp.toString() : this.takeProfit;
        this.stopLoss =
          order.sl && !isNaN(order.sl) ? order.sl.toString() : this.stopLoss;
        this.amountETH =
          order.amount && !isNaN(order.amount)
            ? order.amount.toString()
            : this.amountETH;
        this.timeout =
          order.timeout && !isNaN(order.timeout)
            ? order.timeout.toString()
            : this.timeout;
      } else {
        order = null;
      }
    }

    if (!order) {
      log.info('Buying ERC20 using WETH');

      swapData = (await zeroEx.swap(
        this.contractAddress as `0x${string}`,
        +this.amountETH,
        'buy'
      )) as SwapData;

      order = new Order({
        user: user._id, // Assign the user to the order
        tokenAddress: this.contractAddress,
        timestamp: new Date(),
        amount: this.amountETH,
        tokenAmount: swapData ? +swapData.quote.buyAmount : 0,
        decimals: decimals,
        tp: parseFloat(this.takeProfit),
        sl: parseFloat(this.stopLoss),
        pnl: 0, // Initial PnL is 0
        timeout: this.timeout,
        completed: false,
        trades: [],
      });
      await order.save();
      user.orders.push(order._id); // Add the order to the user's orders array
      await user.save(); // make sure to save this

      if (swapData && swapData.hash) {
        const buyTrade = new Trade({
          orderId: order._id,
          txnHash: swapData.hash,
          tokenAddress: this.contractAddress,
          ethAmount: +this.amountETH,
          timestamp: new Date(),
          tokenAmount: +swapData.quote.buyAmount,
          tradeType: 'buy',
        });
        await buyTrade.save();
        order.trades.push(buyTrade._id);
        await order.save();
      }
    }

    this.currentPrice = await getERC20Price(this.contractAddress, decimals);

    const monitor = new TokenMonitor(
      this.contractAddress,
      parseFloat(this.takeProfit),
      parseFloat(this.stopLoss),
      parseInt(this.timeout, 10),
      this.currentPrice,
      decimals
    );

    monitor.on('tpReached', (newPrice: number) => {
      log.success('📈 Take Profit reached:');
      monitor.stopMonitoring();
      this.completeTrade(
        publicKey,
        order._id,
        +order.tokenAmount,
        newPrice,
        decimals
      );
    });

    monitor.on('slReached', (newPrice: number) => {
      log.success('📉 Stop Loss reached:, Completing Trade!');
      monitor.stopMonitoring();
      this.completeTrade(
        publicKey,
        order._id,
        +order.tokenAmount,
        newPrice,
        decimals
      );
    });

    monitor.on('timeoutReached', (newPrice: number) => {
      log.success('⌚ Timeout Reached');
      monitor.stopMonitoring();
      this.completeTrade(
        publicKey,
        order._id,
        +order.tokenAmount,
        newPrice,
        decimals
      );
    });

    monitor.startMonitoring();
  }
  async completeTrade(
    publicKey: `0x${string}`,
    orderId: Types.ObjectId,
    amount: number,
    newPrice: number,
    decimals: number
  ) {
    const zeroEx = new ZeroExService(this.privateKey);
    const computedAmount = amount * 10 ** -decimals;

    log.info('Selling ERC20 for WETH');

    const swapData = await zeroEx.swap(
      this.contractAddress as `0x${string}`,
      +computedAmount,
      'sell'
    );
    const order = await Order.findById(orderId);
    if (order && swapData) {
      const pnl = ((newPrice - this.currentPrice) * amount) / 10 ** decimals;

      const user = await User.findOne({ walletAddress: publicKey }).populate({
        path: 'orders',
        populate: { path: 'trades' },
      });

      if (user) {
        user.totalPnl += pnl;
        await user.save();
      }

      order.completed = true;
      order.pnl = pnl;

      const buyTrade = new Trade({
        orderId: order._id,
        txnHash: swapData.hash,
        tokenAddress: this.contractAddress,
        ethAmount: +this.amountETH,
        timestamp: new Date(),
        tradeType: 'sell',
      });
      await buyTrade.save();
      order.trades.push(buyTrade._id);
      await order.save();

      log.info(`✔️  PnL for the trade: ${pnl} USD`);
    }
    log.success('😊  Trade complete');
    process.exit(0);
  }
}

export default TradeEngine;
