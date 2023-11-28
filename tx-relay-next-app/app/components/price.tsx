import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState, ChangeEvent } from "react";
import { formatUnits, parseUnits } from "ethers";
import { erc20ABI, useBalance, useContractRead, type Address } from "wagmi";
import { POLYGON_TOKENS_BY_SYMBOL, exchangeProxy } from "../../src/constants";
import MATIC_PERMIT_TOKENS from "../../src/supports-permit/137.json";
import type { TokenSupportsPermit } from "../../src/utils/eip712_utils.types";
import ZeroExLogo from "../../src/images/white-0x-logo.png";
import Image from "next/image";
import qs from "qs";

export default function PriceView({
  takerAddress,
  setPrice,
  setFinalize,
  setCheckApproval,
}: {
  takerAddress: Address | undefined;
  setPrice: (price: any) => void;
  setFinalize: (finalize: boolean) => void;
  setCheckApproval: (data: boolean) => void;
}) {
  const maticPermitTokensDataTyped = MATIC_PERMIT_TOKENS as TokenSupportsPermit;

  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellToken, setSellToken] = useState("usdc");
  const [buyToken, setBuyToken] = useState("wmatic");
  const [tradeDirection] = useState("sell");

  const sellTokenDecimals = POLYGON_TOKENS_BY_SYMBOL[sellToken].decimals;
  const buyTokenDecimals = POLYGON_TOKENS_BY_SYMBOL[buyToken].decimals;
  const sellTokenAddress = POLYGON_TOKENS_BY_SYMBOL[sellToken].address;

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
      sellToken: POLYGON_TOKENS_BY_SYMBOL[sellToken].address,
      buyToken: POLYGON_TOKENS_BY_SYMBOL[buyToken].address,
      sellAmount: parsedSellAmount,
      buyAmount: parsedBuyAmount,
      takerAddress,
    };

    async function main() {
      const response = await fetch(`/api/price?${qs.stringify(params)}`);
      const data = await response.json();

      setBuyAmount(formatUnits(data.buyAmount, 18));
      setPrice(data);
    }

    if (sellAmount !== "") {
      main();
    }
  }, [
    sellAmount,
    sellToken,
    buyToken,
    parsedBuyAmount,
    parsedSellAmount,
    takerAddress,
    setPrice,
  ]);

  // Hook for fetching balance information for specified token for a specific takerAddress
  const { data, isError, isLoading } = useBalance({
    address: takerAddress,
    token: POLYGON_TOKENS_BY_SYMBOL[sellToken].address, // USDC
  });

  const inSufficientBalance =
    data && sellAmount ? parseUnits(sellAmount, 6) > data.value : true;

  const isSellTokenPermit = Boolean(
    maticPermitTokensDataTyped[sellTokenAddress]
  );

  const { data: allowance, refetch } = useContractRead({
    address: POLYGON_TOKENS_BY_SYMBOL[sellToken].address,
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
                  Sell USDC
                </label>
                <Image
                  alt={sellToken}
                  className="h-6 w-6 mr-2 mb-2 rounded-md"
                  src={POLYGON_TOKENS_BY_SYMBOL[sellToken].logoURI}
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
                  Buy WMATIC
                </label>
                <Image
                  alt={buyToken}
                  className="h-6 w-6 mr-2 mb-2 rounded-md"
                  src={POLYGON_TOKENS_BY_SYMBOL[buyToken].logoURI}
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

            {takerAddress ? (
              <ApproveOrReviewButton
                sellTokenAddress={POLYGON_TOKENS_BY_SYMBOL[sellToken].address}
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
            <a href="https://0x.org/docs/">Code</a>
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
