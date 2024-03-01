import { type NextRequest } from "next/server";
// import qs from "qs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const res = await fetch(
    `https://api.0x.org/tx-relay/v1/swap/quote?${searchParams}`,
    {
      headers: {
        "0x-api-key": process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
        "0x-chain-id": searchParams.get("chainId") as string,
      },
    }
  );
  const data = await res.json();

  return Response.json(data);
}
