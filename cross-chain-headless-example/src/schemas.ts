import { z } from "zod";

// Cross-chain quotes request schema
export const CrossChainQuotesRequestSchema = z.object({
  originChain: z.union([z.string(), z.number()]),
  destinationChain: z.union([z.string(), z.number()]),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  sortQuotesBy: z.enum(["speed", "price"]),
  originAddress: z.string(),
  destinationAddress: z.string().optional(),
  slippageBps: z.number().optional().default(100),
  excludedBridges: z.string().optional(),
  includedBridges: z.string().optional(),
  excludedSwapSources: z.string().optional(),
  feeRecipient: z.string().optional(),
  feeBps: z.string().optional(),
  feeToken: z.string().optional(),
  maxNumQuotes: z.number().min(1).max(10).optional().default(3),
  gasPayer: z.string().optional(),
});

// Fee schemas — aligned with cross-chain-common/uv1.ts
const VolumeFeeSchema = z
  .object({
    amount: z.string(),
    token: z.string(),
    type: z.literal("volume"),
  })
  .nullable();

const NativeFeeSchema = z
  .object({
    amount: z.string(),
    token: z.string(),
    type: z.literal("native"),
  })
  .nullable();

const ReimbursementFeeSchema = z
  .object({
    amount: z.string(),
    token: z.string(),
    recipient: z.string(),
  })
  .optional();

export const FeesSchema = z.object({
  integratorFee: VolumeFeeSchema.optional(),
  integratorFees: z.array(VolumeFeeSchema).nullable().optional(),
  zeroExFee: VolumeFeeSchema,
  bridgeNativeFee: NativeFeeSchema,
  reimbursementFee: ReimbursementFeeSchema,
});

// Gas costs — discriminated on chainType: evm | svm | tvm
export const EvmGasCostsSchema = z.object({
  chainType: z.literal("evm"),
  gasPrice: z.string().nullable(),
  gasLimit: z.string(),
  totalNetworkFee: z.string().nullable(),
});

export const SvmGasCostsSchema = z.object({
  chainType: z.literal("svm"),
  base: z.string(),
  priority: z.string().nullable(),
  total: z.string(),
});

export const TvmGasCostsSchema = z.object({
  chainType: z.literal("tvm"),
  energyFee: z.string(),
  bandwidthFee: z.string(),
  total: z.string(),
});

export const GasCostsSchema = z.discriminatedUnion("chainType", [
  EvmGasCostsSchema,
  SvmGasCostsSchema,
  TvmGasCostsSchema,
]);

// Quote steps — discriminated on type: wrap | unwrap | swap | bridge
const BaseWrapStepSchema = z.object({
  chainId: z.number(),
  sellToken: z.string(),
  buyToken: z.string(),
  amount: z.string(),
});

export const WrapStepSchema = BaseWrapStepSchema.extend({
  type: z.literal("wrap"),
});

export const UnwrapStepSchema = BaseWrapStepSchema.extend({
  type: z.literal("unwrap"),
});

export const SwapStepSchema = z.object({
  type: z.literal("swap"),
  chainId: z.number(),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  buyAmount: z.string(),
  minBuyAmount: z.string(),
  estimatedTimeSeconds: z.number().nullable(),
});

export const BridgeStepSchema = z.object({
  type: z.literal("bridge"),
  originChainId: z.number(),
  destinationChainId: z.number(),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  buyAmount: z.string(),
  minBuyAmount: z.string(),
  provider: z.string(),
  estimatedTimeSeconds: z.number().nullable(),
});

export const StepSchema = z.discriminatedUnion("type", [
  WrapStepSchema,
  UnwrapStepSchema,
  SwapStepSchema,
  BridgeStepSchema,
]);

// Transaction schemas — discriminated on chainType: evm | svm | tvm
export const EvmTransactionSchema = z.object({
  chainType: z.literal("evm"),
  details: z.object({
    to: z.string(),
    data: z.string(),
    gas: z.string().nullable(),
    gasPrice: z.string().nullable(),
    value: z.string(),
  }),
});

export const SvmTransactionSchema = z.object({
  chainType: z.literal("svm"),
  details: z.object({
    serializedTransaction: z.string(),
  }),
});

export const TvmTransactionSchema = z.object({
  chainType: z.literal("tvm"),
  details: z.object({
    to: z.string(),
    data: z.string(),
    value: z.string(),
    ownerAddress: z.string(),
    memo: z.string().optional(),
  }),
});

export const TransactionSchema = z.discriminatedUnion("chainType", [
  EvmTransactionSchema,
  SvmTransactionSchema,
  TvmTransactionSchema,
]);

// Issues schemas
export const AllowanceIssueSchema = z
  .object({
    actual: z.string(),
    spender: z.string(),
  })
  .nullable();

export const BalanceIssueSchema = z
  .object({
    token: z.string(),
    actual: z.string(),
    expected: z.string(),
  })
  .nullable();

// Quote-level issues (no invalidSwapSourcesPassed/invalidBridgesPassed)
export const QuoteIssuesSchema = z.object({
  allowance: AllowanceIssueSchema,
  balance: BalanceIssueSchema,
  simulationIncomplete: z.boolean(),
});

