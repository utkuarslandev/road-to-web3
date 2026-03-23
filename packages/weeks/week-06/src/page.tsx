"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { ethers } from "ethers"
import {
  AlertCircle,
  Banknote,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Wallet,
} from "lucide-react"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EXAMPLE_EXTERNAL_CONTRACT_ABI,
  Input,
  Label,
  STAKER_ABI,
  WEEK6_CONFIG,
  ZERO_ADDRESS,
  extractErrorMessage,
  getContract,
  truncateAddress,
  useToast,
  useWallet,
} from "@road/shared"

type Week6Snapshot = {
  staker: string
  stakedAt: bigint
  stakeDeadline: bigint
  withdrawDeadline: bigint
  stakedAmount: bigint
  withdrawn: boolean
  completedRounds: bigint
  rewardPerBlock: bigint
  secondsPerBlock: bigint
  reward: bigint
  withdrawableAmount: bigint
  contractBalance: bigint
  exampleExternalContract: string
  exampleContractReady: boolean
  exampleCompleted: boolean
  exampleCompletedAt: bigint
  exampleCompletionCount: bigint
  exampleTotalReceived: bigint
}

const blockTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatTimestamp(timestamp: bigint | number | null | undefined): string {
  if (!timestamp) return "Not set"
  return blockTimeFormatter.format(new Date(Number(timestamp) * 1000))
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "closed"

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatEth(value: bigint): string {
  const formatted = ethers.formatEther(value)
  return formatted.includes(".") ? formatted.replace(/\.?0+$/, "") : formatted
}

function formatBigint(value: bigint | null | undefined): string {
  return typeof value === "bigint" ? value.toString() : "—"
}

function isZeroAddress(address: string) {
  return address === ZERO_ADDRESS
}

export default function Week06Page() {
  const wallet = useWallet(WEEK6_CONFIG)
  const { toast } = useToast()
  const [readProvider] = useState(() => new ethers.JsonRpcProvider(WEEK6_CONFIG.rpcUrl))
  const [stakeAmount, setStakeAmount] = useState<string>(WEEK6_CONFIG.defaultStakeEth)
  const [snapshot, setSnapshot] = useState<Week6Snapshot | null>(null)
  const [deploymentWarning, setDeploymentWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<"stake" | "withdraw" | "lock" | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  const provider = wallet.provider ?? readProvider

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000))
    }, 5000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSnapshot() {
      setError(null)
      setDeploymentWarning(null)

      try {
        const block = await provider.getBlock("latest")
        if (!cancelled && block?.timestamp) {
          setNow(Number(block.timestamp))
        }

        if (isZeroAddress(WEEK6_CONFIG.contractAddress)) {
          if (!cancelled) {
            setSnapshot(null)
            setDeploymentWarning(
              "Week 6 is still using a zero-address placeholder. Deploy the Staker contract and update apps/web/lib/config/contracts.ts to enable transactions."
            )
          }
          return
        }

        const code = await provider.getCode(WEEK6_CONFIG.contractAddress)
        if (code === "0x") {
          if (!cancelled) {
            setSnapshot(null)
            setDeploymentWarning(
              `No contract bytecode found at ${WEEK6_CONFIG.contractAddress}. Deploy Staker before using the staking UI.`
            )
          }
          return
        }

        const stakerContract = getContract(WEEK6_CONFIG.contractAddress, STAKER_ABI, provider)
        const contractBalance = await provider.getBalance(WEEK6_CONFIG.contractAddress)
        const [
          exampleExternalContract,
          staker,
          stakedAt,
          stakeDeadline,
          withdrawDeadline,
          stakedAmount,
          withdrawn,
          completedRounds,
          rewardPerBlock,
          secondsPerBlock,
          reward,
          withdrawableAmount,
        ] = await Promise.all([
          stakerContract.exampleExternalContract() as Promise<string>,
          stakerContract.staker() as Promise<string>,
          stakerContract.stakedAt() as Promise<bigint>,
          stakerContract.stakeDeadline() as Promise<bigint>,
          stakerContract.withdrawDeadline() as Promise<bigint>,
          stakerContract.stakedAmount() as Promise<bigint>,
          stakerContract.withdrawn() as Promise<boolean>,
          stakerContract.completedRounds() as Promise<bigint>,
          stakerContract.REWARD_PER_BLOCK() as Promise<bigint>,
          stakerContract.SECONDS_PER_BLOCK() as Promise<bigint>,
          stakerContract.calculateReward() as Promise<bigint>,
          stakerContract.withdrawableAmount() as Promise<bigint>,
        ])

        let exampleCompleted = false
        let exampleCompletedAt = 0n
        let exampleCompletionCount = 0n
        let exampleTotalReceived = 0n
        let exampleContractReady = false
        const resolvedExampleAddress = !isZeroAddress(exampleExternalContract)
          ? exampleExternalContract
          : WEEK6_CONFIG.exampleExternalContractAddress

        if (!isZeroAddress(resolvedExampleAddress)) {
          const exampleCode = await provider.getCode(resolvedExampleAddress)
          if (exampleCode !== "0x") {
            exampleContractReady = true
            const exampleContract = getContract(resolvedExampleAddress, EXAMPLE_EXTERNAL_CONTRACT_ABI, provider)
            exampleCompleted = await exampleContract.completed()
            exampleCompletedAt = await exampleContract.completedAt()
            exampleCompletionCount = await exampleContract.completionCount()
            exampleTotalReceived = await exampleContract.totalReceived()
          }
        }

        if (!cancelled) {
          setSnapshot({
            staker,
            stakedAt,
            stakeDeadline,
            withdrawDeadline,
            stakedAmount,
            withdrawn,
            completedRounds,
            rewardPerBlock,
            secondsPerBlock,
            reward,
            withdrawableAmount,
            contractBalance,
            exampleExternalContract: resolvedExampleAddress,
            exampleContractReady,
            exampleCompleted,
            exampleCompletedAt,
            exampleCompletionCount,
            exampleTotalReceived,
          })
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(extractErrorMessage(loadError))
        }
      }
    }

    void loadSnapshot()

    return () => {
      cancelled = true
    }
  }, [provider, refreshKey])

  const deployed = !isZeroAddress(WEEK6_CONFIG.contractAddress) && Boolean(snapshot)
  const activeCycle = snapshot ? snapshot.stakedAmount > 0n : false
  const stakeDeadline = snapshot ? Number(snapshot.stakeDeadline) : 0
  const withdrawDeadline = snapshot ? Number(snapshot.withdrawDeadline) : 0
  const stakeWindowOpen = snapshot ? !activeCycle : false
  const withdrawWindowOpen = snapshot ? activeCycle && now >= stakeDeadline && now < withdrawDeadline : false
  const lockWindowOpen = snapshot ? activeCycle && now >= withdrawDeadline : false
  const hasStake = activeCycle
  const withdrawFunded = snapshot ? snapshot.contractBalance >= snapshot.withdrawableAmount : false
  const rewardPoolBalance = snapshot
    ? snapshot.contractBalance > snapshot.stakedAmount
      ? snapshot.contractBalance - snapshot.stakedAmount
      : 0n
    : 0n
  const isCurrentStaker =
    Boolean(snapshot) &&
    Boolean(wallet.address) &&
    snapshot!.staker.toLowerCase() === wallet.address!.toLowerCase()
  const canStake = Boolean(snapshot) && !activeCycle
  const canWithdraw = Boolean(snapshot) && withdrawWindowOpen && hasStake && withdrawFunded && isCurrentStaker
  const canLock =
    snapshot !== null &&
    lockWindowOpen &&
    snapshot.contractBalance > 0n &&
    snapshot.exampleContractReady
  const isLoading = !snapshot && !deploymentWarning && !error
  const cycleStatus = isLoading
    ? "Loading"
    : !snapshot
    ? "Unavailable"
    : !activeCycle
    ? "Open for next staker"
    : withdrawWindowOpen
    ? "Withdraw open"
    : lockWindowOpen
    ? "Lock ready"
    : "Stake in progress"
  const connectedRole = !wallet.isConnected
    ? "Wallet not connected"
    : isCurrentStaker
    ? "Current staker"
    : activeCycle
    ? "Visitor waiting for next round"
    : "Next staker eligible"
  const contractHealth = !snapshot
    ? "Loading on-chain state"
    : !snapshot.exampleContractReady
    ? "External contract not ready"
    : activeCycle
    ? withdrawFunded
      ? "Active round is funded for withdrawal"
      : "Active round is underfunded"
    : "Contract is idle and ready for a new staker"
  const nextTransitionLabel = !snapshot
    ? "Waiting for on-chain read"
    : !activeCycle
    ? "Next stake can start now"
    : withdrawWindowOpen
    ? `Withdraw window closes in ${withdrawCountdown}`
    : lockWindowOpen
    ? "Lock window is open now"
    : `Withdraw window opens in ${stakeCountdown}`

  async function runWalletAction(
    action: "stake" | "withdraw" | "lock",
    txFactory: () => Promise<ethers.ContractTransactionResponse>,
    successTitle: string,
    successDescription: string
  ) {
    if (!wallet.isConnected) {
      await wallet.connect()
      return
    }

    setPendingAction(action)

    try {
      const tx = await txFactory()
      toast({
        title: "Transaction sent",
        description: "Waiting for confirmation...",
      })
      await tx.wait()
      toast({
        title: successTitle,
        description: successDescription,
      })
      setRefreshKey((prev: number) => prev + 1)
    } catch (actionError) {
      toast({
        title: "Transaction failed",
        description: extractErrorMessage(actionError),
        variant: "destructive",
      })
    } finally {
      setPendingAction(null)
    }
  }

  async function handleStakeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canStake) {
      toast({
        title: "Stake unavailable",
        description: activeCycle
          ? "Another wallet is currently using this round. Wait for that wallet to withdraw or for the round to be locked."
          : "This staking round is not available right now.",
        variant: "destructive",
      })
      return
    }

    const normalizedAmount = stakeAmount.trim()
    if (!normalizedAmount) {
      toast({
        title: "Missing amount",
        description: "Enter an ETH amount before staking.",
        variant: "destructive",
      })
      return
    }

    let parsedAmount: bigint
    try {
      parsedAmount = ethers.parseEther(normalizedAmount)
    } catch {
      toast({
        title: "Invalid amount",
        description: "Use a valid ETH amount like 0.01.",
        variant: "destructive",
      })
      return
    }

    if (parsedAmount <= 0n) {
      toast({
        title: "Invalid amount",
        description: "Stake amount must be greater than zero.",
        variant: "destructive",
      })
      return
    }

    const stakerContract = getContract(WEEK6_CONFIG.contractAddress, STAKER_ABI, wallet.signer || wallet.provider || provider)

    await runWalletAction(
      "stake",
      () => stakerContract.stake({ value: parsedAmount }),
      "Stake confirmed",
      `Locked ${ethers.formatEther(parsedAmount)} ETH into the Staker contract.`
    )
  }

  async function handleWithdraw() {
    if (!canWithdraw) {
      toast({
        title: "Withdraw unavailable",
        description: withdrawWindowOpen
          ? "The contract does not currently have enough balance to cover the payout."
          : "Withdrawals are only available after the stake window closes and before the lock window starts.",
        variant: "destructive",
      })
      return
    }

    const stakerContract = getContract(WEEK6_CONFIG.contractAddress, STAKER_ABI, wallet.signer || wallet.provider || provider)

    await runWalletAction(
      "withdraw",
      () => stakerContract.withdraw(),
      "Withdrawal confirmed",
      `Released ${ethers.formatEther(snapshot?.withdrawableAmount ?? 0n)} ETH back to the staker.`
    )
  }

  async function handleLockFunds() {
    if (!canLock) {
      toast({
        title: "Lock unavailable",
        description: "Funds can only be locked after the withdraw window closes, while the contract still holds balance, and after the external contract is ready.",
        variant: "destructive",
      })
      return
    }

    const stakerContract = getContract(WEEK6_CONFIG.contractAddress, STAKER_ABI, wallet.signer || wallet.provider || provider)

    await runWalletAction(
      "lock",
      () => stakerContract.lockFundsInExternalContract(),
      "Funds locked",
      "Transferred the remaining contract balance into the external completion contract."
    )
  }

  const stakeCountdown = snapshot ? formatCountdown(stakeDeadline - now) : "n/a"
  const withdrawCountdown = snapshot ? formatCountdown(withdrawDeadline - now) : "n/a"
  const lockCountdown = snapshot ? formatCountdown(withdrawDeadline - now) : "n/a"

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Badge variant="default">Week 6</Badge>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isLoading ? "secondary" : deployed ? "success" : "destructive"}>
              {isLoading ? "LOADING" : deployed ? "READY" : "NOT DEPLOYED"}
            </Badge>
            <Badge variant="secondary">Sepolia</Badge>
            {wallet.isConnected && wallet.address && (
              <Badge variant="outline">Connected: {truncateAddress(wallet.address)}</Badge>
            )}
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-3">Staking Application</h1>
        <p className="text-muted-foreground max-w-3xl">
          Public sequential staking on Sepolia: one wallet runs an active round, withdraws during the payout window, then the next visitor can start the next round from the website.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <Card className="glass p-6">
          <CardTitle className="text-base mb-3">Contract Status</CardTitle>
          <div className="flex flex-col gap-2 text-sm">
            <Badge variant={deployed ? "success" : "destructive"} className="w-fit">
              {deployed ? cycleStatus : "Unavailable"}
            </Badge>
            <p className="text-muted-foreground">{contractHealth}</p>
          </div>
        </Card>

        <Card className="glass p-6">
          <CardTitle className="text-base mb-3">Connected Wallet</CardTitle>
          <div className="flex flex-col gap-2 text-sm">
            <Badge variant={isCurrentStaker ? "default" : wallet.isConnected ? "secondary" : "outline"} className="w-fit">
              {connectedRole}
            </Badge>
            <p className="text-muted-foreground">
              {wallet.address ? truncateAddress(wallet.address) : "Connect a Sepolia wallet to transact."}
            </p>
          </div>
        </Card>

        <Card className="glass p-6">
          <CardTitle className="text-base mb-3">Reward Pool</CardTitle>
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-mono text-2xl">{snapshot ? `${formatEth(rewardPoolBalance)} ETH` : "—"}</p>
            <p className="text-muted-foreground">
              {snapshot
                ? activeCycle
                  ? withdrawFunded
                    ? "Covers the current staker payout."
                    : "Does not fully cover the current payout."
                  : "Idle balance available for the next round."
                : "Loading reward pool balance."}
            </p>
          </div>
        </Card>

        <Card className="glass p-6">
          <CardTitle className="text-base mb-3">Next Transition</CardTitle>
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">{nextTransitionLabel}</p>
            <p className="text-muted-foreground">
              {snapshot
                ? activeCycle
                  ? `Stake closes at ${formatTimestamp(snapshot.stakeDeadline)} and withdraw closes at ${formatTimestamp(snapshot.withdrawDeadline)}.`
                  : "A visitor can start the next round immediately."
                : "Waiting for contract timers."}
            </p>
          </div>
        </Card>
      </div>

      {(deploymentWarning || error) && (
        <Card className="glass p-6 mb-8 border-dashed">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 mt-1 text-destructive" />
            <div className="space-y-1">
              <h2 className="font-semibold">{deploymentWarning ? "Deployment needed" : "Read error"}</h2>
              <p className="text-sm text-muted-foreground">{deploymentWarning || error}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
        <Card className="glass p-0 overflow-hidden">
          <CardHeader className="p-6 border-b border-border/50">
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Stake ETH
            </CardTitle>
            <CardDescription>
              Any visitor can start the next round when no stake is active. After a withdraw or lock, the contract resets and the next wallet can participate.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleStakeSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="stake-amount" className="font-mono text-xs tracking-wider uppercase">
                  Amount (ETH)
                </Label>
                <Input
                  id="stake-amount"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={stakeAmount}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setStakeAmount(event.target.value)}
                  placeholder={WEEK6_CONFIG.defaultStakeEth}
                  className="font-mono"
                  disabled={!canStake || pendingAction !== null || !deployed}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <Button
                  type="submit"
                  disabled={!deployed || pendingAction === "stake" || !canStake}
                  className="w-full"
                >
                  {pendingAction === "stake" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Staking
                    </>
                  ) : !wallet.isConnected ? (
                    <>
                      <Wallet className="h-4 w-4" />
                      Connect wallet
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Stake ETH
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleWithdraw}
                  disabled={!deployed || pendingAction === "withdraw" || !canWithdraw}
                  className="w-full"
                >
                  {pendingAction === "withdraw" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Withdrawing
                    </>
                  ) : (
                    <>
                      <Clock3 className="h-4 w-4" />
                      Withdraw
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLockFunds}
                  disabled={!deployed || pendingAction === "lock" || !canLock}
                  className="w-full"
                >
                  {pendingAction === "lock" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Locking
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Lock funds
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
                <p>Wallet: {wallet.isConnected ? "Connected" : "Not connected"}</p>
                <p>Round status: {cycleStatus}</p>
                <p>Next stake: {stakeWindowOpen ? "open to any wallet" : "waiting for active round to finish"}</p>
                <p>Withdraw window: {withdrawWindowOpen ? `open for ${withdrawCountdown}` : activeCycle ? (lockWindowOpen ? "closed" : `opens in ${stakeCountdown}`) : "n/a"}</p>
                <p>Withdrawal funding: {snapshot ? (activeCycle ? (withdrawFunded ? "ready" : "insufficient contract balance") : "reward pool idle") : "loading"}</p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <CardTitle className="text-xl">Live State</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setRefreshKey((prev: number) => prev + 1)}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Cycle</span>
                <Badge variant={isLoading ? "secondary" : !activeCycle ? "success" : withdrawWindowOpen ? "secondary" : lockWindowOpen ? "destructive" : "default"}>
                  {cycleStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Staker</span>
                <span className="font-mono">{snapshot && !isZeroAddress(snapshot.staker) ? truncateAddress(snapshot.staker) : "Open round"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Staked amount</span>
                <span className="font-mono">{snapshot ? `${formatEth(snapshot.stakedAmount)} ETH` : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Withdrawable</span>
                <span className="font-mono">{snapshot ? `${formatEth(snapshot.withdrawableAmount)} ETH` : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Contract balance</span>
                <span className="font-mono">{snapshot ? `${formatEth(snapshot.contractBalance)} ETH` : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Reward pool only</span>
                <span className="font-mono">{snapshot ? `${formatEth(rewardPoolBalance)} ETH` : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Reward per block</span>
                <span className="font-mono">{snapshot ? `${formatEth(snapshot.rewardPerBlock)} ETH` : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Completed rounds</span>
                <span className="font-mono">{formatBigint(snapshot?.completedRounds)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Payout funding</span>
                <Badge variant={!snapshot ? "secondary" : withdrawFunded || !activeCycle ? "success" : "destructive"}>
                  {!snapshot ? "Loading" : !activeCycle ? "Idle" : withdrawFunded ? "Funded" : "Underfunded"}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="glass p-6">
            <CardTitle className="text-xl mb-4">Live Timers</CardTitle>
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Stake window</span>
                <span className="font-mono">
                  {!snapshot ? "—" : !activeCycle ? "Open now" : `Closes in ${stakeCountdown}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Withdraw window</span>
                <span className="font-mono">
                  {!snapshot
                    ? "—"
                    : !activeCycle
                    ? "Starts after next stake"
                    : withdrawWindowOpen
                    ? `Open for ${withdrawCountdown}`
                    : lockWindowOpen
                    ? "Closed"
                    : `Opens in ${stakeCountdown}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Lock window</span>
                <span className="font-mono">
                  {!snapshot
                    ? "—"
                    : !activeCycle
                    ? "Starts after next stake"
                    : lockWindowOpen
                    ? "Open now"
                    : `Opens in ${lockCountdown}`}
                </span>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-muted-foreground">
                {!snapshot
                  ? "Waiting for contract timers."
                  : !activeCycle
                  ? "No active round. The next visitor can stake immediately and start both timers."
                  : `Stake deadline: ${formatTimestamp(snapshot.stakeDeadline)}. Withdraw deadline: ${formatTimestamp(snapshot.withdrawDeadline)}.`}
              </div>
            </div>
          </Card>

          <Card className="glass p-6">
            <CardTitle className="text-xl mb-4">Contract Details</CardTitle>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Staker contract</p>
                {deployed ? (
                  <Link
                    href={`${WEEK6_CONFIG.explorer}/address/${WEEK6_CONFIG.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    {truncateAddress(WEEK6_CONFIG.contractAddress)}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="font-mono text-muted-foreground">0x0000000000000000000000000000000000000000</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1">External contract</p>
                {snapshot && snapshot.exampleContractReady ? (
                  <Link
                    href={`${WEEK6_CONFIG.explorer}/address/${snapshot.exampleExternalContract}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    {truncateAddress(snapshot.exampleExternalContract)}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="text-muted-foreground">
                    {snapshot && !isZeroAddress(snapshot.exampleExternalContract) ? "Missing bytecode" : "Not configured yet"}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground mb-1">Stake deadline</p>
                  <p className="font-mono text-xs">{snapshot && activeCycle ? formatTimestamp(snapshot.stakeDeadline) : "Starts on next stake"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Withdraw deadline</p>
                  <p className="font-mono text-xs">{snapshot && activeCycle ? formatTimestamp(snapshot.withdrawDeadline) : "Starts on next stake"}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Lock state</p>
                <p className="flex items-center gap-2">
                  {canLock ? <ShieldCheck className="h-4 w-4 text-neon-green" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  {canLock
                    ? "Funds can be locked into the external contract."
                    : "Locking requires an active round with a closed withdraw window, a funded contract, and a ready external contract."}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Reward pool status</p>
                <p className="flex items-center gap-2">
                  {snapshot && (withdrawFunded || !activeCycle) ? (
                    <ShieldCheck className="h-4 w-4 text-neon-green" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {snapshot
                    ? activeCycle
                      ? withdrawFunded
                        ? `Reward pool covers the ${formatEth(snapshot.withdrawableAmount)} ETH withdrawal.`
                        : `Reward pool is short for the ${formatEth(snapshot.withdrawableAmount)} ETH withdrawal.`
                      : `Idle reward pool balance: ${formatEth(rewardPoolBalance)} ETH.`
                    : "Loading reward pool status."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="glass p-6">
          <CardTitle className="text-xl mb-4">How It Works</CardTitle>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <ShieldCheck className="h-4 w-4 mt-0.5 text-neon-green shrink-0" />
              Connect a wallet on Sepolia and start the next round when the contract is open for a new staker.
            </li>
            <li className="flex gap-3">
              <Clock3 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              The active staker can withdraw after the stake timer ends and before the lock timer starts.
            </li>
            <li className="flex gap-3">
              <Lock className="h-4 w-4 mt-0.5 text-week2 shrink-0" />
              If the withdraw window closes first, anyone can lock the remaining balance and the contract resets for the next visitor.
            </li>
          </ul>
        </Card>

        <Card className="glass p-6">
          <CardTitle className="text-xl mb-4">On-Chain Numbers</CardTitle>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Staked at</p>
              <p>{snapshot ? formatTimestamp(snapshot.stakedAt) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Withdrawn</p>
              <p>{snapshot ? (activeCycle ? (snapshot.withdrawn ? "Yes" : "No") : "Round reset") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Seconds per block</p>
              <p className="font-mono">{formatBigint(snapshot?.secondsPerBlock)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Example contract</p>
              <p>{snapshot ? (snapshot.exampleCompletionCount > 0n ? "Receiving completed rounds" : "Waiting for first lock") : "—"}</p>
            </div>
          </div>
          {snapshot && snapshot.exampleCompletionCount > 0n && (
            <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
              External contract has received {formatEth(snapshot.exampleTotalReceived)} ETH across {formatBigint(snapshot.exampleCompletionCount)} locked rounds. Last update: {formatTimestamp(snapshot.exampleCompletedAt)}.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
