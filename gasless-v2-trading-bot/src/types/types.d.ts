import { Signature } from 'viem';
import { SignatureType } from '../utils/signature';
import { TypedData, TypedDataDomain } from 'abitype';

export interface SwapData {
  quote: {
    approval: null;
    blockNumber: string;
    buyAmount: string;
    buyToken: string;
    fees: {
      integratorFee: null;
      zeroExFee: Record<string, unknown>;
      gasFee: Record<string, unknown>;
    };
    issues: {
      allowance: null;
      balance: null;
      simulationIncomplete: boolean;
      invalidSourcesPassed: unknown[];
    };
    liquidityAvailable: boolean;
    minBuyAmount: string;
    route: {
      fills: Record<string, unknown>[];
      tokens: Record<string, unknown>[];
    };
    sellAmount: string;
    sellToken: string;
    target: string;
    tokenMetadata: {
      buyToken: Record<string, unknown>;
      sellToken: Record<string, unknown>;
    };
    trade: {
      type: string;
      hash: string;
      eip712: Record<string, unknown>;
    };
    zid: string;
  };
  hash: string;
}

export interface TradeDataToSubmit {
  type: string;
  eip712: {
    types: {
      SlippageAndActions: Record<string, unknown>[];
      TokenPermissions: Record<string, unknown>[];
      EIP712Domain: Record<string, unknown>[];
      PermitWitnessTransferFrom: Record<string, unknown>[];
    };
    domain: {
      name: string;
      chainId: number;
      verifyingContract: string;
    };
    message: {
      permitted: Record<string, unknown>;
      spender: string;
      nonce: string;
      deadline: string;
      slippageAndActions: Record<string, unknown>;
    };
    primaryType: string;
  };
  signature: {
    v: number;
    r: string;
    s: string;
    recoveryParam: number;
    signatureType: number;
  };
}

export interface TradeDataRequestBody {
  trade: {
    type: string;
    eip712: {
      types: Record<string, unknown>;
      domain: Record<string, unknown>;
      message: Record<string, unknown>;
      primaryType: string;
    };
    signature: {
      v: number;
      r: string;
      s: string;
      recoveryParam: number;
      signatureType: number;
    };
  };
  approval: unknown | null;
  chainId: number;
}

export type SignatureExtended = Signature & {
  recoveryParam: number;
};

export interface ApprovalDataToSubmit {
  type: string;
  eip712: unknown;
  signature: {
    r: string;
    s: string;
    v: number;
    signatureType: SignatureType;
  };
}

export interface EIP712TypedData {
  types: TypedData;
  domain: TypedDataDomain;
  message: {
    [key: string]: unknown;
  };
  primaryType: string;
}
