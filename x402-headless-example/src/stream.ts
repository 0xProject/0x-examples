import { wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import type { x402Client } from "@x402/fetch";

// SSE frames can span transport chunks and contain multiple data lines.
export async function readQuoteStream(body: ReadableStream<Uint8Array>, onEvent: (event: unknown) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let data: string[] = [];
  let bytes = 0;
  let events = 0;
  let completed = false;
  try {
    while (!completed) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 10 * 1024 * 1024) throw new Error("Quote stream exceeded the 10 MiB response limit.");
      pending += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = pending.indexOf("\n")) !== -1) {
        const line = pending.slice(0, newline).replace(/\r$/, "");
        pending = pending.slice(newline + 1);
        if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
        if (line !== "" || !data.length) continue;
        const event = JSON.parse(data.join("\n")) as { event?: { type?: string; data?: unknown } };
        data = [];
        if (++events > 100) throw new Error("Quote stream exceeded the 100-event limit.");
        onEvent(event);
        if (event.event?.type === "error") throw new Error(`Quote stream returned an error: ${JSON.stringify(event.event.data)}`);
        if (event.event?.type === "result") { completed = true; break; }
      }
    }
    if (!completed) throw new Error("Quote stream ended without a final result. Review the payment receipt before opening another paid connection.");
  } finally {
    try { await reader.cancel(); } finally { reader.releaseLock(); }
  }
  return { events };
}

export async function paidQuoteStream(url: string, client: x402Client, fetchImpl = fetch) {
  const response = await wrapFetchWithPayment(fetchImpl, client)(url, {
    redirect: "error", headers: { Accept: "text/event-stream" }, signal: AbortSignal.timeout(60_000),
  });
  const header = response.headers.get("PAYMENT-RESPONSE");
  const receipt = header ? decodePaymentResponseHeader(header) : undefined;
  if (receipt) console.log("Payment receipt:", receipt);
  console.log(`HTTP ${response.status}: streaming cross-chain quotes`);
  if (!response.ok) {
    console.log(await response.text());
    throw new Error(`Request failed with HTTP ${response.status}. Review the receipt before retrying.`);
  }
  if (!response.body) throw new Error("Quote stream response has no body.");
  const result = await readQuoteStream(response.body, (event) => console.log("SSE event:", JSON.stringify(event)));
  return { ...result, receipt };
}
