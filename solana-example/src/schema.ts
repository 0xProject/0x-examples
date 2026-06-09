import { z } from "zod";

const InstructionAccountSchema = z.object({
  pubkey: z.array(z.number()).length(32),
  is_signer: z.boolean(),
  is_writable: z.boolean(),
});

export type InstructionAccount = z.infer<typeof InstructionAccountSchema>;

const InstructionSchema = z.object({
  program_id: z.array(z.number()).length(32),
  accounts: z.array(InstructionAccountSchema),
  data: z.array(z.number()),
});

export type Instruction = z.infer<typeof InstructionSchema>;

export const ZeroExQuoteResponseSchema = z.object({
  amount_out: z.number(),
  instructions: z.array(InstructionSchema),
  address_lookup_tables: z.array(z.string()).optional(),
});

export type ZeroExQuoteResponse = z.infer<typeof ZeroExQuoteResponseSchema>;
