import { z } from "zod";
import {
  GaslessApprovalTypes,
  GaslessTypes,
  MetaTransactionV1Eip712Context,
  MetaTransactionV2Eip712Context,
} from "./types";

const chainIdSchema = z.coerce.number();
const booleanParamSchema = z
  .enum(["true", "false"])
  .transform((value: string) => value === "true");

const baseTxRelayRequestSchema = {
  buyAmount: z.string().optional(),
  sellAmount: z.string().optional(),
  buyToken: z.string(),
  sellToken: z.string(),
  takerAddress: z.string().optional(),
  checkApproval: booleanParamSchema.optional(),
  slippagePercentage: z.number().optional(),
};

const signatureSchema = z.object({
  r: z.string(),
  s: z.string(),
  _vs: z.string().optional(),
  recoveryParam: z.number(),
  v: z.number(),
  yParityAndS: z.string().optional(),
  compact: z.string().optional(),
  signatureType: z.number(),
});

export const txRelayRequestSchemaClient = z.object({
  ...baseTxRelayRequestSchema,
  acceptedTypes: z.array(z.enum(["metatransaction_v2", "otc"])).optional(),
});

export const txRelayRequestSchemaServer = z.object({
  ...baseTxRelayRequestSchema,
  slippagePercentage: z.string().optional(),
  acceptedTypes: z
    .string()
    .refine((value) => {
      const values = value.split(",");
      return values.includes("metatransaction_v2") && values.includes("otc");
    })
    .optional(),
});

export const txRelayTradeSchema = z.object({
  type: z.union([
    z.literal(GaslessTypes.MetaTransaction),
    z.literal(GaslessTypes.MetaTransactionV2),
    z.literal(GaslessTypes.OtcOrder),
  ]),
  hash: z.string(),
  eip712: z
    .string()
    .transform(
      (
        args: string
      ): MetaTransactionV1Eip712Context | MetaTransactionV2Eip712Context =>
        JSON.parse(args)
    ),
});

export const txRelaySubmitTradeSchema = z.object({
  type: z.union([
    z.literal(GaslessTypes.MetaTransaction),
    z.literal(GaslessTypes.MetaTransactionV2),
    z.literal(GaslessTypes.OtcOrder),
  ]),
  eip712: z.object({
    types: z.object({}).passthrough(),
    primaryType: z.string(),
    domain: z.object({}).passthrough(),
    message: z.object({}).passthrough(),
  }),
  signature: signatureSchema,
});

export const txRelaySubmitApprovalSchema = z.object({
  type: z.union([
    z.literal(GaslessApprovalTypes.ExecuteMetaTransaction),
    z.literal(GaslessApprovalTypes.Permit),
    z.literal(GaslessApprovalTypes.DaiPermit),
  ]),
  eip712: z.object({
    types: z.object({}).passthrough(), // todo: better parsing of MetaTransactionV1Eip712Context | MetaTransactionV2Eip712Context types
    primaryType: z.string(),
    domain: z.object({}).passthrough(),
    message: z.object({}).passthrough(),
  }),
  signature: signatureSchema,
});

export const txRelaySubmitParamsSchema = z.object({
  trade: txRelaySubmitTradeSchema,
  approval: txRelaySubmitApprovalSchema.optional(),
});

export const txRelaySubmitRequestSchema = z.object({
  batch: txRelaySubmitParamsSchema,
  chainId: chainIdSchema,
});

export const txRelayStatusRequestSchema = z.object({
  chainId: chainIdSchema,
  tradeHash: z.string(),
});
