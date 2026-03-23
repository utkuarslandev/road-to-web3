// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract ExampleExternalContract {
    bool public completed;
    uint256 public completedAt;
    uint256 public totalReceived;
    uint256 public completionCount;

    event FundsLocked(address indexed caller, uint256 amount, uint256 timestamp);

    function complete() external payable {
        require(msg.value > 0, "No value sent");
        completed = true;
        completedAt = block.timestamp;
        totalReceived += msg.value;
        completionCount += 1;
        emit FundsLocked(msg.sender, msg.value, block.timestamp);
    }
}
