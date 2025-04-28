// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IWETH is IERC20 {
    function deposit() external payable;
}

contract SimpleTokenSwap {
    event BoughtTokens(IERC20 sellToken, IERC20 buyToken, uint256 boughtAmount);

    IWETH public immutable WETH;
    address public immutable owner;
    address public immutable allowanceHolder;

    /**
     * @dev Initializes the contract with WETH and AllowanceHolder addresses.
     * @param _weth Address of the WETH contract.
     * @param _allowanceHolder Address of the AllowanceHolder contract (for 0x API v2).
     */
    constructor(IWETH _weth, address _allowanceHolder) {
        WETH = _weth;
        allowanceHolder = _allowanceHolder;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }
    receive() external payable {}

    /**
     * @dev Withdraws ERC20 tokens from the contract to the owner.
     * @param token ERC20 token to withdraw.
     * @param amount Amount of tokens to withdraw.
     */
    function withdrawToken(IERC20 token, uint256 amount) external onlyOwner {
        require(token.transfer(msg.sender, amount), "TOKEN_TRANSFER_FAILED");
    }

    /**
     * @dev Withdraws ETH from the contract to the owner.
     * @param amount Amount of ETH to withdraw.
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH_TRANSFER_FAILED");
    }

    /**
     * @dev Converts ETH sent to the contract into WETH.
     * Can be used to fund the contract for WETH-based swaps.
     */
    function depositETH() external payable {
        WETH.deposit{value: msg.value}();
    }

    /**
     * @dev Executes a token swap using the 0x API v2.
     * @param sellToken Token to sell (e.g., WETH).
     * @param buyToken Token to buy (e.g., DAI).
     * @param spender Address approved to spend the sellToken.
     * @param swapTarget Address of the 0x API contract to execute the swap.
     * @param swapCallData Encoded calldata for the swap (from 0x API quote).
     */
    function fillQuote(
        IERC20 sellToken,
        IERC20 buyToken,
        address spender,
        address payable swapTarget,
        bytes calldata swapCallData
    ) external payable onlyOwner {
        require(swapTarget == allowanceHolder, "INVALID_SWAP_TARGET");

        uint256 balanceBefore = buyToken.balanceOf(address(this));

        require(
            sellToken.approve(spender, type(uint256).max),
            "APPROVAL_FAILED"
        );

        (bool success, ) = swapTarget.call{value: msg.value}(swapCallData);
        require(success, "SWAP_CALL_FAILED");

        uint256 balanceAfter = buyToken.balanceOf(address(this));
        emit BoughtTokens(sellToken, buyToken, balanceAfter - balanceBefore);
    }
}
