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
        "0x-api-key": "57b28c7c-3bea-4367-be35-34f15013317c",
        "0x-chain-id": "137",
      },
    }
  );
  console.log();
  const data = await res.json();

  console.log(data, "<-/status data");
  console.log(
    `https://api.0x.org/tx-relay/v1/swap/status?${searchParams}`,
    "<-/status API call"
  );

  return Response.json(data);
}
