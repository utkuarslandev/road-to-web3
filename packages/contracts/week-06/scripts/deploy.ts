import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

function upsertEnvValue(fileContents: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(fileContents)) {
    return fileContents.replace(pattern, line);
  }

  const suffix = fileContents.endsWith("\n") || fileContents.length === 0 ? "" : "\n";
  return `${fileContents}${suffix}${line}\n`;
}

async function main() {
  const { ethers } = await network.connect();
  const initialRewardFundEth = process.env.INITIAL_REWARD_FUND_ETH?.trim() || "0.03";
  const initialRewardFund = ethers.parseEther(initialRewardFundEth);

  const ExampleExternalContract = await ethers.getContractFactory("ExampleExternalContract");
  const example = await ExampleExternalContract.deploy();
  await example.waitForDeployment();

  const Staker = await ethers.getContractFactory("Staker");
  const staker = await Staker.deploy(await example.getAddress(), {
    value: initialRewardFund,
  });
  await staker.waitForDeployment();

  const exampleAddress = await example.getAddress();
  const stakerAddress = await staker.getAddress();
  const rootEnvLocalPath = path.resolve(process.cwd(), "..", "..", "..", ".env.local");
  const existingEnvLocal = fs.existsSync(rootEnvLocalPath)
    ? fs.readFileSync(rootEnvLocalPath, "utf8")
    : "";

  let nextEnvLocal = existingEnvLocal;
  nextEnvLocal = upsertEnvValue(
    nextEnvLocal,
    "NEXT_PUBLIC_WEEK6_EXAMPLE_EXTERNAL_CONTRACT_ADDRESS",
    exampleAddress
  );
  nextEnvLocal = upsertEnvValue(
    nextEnvLocal,
    "NEXT_PUBLIC_WEEK6_STAKER_ADDRESS",
    stakerAddress
  );
  fs.writeFileSync(rootEnvLocalPath, nextEnvLocal);

  console.log("Initial reward fund (ETH):", initialRewardFundEth);
  console.log("ExampleExternalContract:", exampleAddress);
  console.log("Staker:", stakerAddress);
  console.log("Updated env:", rootEnvLocalPath);
  console.log("Example explorer:", `https://sepolia.etherscan.io/address/${exampleAddress}`);
  console.log("Staker explorer:", `https://sepolia.etherscan.io/address/${stakerAddress}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
