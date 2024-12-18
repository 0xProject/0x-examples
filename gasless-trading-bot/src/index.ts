#!/usr/bin/env node

import chalk from 'chalk';
import figlet from 'figlet';
import { program } from 'commander';
import { intro, text, isCancel } from '@clack/prompts';
import Validator from './utils/validate'; // Import the Validator class
import TradeEngine from './engine'; // Import the TradeEngine class

const logo = figlet.textSync('0x CLI', { font: 'Standard' });

program
  .command('start')
  .description('Start interactive terminal')
  .action(async () => {
    console.clear(); // Clear the console
    console.log(chalk.yellow(logo)); // Display logo
    console.log('\n'); // Add some spacing

    // Interactive prompts using @clack/prompts
    intro(chalk.green('Welcome to the interactive terminal!'));

    const contractAddress = await text({
      message: 'Enter Contract Address:',
      validate: (value) =>
        Validator.isValidContractAddress(value)
          ? undefined
          : 'Invalid contract address. Please enter a valid Ethereum address.',
    });
    if (isCancel(contractAddress)) process.exit(0);

    const privateKey = await text({
      message: 'Enter Private Key:',
      validate: (value) =>
        Validator.isValidPrivateKey(value)
          ? undefined
          : 'Invalid private key. Please enter a valid 64-character hexadecimal string.',
    });
    if (isCancel(privateKey)) process.exit(0);

    const stopLoss = await text({
      message: 'Enter Stop Loss Percentage (Range: 0 - 100):',
      validate: (value) => {
        const num = parseFloat(value);
        return Validator.isValidStopLoss(num)
          ? undefined
          : 'Invalid Stop Loss (SL). Please enter a value between 0 and 100.';
      },
    });
    if (isCancel(stopLoss)) process.exit(0);

    const takeProfit = await text({
      message: 'Enter Take Profit Percentage (Range: 0 - 1000):',
      validate: (value) => {
        const num = parseFloat(value);
        return Validator.isValidTakeProfit(num)
          ? undefined
          : 'Invalid Take Profit (TP). Please enter a value between 0 and 1000.';
      },
    });
    if (isCancel(takeProfit)) process.exit(0);

    const amountETH = await text({
      message: 'Enter Amount in ETH: (WETH on Base)',
      validate: (value) => {
        const num = parseFloat(value);
        return Validator.isValidETHAmount(num)
          ? undefined
          : 'Invalid ETH amount. Please enter a positive number.';
      },
    });
    if (isCancel(amountETH)) process.exit(0);

    const timeout = await text({
      message: 'Enter Timeout (in seconds):',
      validate: (value) => {
        const num = parseInt(value, 10);
        return Validator.isValidTimeout(num)
          ? undefined
          : 'Invalid timeout. Please enter a positive integer.';
      },
    });
    if (isCancel(timeout)) process.exit(0);

    const engine = new TradeEngine(
      contractAddress as `0x${string}`,
      privateKey,
      stopLoss,
      takeProfit,
      amountETH,
      timeout
    );
    engine.startTrade();
  });

program.parse();
