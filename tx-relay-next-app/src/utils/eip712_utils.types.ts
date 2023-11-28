export interface TokenSupportsPermit {
  [key: string]: {
    kind: string;
    domain: {
      name?: string;
      version?: string;
      chainId: number;
      verifyingContract: string;
      salt?: string;
    };
    domainSeparator: string;
  };
}
