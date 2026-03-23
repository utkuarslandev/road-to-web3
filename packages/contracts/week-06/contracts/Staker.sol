// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./ExampleExternalContract.sol";

error AlreadyStaked();
error StakeWindowClosed();
error ZeroValue();
error NotStaker();
error WithdrawWindowClosed();
error WithdrawWindowNotOpen();
error AlreadyWithdrawn();
error LockWindowNotOpen();
error NoFundsToLock();
error NoActiveCycle();
error Reentrancy();

contract Staker {
    ExampleExternalContract public immutable exampleExternalContract;
    uint256 public constant STAKE_WINDOW_DURATION = 2 minutes;
    uint256 public constant WITHDRAW_WINDOW_DURATION = 2 minutes;

    address public staker;
    uint256 public stakedAt;
    uint256 public stakeDeadline;
    uint256 public withdrawDeadline;
    uint256 public stakedAmount;
    bool public withdrawn;
    uint256 public completedRounds;
    bool private _entered;

    uint256 public constant REWARD_PER_BLOCK = 0.001 ether;
    uint256 public constant SECONDS_PER_BLOCK = 12;

    event Staked(address indexed staker, uint256 amount);
    event Withdrawn(address indexed staker, uint256 payout, uint256 reward);
    event RewardsFunded(address indexed funder, uint256 amount);
    event CycleReset(uint256 completedRounds);

    modifier nonReentrant() {
        if (_entered) revert Reentrancy();
        _entered = true;
        _;
        _entered = false;
    }

    modifier onlyStaker() {
        if (msg.sender != staker) revert NotStaker();
        _;
    }

    modifier stakeOpen() {
        if (stakeDeadline != 0 && block.timestamp >= stakeDeadline) revert StakeWindowClosed();
        _;
    }

    modifier withdrawOpen() {
        if (stakedAmount == 0) revert NoActiveCycle();
        if (block.timestamp < stakeDeadline) revert WithdrawWindowNotOpen();
        if (block.timestamp >= withdrawDeadline) revert WithdrawWindowClosed();
        _;
    }

    modifier withdrawClosed() {
        if (stakedAmount == 0) revert NoActiveCycle();
        if (block.timestamp < withdrawDeadline) revert LockWindowNotOpen();
        _;
    }

    constructor(address exampleExternalContractAddress) payable {
        exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
        if (msg.value > 0) {
            emit RewardsFunded(msg.sender, msg.value);
        }
    }

    function stake() external payable stakeOpen nonReentrant {
        if (msg.value == 0) revert ZeroValue();
        if (stakedAmount > 0) revert AlreadyStaked();

        staker = msg.sender;
        stakedAt = block.timestamp;
        stakeDeadline = block.timestamp + STAKE_WINDOW_DURATION;
        withdrawDeadline = stakeDeadline + WITHDRAW_WINDOW_DURATION;
        stakedAmount = msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function fundRewards() external payable nonReentrant {
        if (msg.value == 0) revert ZeroValue();
        emit RewardsFunded(msg.sender, msg.value);
    }

    function calculateReward() public view returns (uint256) {
        if (stakedAmount == 0 || block.timestamp <= stakedAt) {
            return 0;
        }

        uint256 lastRewardTimestamp = block.timestamp < stakeDeadline ? block.timestamp : stakeDeadline;
        if (lastRewardTimestamp <= stakedAt) {
            return 0;
        }

        uint256 eligibleSeconds = lastRewardTimestamp - stakedAt;
        return (eligibleSeconds * REWARD_PER_BLOCK) / SECONDS_PER_BLOCK;
    }

    function withdraw() external onlyStaker withdrawOpen nonReentrant {
        if (withdrawn) revert AlreadyWithdrawn();
        address currentStaker = staker;
        uint256 reward = calculateReward();
        uint256 payout = stakedAmount + reward;

        withdrawn = true;
        _resetCycle();
        // send after state changes to avoid reentrancy
        (bool success, ) = payable(currentStaker).call{value: payout}("");
        require(success, "Transfer failed");

        emit Withdrawn(currentStaker, payout, reward);
    }

    function withdrawableAmount() external view returns (uint256) {
        if (block.timestamp < stakeDeadline || block.timestamp >= withdrawDeadline || stakedAmount == 0 || withdrawn) {
            return 0;
        }

        return stakedAmount + calculateReward();
    }

    function lockFundsInExternalContract() external withdrawClosed nonReentrant {
        uint256 contractBalance = address(this).balance;
        if (contractBalance == 0) revert NoFundsToLock();
        exampleExternalContract.complete{value: contractBalance}();
        _resetCycle();
    }

    function _resetCycle() internal {
        staker = address(0);
        stakedAt = 0;
        stakeDeadline = 0;
        withdrawDeadline = 0;
        stakedAmount = 0;
        withdrawn = false;
        completedRounds += 1;
        emit CycleReset(completedRounds);
    }

    receive() external payable {}
}
