export interface Chain {
  id: number;
  name: string;
  acrossSupported: boolean;
  moonpaySupported: boolean;
  testnet?: boolean;
}

export const CHAINS: Chain[] = [
  // Across + MoonPay supported
  { id: 1, name: "Ethereum", acrossSupported: true, moonpaySupported: true },
  { id: 10, name: "Optimism", acrossSupported: true, moonpaySupported: true },
  { id: 137, name: "Polygon", acrossSupported: true, moonpaySupported: true },
  { id: 324, name: "zkSync Era", acrossSupported: true, moonpaySupported: true },
  { id: 8453, name: "Base", acrossSupported: true, moonpaySupported: true },
  { id: 42161, name: "Arbitrum", acrossSupported: true, moonpaySupported: true },
  { id: 59144, name: "Linea", acrossSupported: true, moonpaySupported: true },

  // MoonPay only (no Across bridging)
  { id: 56, name: "BNB Chain", acrossSupported: false, moonpaySupported: true },
  { id: 43114, name: "Avalanche", acrossSupported: false, moonpaySupported: true },

  // Testnets (Across)
  { id: 11155111, name: "Ethereum Sepolia", acrossSupported: true, moonpaySupported: false, testnet: true },
  { id: 421614, name: "Arbitrum Sepolia", acrossSupported: true, moonpaySupported: false, testnet: true },
  { id: 84532, name: "Base Sepolia", acrossSupported: true, moonpaySupported: false, testnet: true },
  { id: 11155420, name: "Optimism Sepolia", acrossSupported: true, moonpaySupported: false, testnet: true },
];

export function getChain(id: number): Chain | undefined {
  return CHAINS.find((c) => c.id === id);
}

export function getBridgeableChains(): Chain[] {
  return CHAINS.filter((c) => c.acrossSupported && !c.testnet);
}

export function getWalletChains(): Chain[] {
  return CHAINS.filter((c) => c.moonpaySupported);
}
