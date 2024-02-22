import { useEffect, useState, useRef } from "react";
import { useNetwork } from "wagmi";

type StatusResponse = {
  transactions: { hash: string; timestamp: number }[];
} & (
  | { status: "pending" | "submitted" | "succeeded" | "confirmed" }
  | { status: "failed"; reason: string }
);

export default function StatusView({ tradeHash }: { tradeHash: string }) {
  const [statusData, setStatusData] = useState<StatusResponse>();
  const { chain } = useNetwork();
  const statusDataRef = useRef(); // useRef to keep track of statusData

  // Check the status of a trade
  useEffect(() => {
    async function fetchStatus() {
      if (!chain) return;

      const response = await fetch(
        `/api/status?tradeHash=${tradeHash}&chainId=${chain.id}`
      );
      const data = await response.json();

      return data;
    }

    const intervalId = setInterval(async () => {
      const data = await fetchStatus();
      // console.log(statusData, typeof statusData, "<-statusData type");

      statusDataRef.current = data; // Update ref with the latest data
      setStatusData(data);

      console.log(statusDataRef.current, "<-statusDataRef.current");

      if (data.status === "confirmed") {
        window.clearInterval(intervalId);
      }
    }, 3000);
    return () => clearInterval(intervalId); // Clear the interval when the component unmounts
  }, [tradeHash, chain]);

  return (
    <div className="container mx-auto p-20 text-center">
      <h1 className="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
        Trade Status
      </h1>

      <div className="flex justify-center items-center">
        {statusData?.status === "confirmed" ? (
          <p className="text-lg">Transaction Completed! 🎉</p>
        ) : (
          <p className="text-lg">Transaction Pending ⏳</p>
        )}
      </div>
    </div>
  );
}
