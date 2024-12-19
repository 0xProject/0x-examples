import {
  createWalletClient,
  http,
  getContract,
  erc20Abi,
  parseUnits,
  maxUint256,
  publicActions,
  Hex,
  concat,
  numberToHex,
  size,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import config from '../utils/config';
import { splitSignature, SignatureType } from '../utils/signature';
import wethAbi from './abi/weth-abi';
import { log } from '@clack/prompts';
import { spinner, select } from '@clack/prompts';

// Types
import type {
  TradeDataToSubmit,
  TradeDataRequestBody,
  ApprovalDataToSubmit,
} from '../types/types';

const s = spinner();

const { ZERO_EX_API_KEY, INPUT_TOKEN } = config;

export class ZeroExService {
  private client;
  private headers;
  private pk: string;

  constructor(privateKey: string) {
    this.pk = privateKey;
    this.client = createWalletClient({
      account: privateKeyToAccount(`0x${this.pk}` as `0x${string}`),
      chain: base,
      transport: http(),
    }).extend(publicActions);

    if (!ZERO_EX_API_KEY) throw new Error('missing ZERO_EX_API_KEY.');
    this.headers = new Headers({
      'Content-Type': 'application/json',
      '0x-api-key': ZERO_EX_API_KEY,
      '0x-version': 'v2',
    });
  }

  /**
   * Executes a swap operation for ERC20 tokens.
   *
   * @param erc20Address - The address of the ERC20 token contract.
   * @param amount - The amount of tokens to swap.
   * @param type - The type of swap operation, either 'buy' or 'sell'.
   * @param slippagePercentage - The allowed slippage percentage for the swap (default is 0.5).
   * @returns An object containing the quote and the transaction hash.
   *
   * @throws Will throw an error if the private key or ZERO_EX_API_KEY is missing.
   * @throws Will throw an error if there is an issue with fetching balances, signing transactions, or submitting the trade.
   *
   * @example
   * ```typescript
   * const result = await swap('0x1234567890abcdef1234567890abcdef12345678', 10, 'buy');
   * const result = await swap('0x1234567890abcdef1234567890abcdef12345678', 10, 'sell');
   * console.log(result);
   * ```
   */

  async swap(
    erc20Address: `0x${string}`,
    amount: number,
    type: 'buy' | 'sell',
    slippagePercentage = 0.5
  ) {
    // validate requirements
    if (!this.pk) throw new Error('missing PRIVATE_KEY.');
    if (!ZERO_EX_API_KEY) throw new Error('missing ZERO_EX_API_KEY.');

    const erc20 = getContract({
      address: erc20Address,
      abi: erc20Abi,
      client: this.client,
    });

    const weth = getContract({
      address: INPUT_TOKEN,
      abi: wethAbi,
      client: this.client,
    });

    const decimals: number =
      type === 'sell'
        ? ((await erc20.read.decimals()) as number)
        : ((await weth.read.decimals()) as number);

    const amountInWei = parseUnits(amount.toString(), decimals);

    const sellToken = type === 'sell' ? erc20Address : weth.address;
    const buyToken = type === 'buy' ? erc20Address : weth.address;

    const sellAmountString =
      type === 'sell' ? amountInWei.toString() : undefined;
    const buyAmountString = type === 'buy' ? amountInWei.toString() : undefined;

    if (type === 'buy') {
      try {
        const WETHbalance = await this.client.readContract({
          address: INPUT_TOKEN,
          abi: wethAbi,
          functionName: 'balanceOf',
          args: [this.client.account.address],
        });

        const ETHbalance = await this.client.getBalance({
          address: this.client.account.address,
        });

        // Convert balances from bigint to integers and adjust for decimals
        const parsedWETHbalance =
          parseInt((WETHbalance as bigint).toString()) / 10 ** decimals;
        const parsedETHbalance =
          parseInt(ETHbalance.toString()) / 10 ** decimals;

        if (parsedWETHbalance < amount) {
          const combinedBalance = parsedWETHbalance + parsedETHbalance;

          if (combinedBalance >= amount) {
            const wrapETH = await select({
              message: '🔄  Insufficient WETH, Swap ETH for WETH?',
              options: [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ],
            });

            if (wrapETH === 'yes') {
              log.info('Wrapping ETH to WETH');

              const priceParams = new URLSearchParams({
                chainId: this.client.chain.id.toString(),
                sellToken: `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,
                buyToken: INPUT_TOKEN,
                sellAmount: parseUnits(
                  (amount - parsedWETHbalance).toString(),
                  decimals
                ).toString(),
                taker: this.client.account.address,
                slippagePercentage: slippagePercentage.toString(),
              });

              const priceResponse = await fetch(
                'https://api.0x.org/swap/permit2/price?' +
                  priceParams.toString(),
                { headers: this.headers }
              );

              const price = await priceResponse.json();

              const quoteParams = new URLSearchParams();
              for (const [key, value] of priceParams.entries()) {
                quoteParams.append(key, value);
              }

              const quoteResponse = await fetch(
                'https://api.0x.org/swap/permit2/quote?' +
                  quoteParams.toString(),
                { headers: this.headers }
              );

              const quote = await quoteResponse.json();
              console.log(quote);

              let signature: Hex | undefined;
              if (quote.permit2?.eip712) {
                try {
                  signature = await this.client.signTypedData(
                    quote.permit2.eip712
                  );
                  console.log('Signed permit2 message from quote response');
                } catch (error) {
                  console.error('Error signing permit2 coupon:', error);
                  throw error;
                }

                if (signature && quote?.transaction?.data) {
                  const signatureLengthInHex = numberToHex(size(signature), {
                    signed: false,
                    size: 32,
                  });

                  const transactionData = quote.transaction.data as Hex;
                  const sigLengthHex = signatureLengthInHex as Hex;
                  const sig = signature as Hex;

                  quote.transaction.data = concat([
                    transactionData,
                    sigLengthHex,
                    sig,
                  ]);
                } else {
                  throw new Error(
                    'Failed to obtain signature or transaction data'
                  );
                }
              }
              if (signature && quote.transaction.data) {
                const nonce = await this.client.getTransactionCount({
                  address: this.client.account.address,
                });

                const signedTransaction = await this.client.signTransaction({
                  account: this.client.account,
                  chain: this.client.chain,
                  gas: !!quote?.transaction.gas
                    ? BigInt(quote?.transaction.gas)
                    : undefined,
                  to: quote?.transaction.to,
                  data: quote.transaction.data,
                  value: quote?.transaction.value
                    ? BigInt(quote.transaction.value)
                    : undefined,
                  gasPrice: !!quote?.transaction.gasPrice
                    ? BigInt(quote?.transaction.gasPrice)
                    : undefined,
                  nonce: nonce,
                });
                const hash = await this.client.sendRawTransaction({
                  serializedTransaction: signedTransaction,
                });

                await [this.client.waitForTransactionReceipt({ hash })];

                process.exit(0);
              } else {
                throw new Error(
                  'Failed to obtain signature or transaction data'
                );
              }
            } else {
              log.error('☹️  Insufficient balance in wallet');
              process.exit(0);
            }
          } else {
            log.error('☹️  Insufficient balance in wallet');
            process.exit(0);
          }
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        process.exit(0);
      }
    }

    const priceParams = new URLSearchParams({
      chainId: this.client.chain.id.toString(),
      sellToken,
      buyToken,
      ...(type === 'sell' && { sellAmount: sellAmountString }),
      ...(type === 'buy' && { sellAmount: buyAmountString }),
      taker: this.client.account.address,
      slippagePercentage: slippagePercentage.toString(),
    });

    const priceResponse = await fetch(
      'https://api.0x.org/gasless/price?' + priceParams.toString(),
      { headers: this.headers }
    );

    const price = await priceResponse.json();
    const quoteParams = new URLSearchParams({
      taker: this.client.account.address,
    });
    for (const [key, value] of priceParams.entries()) {
      quoteParams.append(key, value);
    }

    const quoteResponse = await fetch(
      'https://api.0x.org/gasless/quote?' + quoteParams.toString(),
      { headers: this.headers }
    );

    const quote = await quoteResponse.json();

    const tokenApprovalRequired =
      quote != undefined &&
      quote.issues != undefined &&
      quote.issues.allowance != null;
    const gaslessApprovalAvailable = quote.approval != null;

    const signTradeObject = async () => {
      // Logic to sign trade object
      const tradeSignature: Hex = await this.client.signTypedData({
        types: quote.trade.eip712.types,
        domain: quote.trade.eip712.domain,
        message: quote.trade.eip712.message,
        primaryType: quote.trade.eip712.primaryType,
      });
      log.step(`🖊️  Trade Signature: ${tradeSignature}`);
      return tradeSignature;
    };

    const signApprovalObject = async () => {
      // Logic to sign approval object
      const approvalSignature = await this.client.signTypedData({
        types: quote.approval.eip712.types,
        domain: quote.approval.eip712.domain,
        message: quote.approval.eip712.message,
        primaryType: quote.approval.eip712.primaryType,
      });
      console.log('🖊️ approvalSignature: ', approvalSignature);
      return approvalSignature;
    };

    const tradeSplitSigDataToSubmit = async (object: Hex) => {
      // split trade signature and package data to submit
      const tradeSplitSig = await splitSignature(object);
      const tradeDataToSubmit = {
        type: quote.trade.type,
        eip712: quote.trade.eip712,
        signature: {
          ...tradeSplitSig,
          v: Number(tradeSplitSig.v),
          signatureType: SignatureType.EIP712,
        },
      };
      return tradeDataToSubmit; // Return trade object with split signature
    };

    const submitTrade = async (
      tradeDataToSubmit: TradeDataToSubmit,
      approvalDataToSubmit: unknown
    ) => {
      try {
        const requestBody: TradeDataRequestBody = {
          trade: tradeDataToSubmit,
          chainId: this.client.chain.id,
          approval: undefined,
        };
        if (approvalDataToSubmit) {
          requestBody.approval = approvalDataToSubmit;
        }
        // console.log('requestBody: ', requestBody);
        const response = await fetch('https://api.0x.org/gasless/submit', {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(requestBody),
        });
        const data = await response.json();
        const successfulTradeHash = data.tradeHash;
        return successfulTradeHash;
      } catch (error) {
        console.error('Error submitting the gasless swap', error);
        process.exit(0);
      }
    };

    const standardApproval = async () => {
      if (quote.issues.allowance !== null) {
        if (type === 'sell') {
          try {
            const { request } = await erc20.simulate.approve([
              quote.issues.allowance.spender,
              maxUint256,
            ]);
            console.log('Approving Permit2 to spend USDC...', request);
            // set approval
            const hash = await erc20.write.approve(request.args);
            console.log(
              'Approved Permit2 to spend ERC20.',
              await this.client.waitForTransactionReceipt({ hash })
            );
          } catch (error) {
            console.log('Error approving Permit2:', error);
            process.exit(0);
          }
        } else {
          try {
            const { request } = await weth.simulate.approve([
              quote.issues.allowance.spender,
              maxUint256,
            ]);
            console.log('Approving Permit2 to spend USDC...', request);
            // set approval
            if (request.args) {
              const hash = await weth.write.approve(request.args);
              console.log(
                'Approved Permit2 to spend WETH.',
                await this.client.waitForTransactionReceipt({ hash })
              );
            } else {
              throw new Error('Failed to get approval request arguments');
              process.exit(0);
            }
          } catch (error) {
            console.log('Error approving Permit2:', error);
            process.exit(0);
          }
        }
      } else {
        console.log('USDC already approved for Permit2');
      }
    };

    async function executeTrade(
      tokenApprovalRequired: boolean,
      gaslessApprovalAvailable: boolean
    ) {
      let approvalSignature: Hex | null = null;
      let approvalDataToSubmit = null;
      let tradeDataToSubmit = null;
      let tradeSignature = null;

      if (tokenApprovalRequired) {
        if (gaslessApprovalAvailable) {
          approvalSignature = await signApprovalObject(); // Function to sign approval object
        } else {
          await standardApproval(); // Function to handle standard approval
        }
      }

      if (approvalSignature) {
        approvalDataToSubmit =
          await approvalSplitSigDataToSubmit(approvalSignature);
      }

      tradeSignature = await signTradeObject(); // Function to sign trade object
      tradeDataToSubmit = await tradeSplitSigDataToSubmit(tradeSignature);

      successfulTradeHash = await submitTrade(
        tradeDataToSubmit,
        approvalDataToSubmit
      ); // Function to submit trade
      return successfulTradeHash;
    }

    let successfulTradeHash = null;

    successfulTradeHash = await executeTrade(
      tokenApprovalRequired,
      gaslessApprovalAvailable
    );

    // Helper functions

    const approvalSplitSigDataToSubmit = async (
      object: Hex
    ): Promise<ApprovalDataToSubmit> => {
      const approvalSplitSig = await splitSignature(object);
      const approvalDataToSubmit: ApprovalDataToSubmit = {
        type: quote.approval.type,
        eip712: quote.approval.eip712,
        signature: {
          ...approvalSplitSig,
          v: Number(approvalSplitSig.v),
          signatureType: SignatureType.EIP712,
        },
      };
      return approvalDataToSubmit;
    };

    const fetchStatus = async (tradeHash: string) => {
      const response = await fetch(
        'http://api.0x.org/gasless/status/' +
          tradeHash +
          '?' +
          'chainId=' +
          this.client.chain.id.toString(),
        {
          headers: this.headers,
        }
      );
      const data = await response.json();
      return data;
    };

    const waitForStatus = async (tradeHash: string) => {
      s.start('⏳ Transaction Pending');

      return new Promise((resolve, reject) => {
        const intervalId = setInterval(async () => {
          try {
            const data = await fetchStatus(tradeHash);
            // Turn on logging if it takes too long to complete
            // log.info(`Transaction status (TEST Mode - true) ${data.status}`);
            if (data.status === 'succeeded') {
              clearInterval(intervalId);
              s.stop(`🎉 Transaction Completed! ${data.transactions[0].hash}`);
              const finalTradeHash = data.transactions[0].hash;
              await resolve(finalTradeHash);

              return finalTradeHash;
            }
          } catch (error) {
            console.error(error);
            clearInterval(intervalId);
            reject(error);
          }
        }, 3000);

        setTimeout(
          () => {
            clearInterval(intervalId);
            reject(
              new Error('Timeout: Status did not reach succeeded in time')
            );
          },
          5 * 60 * 1000
        ); // 5 mins timeout
      });
    };

    const startStatusCheck = async (successfulTradeHash: string) => {
      if (successfulTradeHash) {
        try {
          const tradeHash = await waitForStatus(successfulTradeHash);
          return tradeHash;
        } catch (error) {
          if (error instanceof Error) {
            console.error('Error during status check:', error.message);
          } else {
            console.error('Error during status check:', error);
          }
          process.exit(1);
        }
      } else {
        console.log(
          'successfulTradeHash is null or undefined, skipping status check.'
        );
        return { quote };
      }
    };

    // Start the process
    const tradeHash = await startStatusCheck(successfulTradeHash);
    return { quote, hash: tradeHash };
  }
}
