import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import { defineConfig } from "hardhat/config";
import type { NetworksUserConfig } from "hardhat/types";
import * as dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env.local") });

const networks: NetworksUserConfig = (() => {
  const alchemySepoliaKey = process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_API_KEY;
  const rawPrivateKey = process.env.PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY;
  const privateKey = rawPrivateKey
    ? rawPrivateKey.startsWith("0x")
      ? rawPrivateKey
      : `0x${rawPrivateKey}`
    : undefined;
  const rpcUrl =
    process.env.RPC_URL ||
    (alchemySepoliaKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemySepoliaKey}` : undefined);
  if (!rpcUrl) return {};

  return {
    external: {
      type: "http",
      url: rpcUrl,
      accounts: privateKey ? [privateKey] : undefined,
    },
  };
})();

export default defineConfig({
  solidity: {
    version: "0.8.30",
  },
  plugins: [hardhatEthers, hardhatMocha],
  networks,
});
