"use client";

import { useState, useEffect, useRef } from "react";
import QuoteCard from "./QuoteCard";

interface Quote {
  id?: string;
  sellAmount: string;
  buyAmount: string;
  minBuyAmount: string;
  estimatedTimeSeconds: number;
  gasCosts: {
    totalNetworkFee: string;
  };
  allowanceTarget: string;
  seqNum: number;
  displayIndex?: number;
  quote?: {
    sellAmount: string;
    buyAmount: string;
    minBuyAmount: string;
    estimatedTimeSeconds: number;
    gasCosts: {
      totalNetworkFee: string;
    };
    seqNum: number;
  };
}

interface StreamingResult {
  liquidityAvailable: boolean;
}

interface StreamEvent {
  zid?: string;
  event: {
    type: "quote" | "result" | "error";
    data: Quote | StreamingResult | ErrorData;
  };
}

interface ErrorData {
  message: string;
  code: string;
  type?: "fatal";
}

interface StreamingQuoteProps {
  originChain: string;
  destinationChain: string;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  originAddress: string;
  apiKey: string;
  autoStart?: boolean;
}

export default function StreamingQuote({
  originChain,
  destinationChain,
  sellToken,
  buyToken,
  sellAmount,
  originAddress,
  apiKey,
  autoStart = false,
}: StreamingQuoteProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liquidityAvailable, setLiquidityAvailable] = useState<boolean | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);

  const startStreaming = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setQuotes([]);
    setError(null);
    setIsComplete(false);
    setLiquidityAvailable(null);
    setIsStreaming(true);

    // Build URL - use Next.js API proxy
    const params = new URLSearchParams({
      originChain,
      destinationChain,
      sellToken,
      buyToken,
      sellAmount,
      originAddress,
    });

    const apiUrl = "https://api.0x.org/cross-chain/quotes/stream";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${apiUrl}?${params}`, {
        signal: abortController.signal,
        headers: {
          "0x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        setError(`API error: ${response.status} - ${errorText}`);
        setIsStreaming(false);
        setIsComplete(true);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("No response body available");
        setIsStreaming(false);
        setIsComplete(true);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const eventData = line.slice(6); // Remove 'data: ' prefix
            if (eventData.trim() === "") continue; // Skip empty data lines

            try {
              const data = JSON.parse(eventData);
              console.info("parseddata", data);

              const streamEvent = data as StreamEvent;

              // Handle different event types
              if (streamEvent.event.type === "error") {
                const errorData = streamEvent.event.data as ErrorData;
                const errorType =
                  errorData.type === "fatal" ? "Fatal error" : "Error";
                setError(`${errorType}: ${errorData.message}`);
                setIsStreaming(false);
                setIsComplete(true);
                return;
              } else if (streamEvent.event.type === "quote") {
                const quoteData = streamEvent.event.data as Quote;
                // Handle nested route structure from API
                const quote: Quote = quoteData.quote
                  ? {
                      ...quoteData.quote,
                      allowanceTarget: quoteData.allowanceTarget,
                      id: streamEvent.zid,
                    }
                  : {
                      ...quoteData,
                      id: streamEvent.zid,
                    };

                setQuotes((prevQuotes) => {
                  const newQuote = {
                    ...quote,
                    displayIndex: prevQuotes.length + 1,
                  };
                  return [...prevQuotes, newQuote];
                });
              } else if (streamEvent.event.type === "result") {
                const result = streamEvent.event.data as StreamingResult;
                setLiquidityAvailable(result.liquidityAvailable);
                setIsStreaming(false);
                setIsComplete(true);
                return;
              }
            } catch (err) {
              console.error(
                "Error parsing SSE data:",
                err,
                "Raw data:",
                eventData
              );
              setError("Error parsing server response");
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Ignore abort errors - these are intentional cancellations
        console.log("Stream was cancelled");
        return;
      }
      console.error("Streaming error:", err);
      if (err instanceof Error) {
        setError(`Connection error: ${err.message}`);
      } else {
        setError("Connection error occurred");
      }
      setIsStreaming(false);
      setIsComplete(true);
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Auto-start streaming if requested
  useEffect(() => {
    if (autoStart && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setTimeout(() => startStreaming(), 0);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const chainNames: Record<string, string> = {
    "1": "Ethereum",
    "8453": "Base",
    "137": "Polygon",
    "42161": "Arbitrum",
    "10": "Optimism",
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="border border-gray-200 rounded-lg shadow-sm p-6 bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Streaming Cross-Chain Quote
          </h2>
          <div className="flex gap-3">
            {!isStreaming && !isComplete && (
              <button
                onClick={startStreaming}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Streaming
              </button>
            )}
            {isStreaming && (
              <button
                onClick={stopStreaming}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Streaming
              </button>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mb-6">
          {isStreaming && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span>Streaming quotes...</span>
            </div>
          )}
          {isComplete && !error && (
            <div className="flex items-center text-green-600">
              <div className="rounded-full h-4 w-4 bg-green-600 mr-2"></div>
              <span>Streaming complete</span>
            </div>
          )}
          {error && (
            <div className="flex items-center text-red-600">
              <div className="rounded-full h-4 w-4 bg-red-600 mr-2"></div>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Quotes Display */}
        {quotes.length > 0 && (
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Quotes Found ({quotes.length})
            </h3>
            <div className="grid gap-4">
              {quotes.map((quote, index) => (
                <QuoteCard key={`quote-${index}`} quote={quote} />
              ))}
            </div>
          </div>
        )}

        {/* Final Result */}
        {isComplete && liquidityAvailable !== null && (
          <div className="mt-6 p-4 rounded-lg bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-2">Final Result</h3>
            <p
              className={`text-sm ${
                liquidityAvailable ? "text-green-600" : "text-red-600"
              }`}
            >
              Liquidity Available: {liquidityAvailable ? "Yes" : "No"}
            </p>
          </div>
        )}

        {/* Trade Parameters Display */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Trade Parameters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Origin Chain:</span>{" "}
              {chainNames[originChain] || originChain}
            </div>
            <div>
              <span className="font-medium">Destination Chain:</span>{" "}
              {chainNames[destinationChain] || destinationChain}
            </div>
            <div>
              <span className="font-medium">Sell Amount:</span> {sellAmount}
            </div>
            <div className="col-span-2 truncate">
              <span className="font-medium">Sell Token:</span> {sellToken}
            </div>
            <div className="col-span-2 truncate">
              <span className="font-medium">Buy Token:</span> {buyToken}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
