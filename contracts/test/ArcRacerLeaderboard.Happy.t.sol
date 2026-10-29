// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ArcRacerLeaderboard} from "../ArcRacerLeaderboard.sol";
import {ArcRacerLeaderboardTestBase} from "./ArcRacerLeaderboard.Base.t.sol";

contract ArcRacerLeaderboardHappyTest is ArcRacerLeaderboardTestBase {
    // ---------- Deployment ----------

    function test_Deploy_InitialState() public view {
        assertEq(board.owner(), owner);
        assertFalse(board.paused());
        assertEq(board.topLength(), 0);
        assertEq(board.getTopScores().length, 0);
        assertEq(board.bestScoreOf(alice), 0);
        assertEq(board.rankOf(alice), 0);
    }

    // ---------- submitScore happy path ----------

    function test_Submit_StoresBestAndStats() public {
        _submit(alice, 200, 3, 20);
        assertEq(board.bestScoreOf(alice), 260); // 200 + 3*20 computed on-chain
        ArcRacerLeaderboard.Stats memory s = board.statsOf(alice);
        assertEq(s.bestScore, 260);
        assertEq(s.bestDistance, 200);
        assertEq(s.bestCoins, 3);
        assertEq(s.bestDuration, 20);
        assertEq(s.runs, 1);
        assertEq(board.rankOf(alice), 1);
        assertEq(board.topLength(), 1);
    }

    function test_Submit_ScoreIsDistancePlus20TimesCoins() public {
        _submit(alice, 123, 7, 30);
        assertEq(board.bestScoreOf(alice), 123 + 20 * 7);
        // coins-only-ish: distance 1, many coins
        _submit(bob, 1, 40, 10);
        assertEq(board.bestScoreOf(bob), 801);
    }

    function test_Submit_ImprovementUpdatesStatsAndRuns() public {
        _submit(alice, 100, 0, 10);
        _submit(alice, 150, 2, 12);
        ArcRacerLeaderboard.Stats memory s = board.statsOf(alice);
        assertEq(s.bestScore, 190);
        assertEq(s.bestDistance, 150);
        assertEq(s.bestCoins, 2);
        assertEq(s.bestDuration, 12);
        assertEq(s.runs, 2);
    }

    function test_Submit_UnseenPlayerStatsAllZero() public view {
        ArcRacerLeaderboard.Stats memory s = board.statsOf(alice);
        assertEq(s.bestScore, 0);
        assertEq(s.bestDistance, 0);
        assertEq(s.bestCoins, 0);
        assertEq(s.bestDuration, 0);
        assertEq(s.runs, 0);
    }

    function test_Submit_WorksAfterUnpause() public {
        vm.prank(owner);
        board.pause();
        assertTrue(board.paused());
        vm.prank(owner);
        board.unpause();
        assertFalse(board.paused());
        _sub(alice, 50);
        assertEq(board.bestScoreOf(alice), 50);
    }

    function test_ViewsAvailableWhilePaused() public {
        _sub(alice, 50);
        vm.prank(owner);
        board.pause();
        assertEq(board.bestScoreOf(alice), 50);
        assertEq(board.allowanceOf(alice), 590);
        assertEq(board.rankOf(alice), 1);
    }

    // ---------- Event ----------

    function test_EmitsScoreSubmitted_OnBoard() public {
        vm.expectEmit(true, false, false, true, address(board));
        emit ArcRacerLeaderboard.ScoreSubmitted(alice, 260, 200, 3, 20, 1);
        _submit(alice, 200, 3, 20);
    }

    function test_EmitsScoreSubmitted_RankReflectsPosition() public {
        _sub(alice, 100);
        vm.expectEmit(true, false, false, true, address(board));
        emit ArcRacerLeaderboard.ScoreSubmitted(bob, 300, 300, 0, 10, 1);
        _submit(bob, 300, 0, 10);

        vm.expectEmit(true, false, false, true, address(board));
        emit ArcRacerLeaderboard.ScoreSubmitted(carol, 50, 50, 0, 10, 3);
        _submit(carol, 50, 0, 10);
    }

    function test_EmitsScoreSubmitted_RankZeroWhenOffBoard() public {
        for (uint256 i = 0; i < 25; ++i) _sub(_player(i), uint32(100 + i));
        vm.expectEmit(true, false, false, true, address(board));
        emit ArcRacerLeaderboard.ScoreSubmitted(alice, 50, 50, 0, 10, 0);
        _submit(alice, 50, 0, 10);
    }

    // ---------- Allowance ----------

    function test_Allowance_UnseenIs600() public view {
        assertEq(board.allowanceOf(alice), 600);
    }

    function test_Allowance_DecreasesByDuration() public {
        _submit(alice, 100, 0, 120);
        assertEq(board.allowanceOf(alice), 480);
    }

    function test_Allowance_PartialRefillAfterWarp() public {
        _submit(alice, 100, 0, 300); // 300 left
        skip(100);
        assertEq(board.allowanceOf(alice), 400);
        skip(50);
        assertEq(board.allowanceOf(alice), 450);
    }

    function test_Allowance_CappedAt600() public {
        _submit(alice, 100, 0, 300);
        skip(300);
        assertEq(board.allowanceOf(alice), 600);
        skip(100_000);
        assertEq(board.allowanceOf(alice), 600);
    }

    function test_Allowance_FullyRefillsFromZero() public {
        _submit(alice, 100, 0, 600);
        assertEq(board.allowanceOf(alice), 0);
        skip(599);
        assertEq(board.allowanceOf(alice), 599);
        skip(1);
        assertEq(board.allowanceOf(alice), 600);
    }

    function test_Allowance_RefillEnablesNextSubmit() public {
        _submit(alice, 100, 0, 600);
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.InsufficientAllowance.selector, 10, 0));
        _submit(alice, 101, 0, 10);
        skip(10);
        _submit(alice, 101, 0, 10);
        assertEq(board.bestScoreOf(alice), 101);
        assertEq(board.allowanceOf(alice), 0);
    }

    function test_Allowance_PerPlayerIndependent() public {
        _submit(alice, 100, 0, 600);
        assertEq(board.allowanceOf(bob), 600);
    }

    function test_Allowance_RefillAccumulatesFromPartialSubmissions() public {
        _submit(alice, 100, 0, 200); // 400
        skip(100); // 500 available
        _submit(alice, 101, 0, 100); // 400, timestamp reset
        assertEq(board.allowanceOf(alice), 400);
        skip(50);
        assertEq(board.allowanceOf(alice), 450);
    }
}
