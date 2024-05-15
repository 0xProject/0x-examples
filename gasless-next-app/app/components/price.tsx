import { ConnectButton } from "@rainbow-me/rainbowkit";
import { use, useEffect, useState } from "react";
import { formatUnits, parseUnits } from "ethers";
import {
  erc20ABI,
  useBalance,
  useContractRead,
  type Address,
  useNetwork,
} from "wagmi";
import {
  POLYGON_TOKENS_BY_SYMBOL,
  POLYGON_EXCHANGE_PROXY,
  ETHEREUM_TOKENS_BY_SYMBOL,
  ETHEREUM_EXCHANGE_PROXY,
  ARBITRUM_TOKENS_BY_SYMBOL,
  ARBITRUM_EXCHANGE_PROXY,
} from "../../src/constants";
import MATIC_PERMIT_TOKENS from "../../src/supports-permit/137.json";
import ETHEREUM_PERMIT_TOKENS from "../../src/supports-permit/1.json";
import ARBITRUM_PERMIT_TOKENS from "../../src/supports-permit/42161.json";
import type { TokenSupportsPermit } from "../../src/utils/eip712_utils.types";
import ZeroExLogo from "../../src/images/white-0x-logo.png";
import Image from "next/image";
import qs from "qs";

export const DEFAULT_BUY_TOKEN = (chainId: number) => {
  if (chainId === 137) {
    return "wmatic";
  }
  if (chainId === 1) {
    return "bal";
  }
  if (chainId === 42161) {
    return "weth";
  }
  return "wmatic";
};

export const permitTokensByChain = (chainId: number) => {
  if (chainId === 137) {
    return MATIC_PERMIT_TOKENS;
  }
  if (chainId === 1) {
    return ETHEREUM_PERMIT_TOKENS;
  }
  if (chainId === 42161) {
    return ARBITRUM_PERMIT_TOKENS;
  }
  return MATIC_PERMIT_TOKENS;
};

