import { Address, type Hex } from "viem";
import { EIP712TypedData } from "./signature";

// This interface is subject to change as the API V2 endpoints aren't finalized.
export interface PriceResponse {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  grossSellAmount: string;
  grossBuyAmount: string;
  allowanceTarget: Address;
  route: [];
  fees: {
    integratorFee: null;
    zeroExFee: {
      billingType: "on-chain" | "off-chain";
      feeAmount: string;
      feeToken: Address;
      feeType: "gas" | "volume";
    };
    gasFee: null;
  };
  gas: string;
  gasPrice: string;
  auxiliaryChainData?: {
    l1GasEstimate?: number;
  };
}

// This interface is subject to change as the API V2 endpoints aren't finalized.
export interface QuoteResponse {
  sellToken: Address;
  buyToken: Address;
  sellAmount: string;
  buyAmount: string;
  grossSellAmount: string;
  grossBuyAmount: string;
  gasPrice: string;
  allowanceTarget: Address;
  route: [];
  fees: {
    integratorFee: null;
    zeroExFee: {
      billingType: "on-chain" | "off-chain";
      feeAmount: string;
      feeToken: Address;
      feeType: "volume" | "gas";
    };
    gasFee: null;
  };
  auxiliaryChainData: {};
  to: Address;
  data: Hex;
  value: string;
  gas: string;
  permit2: {
    type: "Permit2";
    hash: Hex;
    eip712: EIP712TypedData;
  };
  transaction: V2QuoteTransaction;
}

export interface V2QuoteTransaction {
  data: Hex;
  gas: string | null;
  gasPrice: string;
  to: Address;
  value: string;
}
