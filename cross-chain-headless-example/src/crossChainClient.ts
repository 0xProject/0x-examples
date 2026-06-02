import {
  CrossChainQuotesRequest,
  CrossChainQuotesResponse,
  CrossChainQuotesResponseSchema,
  CrossChainStatusRequest,
  CrossChainStatusResponse,
  CrossChainStatusResponseSchema,
} from "./schemas";

export class CrossChainClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.0x.org") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Get multiple quotes for a cross-chain swap
   */
  async getQuotes(
    request: CrossChainQuotesRequest
  ): Promise<CrossChainQuotesResponse> {
    const url = new URL("/cross-chain/quotes", this.baseUrl);

    // Add query parameters
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "0x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch quotes: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = await response.json();
    return CrossChainQuotesResponseSchema.parse(data);
  }

  /**
   * Get the status of a cross-chain transaction
   */
  async getStatus(
    request: CrossChainStatusRequest
  ): Promise<CrossChainStatusResponse> {
    const url = new URL("/cross-chain/status", this.baseUrl);

    // Add query parameters
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "0x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch status: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = await response.json();
    return CrossChainStatusResponseSchema.parse(data);
  }

  /**
   * Monitor a cross-chain transaction until completion
   */
  async monitorTransaction(
    request: CrossChainStatusRequest,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onUpdate?: (status: CrossChainStatusResponse) => void;
    } = {}
  ): Promise<CrossChainStatusResponse> {
    const { maxAttempts = 60, intervalMs = 5000, onUpdate } = options;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await this.getStatus(request);

        if (onUpdate) {
          onUpdate(status);
        }

        // Check if transaction is in a final state
        const finalStates = [
          "bridge_filled",
          "bridge_failed",
          "origin_tx_reverted",
        ];

        if (finalStates.includes(status.status)) {
          return status;
        }

        // Wait before next attempt
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.warn(`Status check attempt ${attempt + 1} failed:`, error);
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error(
      `Transaction monitoring timed out after ${maxAttempts} attempts`
    );
  }
}
