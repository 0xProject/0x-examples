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
import { mainnet } from "wagmi/chains";
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

const config = createConfig({
  chains: [mainnet],
  // turn off injected provider discovery
  multiInjectedProviderDiscovery: false,
  connectors,
  ssr: true,
  transports: { [mainnet.id]: http() },
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
