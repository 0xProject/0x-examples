"use client";

import PriceView from "./components/price";
import QuoteView from "./components/quote";
import StatusView from "./components/status";

import { useState } from "react";
import { useAccount, useNetwork } from "wagmi";
import { TxRelayPriceResponse } from "../src/utils/types";

export default function Page() {
  const { address } = useAccount();
  const { chain } = useNetwork();

  const chainId = chain?.id || 137;

  const [finalize, setFinalize] = useState(false);
  const [checkAppoval, setCheckApproval] = useState(false);
  const [price, setPrice] = useState<TxRelayPriceResponse | undefined>();
  const [quote, setQuote] = useState();
  const [tradeHash, setTradeHash] = useState<string | undefined>();

  console.log(
    "price: ",
    price,
    "finalize: ",
    finalize,
    "checkApproval: ",
    checkAppoval,
    "address: ",
    address
  );

  if (tradeHash) {
    return (
      <div className="p-8">
        <StatusView tradeHash={tradeHash} />
      </div>
    );
  }

  return (
    <div className="p-8">
      {price && finalize ? (
        <QuoteView
          checkApproval={checkAppoval}
          price={price}
          quote={quote}
          setQuote={setQuote}
          onSubmitSuccess={setTradeHash}
          takerAddress={address}
          chainId={chainId}
        />
      ) : (
        <PriceView
          chainId={chainId}
          takerAddress={address}
          setPrice={setPrice}
          setFinalize={setFinalize}
          setCheckApproval={setCheckApproval}
        />
      )}
    </div>
  );
}
