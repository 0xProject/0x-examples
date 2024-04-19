import { type NextRequest } from "next/server";
// import qs from "qs";

export async function POST(request: NextRequest) {
  // Parse the incoming request body
  const payload = await request.json();
  console.log(payload, "<--x");
  const res = await fetch(`https://api.0x.org/tx-relay/v1/swap/submit`, {
    method: "POST",
    headers: {
      "0x-api-key": process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
      "0x-chain-id": payload.chainId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log(data, "<--data");

  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
