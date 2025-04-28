// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/SimpleTokenSwap.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20, IWETH {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable override {
        _mint(msg.sender, msg.value);
    }
}

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SimpleTokenSwapTest is Test {
    SimpleTokenSwap public swapContract;
    MockWETH public weth;
    MockERC20 public dai;

    address public owner = address(this);
    address public allowanceHolder = address(0x123456);

    function setUp() public {
        weth = new MockWETH();
        dai = new MockERC20("Dai Stablecoin", "DAI");

        swapContract = new SimpleTokenSwap(
            IWETH(address(weth)),
            allowanceHolder
        );
    }

    function testDepositETH() public {
        uint256 depositAmount = 1 ether;
        vm.deal(address(this), depositAmount);
        swapContract.depositETH{value: depositAmount}();
        assertEq(weth.balanceOf(address(swapContract)), depositAmount);
    }

    function testInvalidSwapTarget() public {
        bytes memory data = abi.encodeWithSignature(
            "mockSwap(address,address,uint256,uint256)",
            address(weth),
            address(dai),
            1 ether,
            2 ether
        );

        vm.expectRevert("INVALID_SWAP_TARGET");
        swapContract.fillQuote(
            IERC20(address(weth)),
            IERC20(address(dai)),
            address(weth),
            payable(address(0xbeefcafe)),
            data
        );
    }

    function testValidAllowanceHolderSwap() public {
        uint256 sellAmount = 1 ether;
        uint256 buyAmount = 2 ether;

        weth.deposit{value: sellAmount}();
        weth.transfer(address(swapContract), sellAmount);

        bytes memory data = abi.encodeWithSignature(
            "mockSwap(address,address,uint256,uint256)",
            address(weth),
            address(dai),
            sellAmount,
            buyAmount
        );

        vm.mockCall(allowanceHolder, data, abi.encode(true));
        dai.mint(address(swapContract), buyAmount);

        swapContract.fillQuote(
            IERC20(address(weth)),
            IERC20(address(dai)),
            address(weth),
            payable(allowanceHolder),
            data
        );

        assertEq(dai.balanceOf(address(swapContract)), buyAmount);
    }

    function testFallbackReceiveETH() public {
        uint256 ethAmount = 1 ether;

        vm.deal(address(this), ethAmount);
        (bool success, ) = address(swapContract).call{value: ethAmount}("");
        require(success, "Fallback function failed");

        assertEq(address(swapContract).balance, ethAmount);
    }

    function testWithdrawTokenByNonOwner() public {
        uint256 tokenAmount = 1 ether;
        dai.mint(address(swapContract), tokenAmount);

        vm.prank(address(0xdeadbeef));
        vm.expectRevert("ONLY_OWNER");
        swapContract.withdrawToken(IERC20(address(dai)), tokenAmount);
    }

    function testWithdrawETHByNonOwner() public {
        uint256 ethAmount = 1 ether;
        vm.deal(address(swapContract), ethAmount);

        vm.prank(address(0xdeadbeef));
        vm.expectRevert("ONLY_OWNER");
        swapContract.withdrawETH(ethAmount);
    }

    function testLiquidityUnavailable() public {
        uint256 sellAmount = 1 ether;
        uint256 buyAmount = 2 ether;

        bytes memory data = abi.encodeWithSignature(
            "mockSwap(address,address,uint256,uint256)",
            address(weth),
            address(dai),
            sellAmount,
            buyAmount
        );

        vm.mockCallRevert(allowanceHolder, data, "No liquidity available");

        weth.deposit{value: sellAmount}();
        weth.transfer(address(swapContract), sellAmount);

        vm.expectRevert("SWAP_CALL_FAILED");
        swapContract.fillQuote(
            IERC20(address(weth)),
            IERC20(address(dai)),
            address(weth),
            payable(allowanceHolder),
            data
        );

        assertEq(
            dai.balanceOf(address(swapContract)),
            0,
            "DAI balance should remain 0 after failure"
        );
    }
}