export default function PriceView({
  takerAddress,
  setPrice,
  setFinalize,
  setCheckApproval,
  chainId,
}: {
  takerAddress: Address | undefined;
  setPrice: (price: any) => void;
  setFinalize: (finalize: boolean) => void;
  setCheckApproval: (data: boolean) => void;
  chainId: number;
}) {
  const permitTokensDataTyped = permitTokensByChain(
    chainId
  ) as TokenSupportsPermit;

  const buyToken = DEFAULT_BUY_TOKEN(chainId);
  const sellToken = "usdc";

  const [error, setError] = useState([]);
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");

  const [tradeDirection] = useState("sell");

  const exchangeProxy =
    chainId === 137
      ? POLYGON_EXCHANGE_PROXY
      : chainId === 1
      ? ETHEREUM_EXCHANGE_PROXY
      : ARBITRUM_EXCHANGE_PROXY;

  const tokensByChain = (chainId: number) => {
    if (chainId === 137) {
      return POLYGON_TOKENS_BY_SYMBOL;
    }
    if (chainId === 1) {
      return ETHEREUM_TOKENS_BY_SYMBOL;
    }
    if (chainId === 42161) {
      return ARBITRUM_TOKENS_BY_SYMBOL;
    }
    return POLYGON_TOKENS_BY_SYMBOL;
  };

  const sellTokenObject = tokensByChain(chainId)[sellToken];
  const buyTokenObject = tokensByChain(chainId)[buyToken];

  const sellTokenDecimals = sellTokenObject.decimals;
  const buyTokenDecimals = buyTokenObject.decimals;
  const sellTokenAddress = sellTokenObject.address;

  const parsedSellAmount =
    sellAmount && tradeDirection === "sell"
      ? parseUnits(sellAmount, sellTokenDecimals).toString()
      : undefined;

  const parsedBuyAmount =
    buyAmount && tradeDirection === "buy"
      ? parseUnits(buyAmount, buyTokenDecimals).toString()
      : undefined;

  // Fetch price data and set the buyAmount whenever the sellAmount changes
  useEffect(() => {
    const params = {
      sellToken: sellTokenObject.address,
      buyToken: buyTokenObject.address,
      sellAmount: parsedSellAmount,
      buyAmount: parsedBuyAmount,
      takerAddress,
      chainId,
    };

    async function main() {
      const response = await fetch(`/api/price?${qs.stringify(params)}`);
      const data = await response.json();

      if (data?.validationErrors?.length > 0) {
        // error for sellAmount too low
        setError(data.validationErrors);
      } else {
        setError([]);
      }
      if (data.buyAmount) {
        setBuyAmount(formatUnits(data.buyAmount, 18));
        setPrice(data);
      }
    }

    if (sellAmount !== "") {
      main();
    }
  }, [
    sellTokenObject.address,
    buyTokenObject.address,
    parsedSellAmount,
    parsedBuyAmount,
    takerAddress,
    chainId,
    sellAmount,
    setPrice,
  ]);

  // Hook for fetching balance information for specified token for a specific takerAddress
  const { data, isError, isLoading } = useBalance({
    address: takerAddress,
    token: sellTokenObject.address, // USDC
  });

  console.log(data, "<--data");

  const inSufficientBalance =
    data && sellAmount
      ? parseUnits(sellAmount, sellTokenDecimals) > data.value
      : true;

  const isSellTokenPermit = Boolean(permitTokensDataTyped[sellTokenAddress]);

  const { data: allowance, refetch } = useContractRead({
    address: sellTokenObject.address,
    abi: erc20ABI,
    functionName: "allowance",
    args: takerAddress ? [takerAddress, exchangeProxy] : undefined,
  });

  // Check if there is sufficient allowance
  const hasSufficientAllowance =
    takerAddress && allowance ? allowance == 0n : false;

  const checkApproval = isSellTokenPermit && !hasSufficientAllowance;

  useEffect(() => {
    setCheckApproval(checkApproval);
  }, [checkApproval, setCheckApproval]);

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <a href="https://0x.org/" target="_blank" rel="noopener noreferrer">
          <Image src={ZeroExLogo} alt="Icon" width={50} height={50} />
        </a>
        <ConnectButton />
      </header>

      <div className="container mx-auto p-10">
        <header className="text-center py-4">
          <h1 className="text-2xl font-bold">Tx Relay Demo</h1>
        </header>

        <div className="max-w-md mx-auto bg-gray-800 shadow-lg rounded-lg p-8">
          <form>
            <div className="mb-6">
              <div className="flex items-center">
                <label htmlFor="sell" className="text-gray-300 mb-2 mr-2">
                  Sell {sellTokenObject.symbol}
                </label>
                <Image
                  alt={sellToken}
                  className="h-6 w-6 mr-2 mb-2 rounded-md"
                  src={sellTokenObject.logoURI}
                  width={6}
                  height={6}
                />
              </div>

              <div className="flex justify-between items-center border border-gray-600 rounded overflow-hidden">
                <input
                  id="sell-amount"
                  type="number"
                  value={sellAmount}
                  placeholder="Amount"
                  className="w-full p-3 bg-gray-700 text-white"
                  onChange={(e) => {
                    setSellAmount(e.target.value);
                  }}
                />
              </div>
            </div>
            <hr className="my-6 border-gray-700" />

            <div className="mb-6">
              <div className="flex items-center">
                <label
                  htmlFor="buy-amount"
                  className="block text-gray-300 mb-2 mr-2"
                >
                  Buy {buyTokenObject.symbol}
                </label>
                <Image
                  alt={buyToken}
                  className="h-6 w-6 mr-2 mb-2 rounded-md"
                  src={buyTokenObject.logoURI}
                  width={6}
                  height={6}
                />
              </div>
              <div className="flex justify-between items-center border border-gray-600 rounded overflow-hidden">
                <input
                  id="buy-amount"
                  type="number"
                  placeholder="Amount"
                  className="w-full p-3 bg-gray-700 text-white cursor-not-allowed"
                  value={buyAmount}
                  readOnly
                />
              </div>
            </div>
            <hr className="my-6 border-gray-700" />
            {error.length > 0 &&
              error.map(({ field, code, reason, description }, index) => (
                <div key={index} className="text-red-500 text-sm mb-4">
                  [{code}] {reason} - {description}
                </div>
              ))}
            {takerAddress ? (
              <ApproveOrReviewButton
                sellTokenAddress={sellTokenObject.address}
                takerAddress={takerAddress}
                onClick={() => {
                  setFinalize(true);
                }}
                disabled={inSufficientBalance}
              />
            ) : (
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  mounted,
                }) => {
                  const ready = mounted;
                  const connected = ready && account && chain;

                  return (
                    <div
                      {...(!ready && {
                        "aria-hidden": true,
                        style: {
                          opacity: 0,
                          pointerEvents: "none",
                          userSelect: "none",
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button
                              className="w-full bg-blue-600 text-white font-semibold p-2 rounded hover:bg-blue-700"
                              onClick={openConnectModal}
                              type="button"
                            >
                              Connect Wallet
                            </button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button onClick={openChainModal} type="button">
                              Wrong network
                            </button>
                          );
                        }

                        return (
                          <div style={{ display: "flex", gap: 12 }}>
                            <button
                              onClick={openChainModal}
                              style={{ display: "flex", alignItems: "center" }}
                              type="button"
                            >
                              {chain.hasIcon && (
                                <div
                                  style={{
                                    background: chain.iconBackground,
                                    width: 12,
                                    height: 12,
                                    borderRadius: 999,
                                    overflow: "hidden",
                                    marginRight: 4,
                                  }}
                                >
                                  {chain.iconUrl && (
                                    <Image
                                      src={chain.iconUrl}
                                      alt={chain.name ?? "Chain icon"}
                                      width={12}
                                      height={12}
                                      layout="fixed"
                                    />
                                  )}
                                </div>
                              )}
                              {chain.name}
                            </button>

                            <button onClick={openAccountModal} type="button">
                              {account.displayName}
                              {account.displayBalance
                                ? ` (${account.displayBalance})`
                                : ""}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            )}
          </form>
        </div>
        <p className="text-md text-center p-4 text-gray-500">
          Check out the{" "}
          <u className="underline">
            <a href="https://0x.org/docs/tx-relay-api/introduction">0x Docs</a>
          </u>{" "}
          and{" "}
          <u className="underline">
            <a href="https://github.com/0xProject/0x-examples/tree/main/gasless-next-app">
              Code
            </a>
          </u>{" "}
          to build your own
        </p>
      </div>
    </div>
  );

  function ApproveOrReviewButton({
    takerAddress,
    onClick,
    sellTokenAddress,
    disabled,
  }: {
    takerAddress: Address;
    onClick: () => void;
    sellTokenAddress: Address;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          // fetch data, when finished, show quote view
          setFinalize(true);
        }}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-25"
      >
        {disabled ? "Insufficient Balance" : "Review Trade"}
      </button>
    );
  }
}
