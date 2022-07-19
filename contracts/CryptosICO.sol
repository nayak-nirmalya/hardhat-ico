// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";

import "./Cryptos.sol";

contract CryptosICO is Cryptos {
    address public admin;
    address payable public deposit;
    uint public tokenPrice = 0.001 ether;
    uint public hardCap = 300 ether;
    uint public raisedAmount;
    uint public saleStart = block.timestamp;
    uint public saleEnd = block.timestamp + 604800; // ICO ends in one week
    uint public tokenTradeStart = saleEnd + 604800; // can only transfer after one week of sale end
    uint public maxInvestment = 5 ether;
    uint public minInvestment = 0.1 ether;

    enum State {
        BeforeStart,
        Running,
        AfterEnd,
        Halted
    }

    State public icoState;

    // Events
    event Invest(address investor, uint value, uint tokens);

    constructor(address payable _deposit) {
        deposit = _deposit;
        admin = msg.sender;
        icoState = State.BeforeStart;
        console.log("Admin Address: %s", admin);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not Admin!");
        _;
    }

    modifier onlyAfterTimePassed() {
        require(block.timestamp > tokenTradeStart, "Not Enough Time Passed!");
        _;
    }

    function halt() public onlyAdmin {
        icoState = State.Halted;
    }

    function resume() public onlyAdmin {
        require(getCurrentState() != State.Running, "ICO Already Running!");
        icoState = State.Running;
    }

    function getCurrentState() public view returns (State) {
        if (icoState == State.Halted) {
            return State.Halted;
        } else if (block.timestamp < saleStart) {
            return State.BeforeStart;
        } else if (block.timestamp >= saleStart && block.timestamp <= saleEnd) {
            return State.Running;
        } else {
            return State.AfterEnd;
        }
    }

    function changeDepositAddress(address payable newDeposit) public onlyAdmin {
        deposit = newDeposit;
    }

    function invest() public payable returns (bool) {
        icoState = getCurrentState();
        require(icoState == State.Running, "ICO is not Running!");
        require(
            msg.value >= minInvestment && msg.value <= maxInvestment,
            "Investment Value is not in acceptable range!"
        );

        raisedAmount += msg.value;
        require(raisedAmount <= hardCap, "Hardcap Reached!");

        uint tokens = msg.value / tokenPrice;

        balances[msg.sender] += tokens;
        balances[founder] -= tokens;
        deposit.transfer(msg.value);

        emit Invest(msg.sender, msg.value, tokens);

        return true;
    }

    receive() external payable {
        invest();
    }

    function transfer(address to, uint tokens)
        public
        override
        onlyAfterTimePassed
        returns (bool success)
    {
        return super.transfer(to, tokens);
    }

    function transferFrom(
        address from,
        address to,
        uint tokens
    ) public override onlyAfterTimePassed returns (bool success) {
        return super.transferFrom(from, to, tokens);
    }

    function burn() public returns (bool) {
        icoState = getCurrentState();
        require(icoState == State.AfterEnd, "ICO not Ended Yet!");
        balances[founder] = 0;
        return true;
    }
}
