// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ArcRacerLeaderboard} from "../ArcRacerLeaderboard.sol";

abstract contract ArcRacerLeaderboardTestBase is Test {
    ArcRacerLeaderboard internal board;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    function setUp() public virtual {
        board = new ArcRacerLeaderboard(owner);
    }

    /// @dev Independent re-statement of the spec: ceil(3.5 * d) + 5.
    function _maxCoins(uint32 d) internal pure returns (uint256) {
        return (7 * uint256(d) + 1) / 2 + 5;
    }

    function _submit(address p, uint32 distance, uint32 coins, uint32 duration) internal {
        vm.prank(p);
        board.submitScore(distance, coins, duration);
    }

    /// @dev Submit a run worth exactly `score` (distance only, 10s). Valid for score in 1..375.
    function _sub(address p, uint32 score) internal {
        _submit(p, score, 0, 10);
    }

    function _player(uint256 i) internal pure returns (address) {
        return address(uint160(0x1000 + i));
    }

    /// @dev Board is sorted descending, has unique players, length <= 25, and every
    ///      entry's score equals that player's stored personal best.
    function _assertBoardValid() internal view {
        ArcRacerLeaderboard.Entry[] memory top = board.getTopScores();
        assertLe(top.length, 25, "board too long");
        assertEq(top.length, board.topLength(), "length mismatch");
        for (uint256 i = 0; i < top.length; ++i) {
            assertEq(board.rankOf(top[i].player), i + 1, "rank mismatch / duplicate");
            assertEq(uint256(top[i].score), board.bestScoreOf(top[i].player), "entry != best");
            if (i > 0) {
                assertGe(top[i - 1].score, top[i].score, "not sorted");
                assertNotEq(top[i - 1].player, top[i].player, "adjacent duplicate");
            }
            for (uint256 j = i + 1; j < top.length; ++j) {
                assertNotEq(top[i].player, top[j].player, "duplicate player");
            }
        }
    }
}
