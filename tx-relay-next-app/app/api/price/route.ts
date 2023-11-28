import { type NextRequest } from "next/server";
// import qs from "qs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const res = await fetch(
    `https://api.0x.org/tx-relay/v1/swap/price?${searchParams}`,
    {
      headers: {
        "0x-api-key": "57b28c7c-3bea-4367-be35-34f15013317c", // Replace with your own 0x API key https://dashboard.0x.org/create-account
        "0x-chain-id": "137",
      },
    }
  );
  const data = await res.json();

  return Response.json(data);
}
