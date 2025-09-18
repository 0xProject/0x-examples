"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  argentWallet,
  trustWallet,
  ledgerWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { mainnet, base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string;
coinbaseWallet.preference = "smartWalletOnly";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended Wallet",
      wallets: [coinbaseWallet],
    },
    {
      groupName: "Other",
      wallets: [
        rainbowWallet,
        metaMaskWallet,
        argentWallet,
        trustWallet,
        ledgerWallet,
      ],
    },
  ],
  {
    appName: "0x Swap Demo App",
    projectId,
  }
);

// Get RPC URL from environment variables with fallback
const getRpcUrl = (chainId: number) => {
  // Check for chain-specific environment variables first
  const chainEnvVar = `NEXT_PUBLIC_${
    chainId === 1 ? "ETHEREUM" : "BASE"
  }_RPC_URL`;
  const chainRpcUrl = process.env[chainEnvVar];

  if (chainRpcUrl) {
    return chainRpcUrl;
  }

  // Default fallbacks for each chain
  if (chainId === 1) {
    return "https://eth.llamarpc.com";
  } else if (chainId === 8453) {
    return "https://mainnet.base.org";
  }
};

const config = createConfig({
  chains: [mainnet, base],
  // turn off injected provider discovery
  multiInjectedProviderDiscovery: false,
  connectors,
  ssr: true,
  transports: {
    [mainnet.id]: http(getRpcUrl(mainnet.id)),
    [base.id]: http(getRpcUrl(base.id)),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "20px",
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>{children}</RainbowKitProvider>{" "}
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}