// Response-level issues (includes invalidSwapSourcesPassed/invalidBridgesPassed)
export const IssuesSchema = z.object({
  allowance: AllowanceIssueSchema,
  balance: BalanceIssueSchema,
  simulationIncomplete: z.boolean(),
  invalidSwapSourcesPassed: z.array(z.string()),
  invalidBridgesPassed: z.array(z.string()),
});

// Quote and response schemas
export const QuoteSchema = z.object({
  sellAmount: z.string(),
  buyAmount: z.string(),
  minBuyAmount: z.string(),
  fees: FeesSchema,
  gasCosts: GasCostsSchema,
  steps: z.array(StepSchema),
  transaction: TransactionSchema,
  estimatedTimeSeconds: z.number().nullable(),
  issues: QuoteIssuesSchema,
  quoteId: z.string(),
});

export const CrossChainQuotesResponseSchema = z.discriminatedUnion(
  "liquidityAvailable",
  [
    z.object({
      liquidityAvailable: z.literal(true),
      allowanceTarget: z.string().nullable(),
      originChainId: z.number(),
      originChain: z.string(),
      destinationChainId: z.number(),
      destinationChain: z.string(),
      sellToken: z.string(),
      buyToken: z.string(),
      issues: IssuesSchema,
      zid: z.string(),
      quotes: z.array(QuoteSchema).min(1),
    }),
    z.object({
      liquidityAvailable: z.literal(false),
      zid: z.string(),
    }),
  ],
);

// Status schemas
export const TransactionInfoSchema = z.object({
  chainId: z.number(),
  chain: z.string(),
  txHash: z.string().nullable(),
  timestamp: z.number(),
});

export const CrossChainStatusRequestSchema = z.object({
  originChain: z.union([z.string(), z.number()]),
  originTxHash: z.string(),
});

// Status step schemas (different from quote steps — include transactions)
const BaseWrapStatusStepSchema = z.object({
  chainId: z.number(),
  sellToken: z.string(),
  buyToken: z.string(),
  amount: z.string(),
  transactions: z.array(TransactionInfoSchema),
});

export const StatusWrapStepSchema = BaseWrapStatusStepSchema.extend({
  type: z.literal("wrap"),
});

export const StatusUnwrapStepSchema = BaseWrapStatusStepSchema.extend({
  type: z.literal("unwrap"),
});

export const StatusSwapStepSchema = z.object({
  type: z.literal("swap"),
  chainId: z.number(),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  minBuyAmount: z.string(),
  quotedBuyAmount: z.string(),
  estimatedTimeSeconds: z.number().nullable(),
  transactions: z.array(TransactionInfoSchema),
});

export const StatusBridgeStepSchema = z.object({
  type: z.literal("bridge"),
  bridge: z.string(),
  originChainId: z.number(),
  destinationChainId: z.number(),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  minBuyAmount: z.string(),
  quotedBuyAmount: z.string(),
  settledBuyAmount: z.string().nullable(),
  estimatedTimeSeconds: z.number().nullable(),
  transactions: z.array(TransactionInfoSchema),
});

export const StatusStepSchema = z.discriminatedUnion("type", [
  StatusWrapStepSchema,
  StatusUnwrapStepSchema,
  StatusSwapStepSchema,
  StatusBridgeStepSchema,
]);

export const RecoveryStepSchema = z.object({
  chainId: z.number(),
  token: z.string(),
  amount: z.string(),
  estimatedTimeSeconds: z.number().nullable(),
  deadline: z.number().nullable(),
  manualTransaction: TransactionSchema.nullable(),
  settledAmount: z.string().nullable(),
});

export const FailureContextSchema = z.object({
  reason: z.string(),
  status: z.enum([
    "refund_pending",
    "refund_succeeded",
    "manual_action_required",
    "no_actions_required",
    "failed",
  ]),
  transactions: z.array(TransactionInfoSchema),
  recovery: RecoveryStepSchema.nullable(),
});

export const CrossChainStatusResponseSchema = z.object({
  status: z.enum([
    "origin_tx_pending",
    "origin_tx_succeeded",
    "origin_tx_confirmed",
    "origin_tx_reverted",
    "bridge_pending",
    "bridge_filled",
    "bridge_failed",
    "unknown",
  ]),
  bridge: z.string().optional(),
  steps: z.array(StatusStepSchema),
  failure: FailureContextSchema.nullable(),
  transactions: z.array(TransactionInfoSchema),
  zid: z.string(),
});

// Exported types
export type CrossChainQuotesRequest = z.infer<
  typeof CrossChainQuotesRequestSchema
>;
export type CrossChainStatusRequest = z.infer<
  typeof CrossChainStatusRequestSchema
>;
export type CrossChainStatusResponse = z.infer<
  typeof CrossChainStatusResponseSchema
>;
export type CrossChainQuotesResponse = z.infer<
  typeof CrossChainQuotesResponseSchema
>;
export type Quote = z.infer<typeof QuoteSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Issues = z.infer<typeof IssuesSchema>;
