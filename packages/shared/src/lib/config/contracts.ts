// Contract configurations for all weeks

import { SEPOLIA, POLYGON_AMOY } from "./chains"

export const COFFEE_ABI = [
  "function buyCoffee(string name, string message) public payable",
  "function memos() external view returns (tuple(address supporter, uint256 timestamp, string name, string message)[])",
] as const

export const CHAIN_BATTLES_ABI = [
  "function mint() external",
  "function train(uint256 tokenId) external",
  "function battle(uint256 attackerId, uint256 defenderId) external returns (bool)",
  "function statsOf(uint256 tokenId) external view returns (tuple(uint48 lastAction, uint16 level, uint16 power, uint16 agility, uint16 vitality, uint32 victories, uint32 defeats, uint8 rarity))",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
] as const

export const BULLBEAR_ABI = [
  "function safeMint(address to) external returns (uint256 requestId)",
  "function owner() external view returns (address)",
] as const

export const STAKER_ABI = [
  "function exampleExternalContract() external view returns (address)",
  "function staker() external view returns (address)",
  "function stakedAt() external view returns (uint256)",
  "function stakeDeadline() external view returns (uint256)",
  "function withdrawDeadline() external view returns (uint256)",
  "function STAKE_WINDOW_DURATION() external view returns (uint256)",
  "function WITHDRAW_WINDOW_DURATION() external view returns (uint256)",
  "function stakedAmount() external view returns (uint256)",
  "function withdrawn() external view returns (bool)",
  "function completedRounds() external view returns (uint256)",
  "function REWARD_PER_BLOCK() external view returns (uint256)",
  "function SECONDS_PER_BLOCK() external view returns (uint256)",
  "function calculateReward() external view returns (uint256)",
  "function withdrawableAmount() external view returns (uint256)",
  "function stake() external payable",
  "function fundRewards() external payable",
  "function withdraw() external",
  "function lockFundsInExternalContract() external",
  "event CycleReset(uint256 completedRounds)",
  "event RewardsFunded(address indexed funder, uint256 amount)",
  "event Staked(address indexed staker, uint256 amount)",
  "event Withdrawn(address indexed staker, uint256 payout, uint256 reward)",
] as const

export const EXAMPLE_EXTERNAL_CONTRACT_ABI = [
  "function completed() external view returns (bool)",
  "function completedAt() external view returns (uint256)",
  "function totalReceived() external view returns (uint256)",
  "function completionCount() external view returns (uint256)",
  "function complete() external payable",
  "event FundsLocked(address indexed caller, uint256 amount, uint256 timestamp)",
] as const

export const RARITY_LABELS = ["Common", "Uncommon", "Rare", "Epic", "Mythic"] as const
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const
const NEXT_PUBLIC_WEEK6_STAKER_ADDRESS =
  process.env.NEXT_PUBLIC_WEEK6_STAKER_ADDRESS?.trim() || ""
const NEXT_PUBLIC_WEEK6_EXAMPLE_EXTERNAL_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_WEEK6_EXAMPLE_EXTERNAL_CONTRACT_ADDRESS?.trim() || ""

/**
 * Week 1 Configuration - LabMint Trophy
 */
export const WEEK1_CONFIG = {
  ...SEPOLIA,
  contractAddress: "0xc84a1D9044Ceb74EC8C17FfD465f1af6Fe0e53DF",
  tokenId: 0,
  callData: "0xc87b56dd0000000000000000000000000000000000000000000000000000000000000000",
  cacheKey: "utkulabs:week1:trophy",
} as const

/**
 * Week 2 Configuration - Buy Me a Coffee
 */
export const WEEK2_CONFIG = {
  ...SEPOLIA,
  contractAddress: "0x86a531F9Fa82E220B28c854C900178c37CFC9ab5",
  defaultAmountEth: "0.001",
} as const

/**
 * Week 3 Configuration - Chain Battles
 */
export const WEEK3_CONFIG = {
  ...POLYGON_AMOY,
  contractAddress: "0x7930FD2407eAc725319F85b693867f0aa81e6b7E",
  deployerAddress: "0x35313FB0881423D798BcFA3b68741c512Df31559", // Deployer address to show NFTs when wallet not connected
  cooldownSeconds: 60,
  defaultTokenId: 1, // Default token ID to try loading
} as const

/**
 * Week 5 Configuration - Bull & Bear NFT
 */
export const WEEK5_BULLBEAR_CONFIG = {
  ...SEPOLIA,
  contractAddress: "0xde928aF3f321D040bcC0795309Ae88Fd8bEd5A4E",
  tokenId: 1,
} as const

/**
 * Week 6 Configuration - Staking Application
 */
export const WEEK6_CONFIG = {
  ...SEPOLIA,
  contractAddress: NEXT_PUBLIC_WEEK6_STAKER_ADDRESS || ZERO_ADDRESS,
  exampleExternalContractAddress:
    NEXT_PUBLIC_WEEK6_EXAMPLE_EXTERNAL_CONTRACT_ADDRESS || ZERO_ADDRESS,
  defaultStakeEth: "0.01",
} as const
