import { expect } from "chai";
import type { ContractTransactionResponse } from "ethers";
import { network } from "hardhat";

async function deployFixture(initialRewardFundEth = "0.03") {
  const { ethers } = await network.connect();
  const [deployer, alice, bob] = await ethers.getSigners();

  const ExampleExternalContract = await ethers.getContractFactory("ExampleExternalContract");
  const example = await ExampleExternalContract.deploy();
  await example.waitForDeployment();

  const Staker = await ethers.getContractFactory("Staker");
  const staker = await Staker.deploy(await example.getAddress(), {
    value: ethers.parseEther(initialRewardFundEth),
  });
  await staker.waitForDeployment();

  return { ethers, deployer, alice, bob, example, staker };
}

async function increaseTime(seconds: number, provider: { send: (method: string, params: unknown[]) => Promise<unknown> }) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

async function expectRevertWith(promise: Promise<unknown>, errorName: string) {
  try {
    await promise;
    expect.fail(`Expected call to be reverted with ${errorName}`);
  } catch (err) {
    const parsedName =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any)?.errorName ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any)?.info?.errorName ||
      String(err);
    expect(String(parsedName)).to.contain(errorName);
  }
}

async function findEventArgs(
  contract: { getAddress: () => Promise<string>; interface: { parseLog: (log: unknown) => unknown } },
  tx: ContractTransactionResponse,
  eventName: string
) {
  const receipt = await tx.wait();
  if (!receipt?.logs) return null;
  const contractAddress = await contract.getAddress();

  for (const log of receipt.logs) {
    if (log.address !== contractAddress) continue;
    try {
      const parsed = contract.interface.parseLog(log) as { name?: string; args?: unknown } | null;
      if (parsed?.name === eventName) {
        return parsed.args ?? null;
      }
    } catch {
      // Ignore unrelated logs
    }
  }

  return null;
}

describe("Staker", () => {
  it("starts the staking window on the first stake instead of at deployment", async () => {
    const { staker, alice, ethers } = await deployFixture();
    const stakeValue = ethers.parseEther("0.01");

    expect(await staker.stakeDeadline()).to.equal(0n);
    expect(await staker.withdrawDeadline()).to.equal(0n);

    const tx = await staker.connect(alice).stake({ value: stakeValue });
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    const stakeDeadline = await staker.stakeDeadline();
    const withdrawDeadline = await staker.withdrawDeadline();

    expect(await staker.staker()).to.equal(alice.address);
    expect(await staker.stakedAmount()).to.equal(stakeValue);
    expect(stakeDeadline).to.equal(BigInt(block!.timestamp + 120));
    expect(withdrawDeadline).to.equal(BigInt(block!.timestamp + 240));
  });

  it("accepts reward funding both at deployment and after deployment", async () => {
    const { staker, bob, ethers } = await deployFixture("0.03");
    const initialBalance = await ethers.provider.getBalance(await staker.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("0.03"));

    const topUp = ethers.parseEther("0.4");
    const tx = await staker.connect(bob).fundRewards({ value: topUp });
    const eventArgs = await findEventArgs(staker, tx, "RewardsFunded");
    const finalBalance = await ethers.provider.getBalance(await staker.getAddress());

    expect(eventArgs).to.not.equal(null);
    expect(finalBalance).to.equal(initialBalance + topUp);
  });

  it("allows the staker to withdraw in the withdraw window when rewards are funded", async () => {
    const { staker, alice, ethers } = await deployFixture("0.03");
    const stakeValue = ethers.parseEther("0.01");

    await staker.connect(alice).stake({ value: stakeValue });
    await increaseTime(121, ethers.provider);

    const withdrawableAmount = await staker.withdrawableAmount();
    expect(withdrawableAmount).to.equal(ethers.parseEther("0.02"));

    const tx = await staker.connect(alice).withdraw();
    const eventArgs = await findEventArgs(staker, tx, "Withdrawn");

    expect(await staker.staker()).to.equal(ethers.ZeroAddress);
    expect(await staker.stakedAmount()).to.equal(0n);
    expect(await staker.stakeDeadline()).to.equal(0n);
    expect(await staker.withdrawn()).to.equal(false);
    expect(await staker.completedRounds()).to.equal(1n);
    expect(eventArgs).to.not.equal(null);
    expect(await ethers.provider.getBalance(await staker.getAddress())).to.equal(
      ethers.parseEther("0.02")
    );
  });

  it("locks remaining funds into the external contract after the withdraw window closes", async () => {
    const { staker, example, alice, ethers } = await deployFixture("0.03");
    const stakeValue = ethers.parseEther("0.01");

    await staker.connect(alice).stake({ value: stakeValue });
    await increaseTime(241, ethers.provider);

    await staker.lockFundsInExternalContract();

    expect(await example.completed()).to.equal(true);
    expect(await example.totalReceived()).to.equal(ethers.parseEther("0.04"));
    expect(await example.completionCount()).to.equal(1n);
    expect(await staker.completedRounds()).to.equal(1n);
    expect(await staker.stakedAmount()).to.equal(0n);
    expect(await ethers.provider.getBalance(await staker.getAddress())).to.equal(0n);
  });

  it("rejects zero-value reward funding", async () => {
    const { staker } = await deployFixture();
    await expectRevertWith(staker.fundRewards(), "ZeroValue");
  });

  it("allows a new visitor to stake after the previous round withdraws", async () => {
    const { staker, alice, bob, ethers } = await deployFixture("0.05");
    const stakeValue = ethers.parseEther("0.01");

    await staker.connect(alice).stake({ value: stakeValue });
    await increaseTime(121, ethers.provider);
    await staker.connect(alice).withdraw();

    await staker.connect(bob).stake({ value: stakeValue });

    expect(await staker.staker()).to.equal(bob.address);
    expect(await staker.stakedAmount()).to.equal(stakeValue);
    expect(await staker.completedRounds()).to.equal(1n);
  });

  it("accumulates locked funds across multiple rounds", async () => {
    const { staker, example, alice, bob, ethers } = await deployFixture("0.05");
    const stakeValue = ethers.parseEther("0.01");

    await staker.connect(alice).stake({ value: stakeValue });
    await increaseTime(241, ethers.provider);
    await staker.lockFundsInExternalContract();

    await staker.connect(bob).stake({ value: stakeValue });
    await increaseTime(241, ethers.provider);
    await staker.lockFundsInExternalContract();

    expect(await example.completionCount()).to.equal(2n);
    expect(await example.totalReceived()).to.equal(ethers.parseEther("0.07"));
    expect(await staker.completedRounds()).to.equal(2n);
  });
});
