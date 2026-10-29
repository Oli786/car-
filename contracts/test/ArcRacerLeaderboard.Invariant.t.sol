// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ArcRacerLeaderboard} from "../ArcRacerLeaderboard.sol";
import {ArcRacerLeaderboardTestBase} from "./ArcRacerLeaderboard.Base.t.sol";

/// @dev Drives bounded submissions from a pool of 40 players (more than the 25 board slots).
contract LeaderboardHandler is Test {
    ArcRacerLeaderboard public board;
    uint256 public constant POOL = 40;
    uint256 public accepted;
    mapping(address => uint256) public ghostBest;

    constructor(ArcRacerLeaderboard _board) {
        board = _board;
    }

    function player(uint256 i) public pure returns (address) {
        return address(uint160(0x1000 + i));
    }

    function submit(uint256 idx, uint32 distance, uint32 coins, uint32 duration) external {
        address p = player(idx % POOL);
        duration = uint32(bound(duration, 10, 40));
        distance = uint32(bound(distance, 1, board.maxDistanceFor(duration)));
        coins = uint32(bound(coins, 0, (7 * uint256(duration) + 1) / 2 + 5));
        vm.prank(p);
        try board.submitScore(distance, coins, duration) {
            accepted++;
            ghostBest[p] = uint256(distance) + 20 * uint256(coins);
        } catch {}
    }

    function passTime(uint256 secs) external {
        skip(bound(secs, 0, 200));
    }
}

contract ArcRacerLeaderboardInvariantTest is ArcRacerLeaderboardTestBase {
    LeaderboardHandler internal handler;

    function setUp() public override {
        super.setUp();
        handler = new LeaderboardHandler(board);
        targetContract(address(handler));
    }

    /// PROPERTY: board is sorted descending, unique players, length <= 25,
    /// and each entry matches the player's stored best.
    function invariant_BoardSortedUniqueBounded() public view {
        _assertBoardValid();
    }

    /// PROPERTY: stored personal bests match accepted runs, and when the board is full
    /// no off-board player has a best above the last-ranked score.
    function invariant_BestsConsistentAndOffBoardNotAboveLast() public view {
        uint256 len = board.topLength();
        uint256 lastScore = len == 0 ? 0 : board.getTopScores()[len - 1].score;
        for (uint256 i = 0; i < handler.POOL(); ++i) {
            address p = handler.player(i);
            assertEq(board.bestScoreOf(p), handler.ghostBest(p), "best != ghost");
            if (len == 25 && board.rankOf(p) == 0) {
                assertLe(board.bestScoreOf(p), lastScore, "off-board above last");
            }
            assertLe(board.allowanceOf(p), 600);
        }
    }
}
