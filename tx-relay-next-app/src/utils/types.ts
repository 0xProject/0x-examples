import { z } from "zod";
import {
  txRelaySubmitApprovalSchema,
  txRelaySubmitParamsSchema,
  txRelaySubmitRequestSchema,
  txRelaySubmitTradeSchema,
  txRelayTradeSchema,
  txRelayRequestSchemaClient,
  txRelayStatusRequestSchema,
} from "./schema";
import type { Address, Hash } from "viem";
import { EIP712TypedData } from "./signature";

interface LiquiditySource {
  name: string;
  proportion: string;
  intermediateToken?: string;
  hops?: string[];
}

interface Fee {
  feeType: "gas" | "volume";
  feeToken: Address;
  feeAmount: string;
  billingType: "on-chain" | "off-chain";
}

export interface TxRelayFees {
  gasFee: Fee;
  zeroExFee?: Fee;
}

interface Eip712Domain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: Address;
  salt?: Address;
}

interface Eip712DataField {
  name: string;
  type: string;
}

export interface ExecuteMetaTransactionEip712 {
  types: {
    EIP712Domain: Eip712DataField[];
    MetaTransaction: Eip712DataField[];
  };
  primaryType: "MetaTransaction";
  domain: Eip712Domain;
  message: {
    nonce: number;
    from: string;
    functionSignature: string;
  };
}

export interface PermitEip712 {
  types: {
    EIP712Domain: Eip712DataField[];
    Permit: Eip712DataField[];
  };
  primaryType: "Permit";
  domain: Eip712Domain;
  message: {
    owner: string;
    spender: string;
    value: string;
    nonce: number;
    deadline: string;
  };
}

export enum GaslessApprovalTypes {
  ExecuteMetaTransaction = "executeMetaTransaction::approve",
  Permit = "permit",
  DaiPermit = "daiPermit",
}

interface TxRelayApproval {
  isGaslessAvailable: boolean;
  isRequired: boolean;
  type?: GaslessApprovalTypes;
  hash?: string;
  eip712?: ExecuteMetaTransactionEip712 | PermitEip712;
}

export enum GaslessTypes {
  MetaTransaction = "metatransaction",
  MetaTransactionV2 = "metatransaction_v2",
  OtcOrder = "otc",
}

export type MetaTransactionV1Eip712Types = {
  EIP712Domain: Eip712DataField[];
  MetaTransactionData: Eip712DataField[];
};

export interface MetaTransactionV1Eip712Context extends EIP712TypedData {
  types: MetaTransactionV1Eip712Types;
  primaryType: "MetaTransactionData";
  domain: Eip712Domain;
  message: {
    signer: string;
    sender: string;
    minGasPrice: string;
    maxGasPrice: string;
    expirationTimeSeconds: string;
    salt: string;
    callData: string;
    value: string;
    feeToken: string;
    feeAmount: string;
  };
}

type MetaTransactionV2Eip712Types = {
  EIP712Domain: Eip712DataField[];
  MetaTransactionDataV2: Eip712DataField[];
  MetaTransactionFeeData: Eip712DataField[];
};

interface MetaTransactionV2Eip712Fee {
  recipient: string;
  amount: string;
}

export interface MetaTransactionV2Eip712Context extends EIP712TypedData {
  types: MetaTransactionV2Eip712Types;
  primaryType: "MetaTransactionDataV2";
  domain: Eip712Domain;
  message: {
    signer: string;
    sender: string;
    expirationTimeSeconds: string;
    salt: string;
    callData: string;
    feeToken: string;
    fees: MetaTransactionV2Eip712Fee[];
  };
}

export type TxRelayTrade = z.infer<typeof txRelayTradeSchema>;

export type TxRelayRequest = z.infer<typeof txRelayRequestSchemaClient>;

export interface TxRelayPriceResponse {
  allowanceTarget: Address;
  buyAmount: string;
  buyTokenAddress: Address;
  estimatedPriceImpact: string;
  fees: TxRelayFees;
  liquidityAvailable: boolean;
  price: string;
  sellAmount: string;
  sellTokenAddress: Address;
  sources: LiquiditySource[];
  grossBuyAmount: string;
  grossEstimatedPriceImpact: string;
  grossPrice: string;
  grossSellAmount: string;
}

export interface TxRelayQuoteResponse {
  liquidityAvailable: boolean;
  buyAmount: string;
  buyTokenAddress: Address;
  estimatedPriceImpact: string;
  price: string;
  sellAmount: string;
  sellTokenAddress: Address;
  approval?: TxRelayApproval;
  trade: TxRelayTrade;
  sources: LiquiditySource[];
  fees: TxRelayFees;
  allowanceTarget: Address;
  grossBuyAmount: string;
  grossEstimatedPriceImpact: string;
  grossPrice: string;
  grossSellAmount: string;
}

export type TxRelaySubmitParams = z.infer<typeof txRelaySubmitParamsSchema>;

export type TxRelaySubmitApproval = z.infer<typeof txRelaySubmitApprovalSchema>;

export type TxRelaySubmitTrade = z.infer<typeof txRelaySubmitTradeSchema>;

export type TxRelaySubmitRequest = z.infer<typeof txRelaySubmitRequestSchema>;

export type TxRelayStatusRequest = z.infer<typeof txRelayStatusRequestSchema>;

export interface TxRelaySubmitResponse {
  type: GaslessTypes;
  tradeHash: Hash;
}

/**
 * The reason for a tx-relay transaction failure
 * https://0x.org/docs/tx-relay-api/api-references/get-tx-relay-v1-swap-status-trade-hash.md#possible-reasons-for-failure
 */
enum JobFailureReason {
  // Transaction simulation failed so no transaction is submitted onchain.
  // Our system simulate the transaction before submitting onchain.
  TransactionSimulationFailed = "transaction_simulation_failed",
  // The order expired
  OrderExpired = "order_expired",
  // Last look declined by the market maker
  LastLookDeclined = "last_look_declined",
  // Transaction(s) submitted onchain but reverted
  TransactionReverted = "transaction_reverted",
  // Error getting market signature / signature is not valid; this is NOT last look decline
  MarketMakerSignatureError = "market_maker_sigature_error",
  // Fallback error reason
  InternalError = "internal_error",
}

/**
 * The response from the tx relay status endpoint
 */
export type TxRelayStatusResponse = {
  transactions: { hash: Hash; timestamp: number /* unix ms */ }[]; // trade transactions
  approvalTransactions: { hash: string; timestamp: number /* unix ms */ }[]; // approval transactions; the field will not be present if it's not a gasless approval trade
  // For pending, expect no transactions.
  // For successful transactions (i.e. "succeeded"/"confirmed), expect just the mined transaction.
  // For failed transactions, there may be 0 (failed before submission) to multiple transactions (transaction reverted).
  // For submitted transactions, there may be multiple transactions, but only one will ultimately get mined
} & (
  | {
      status: "pending" | "submitted" | "succeeded" | "confirmed";
    }
  | {
      status: "failed";
      reason: JobFailureReason;
    }
);
// When status field is 'failed', there will be a reason field to describe the error reason
