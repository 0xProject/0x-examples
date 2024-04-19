import { type NextRequest } from "next/server";
// import qs from "qs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const tradeHash = searchParams.get("tradeHash");
  console.log(tradeHash);

  const res = await fetch(
    `https://api.0x.org/tx-relay/v1/swap/status/${tradeHash}`,
    {
      headers: {
        "0x-api-key": process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
        "0x-chain-id": searchParams.get("chainId") as string,
      },
    }
  );

  const data = await res.json();

  console.log(data, "<-/status data");
  console.log(
    `https://api.0x.org/tx-relay/v1/swap/status?${searchParams}`,
    "<-/status API call"
  );

  return Response.json(data);
}
