// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ArcRacerLeaderboard} from "../ArcRacerLeaderboard.sol";
import {ArcRacerLeaderboardTestBase} from "./ArcRacerLeaderboard.Base.t.sol";

contract ArcRacerLeaderboardBoardTest is ArcRacerLeaderboardTestBase {
    function _fillBoard() internal {
        // players 0..24 with scores 10,20,...,250
        for (uint256 i = 0; i < 25; ++i) _sub(_player(i), uint32(10 * (i + 1)));
    }

    function test_Board_SortedDescending() public {
        _sub(alice, 100);
        _sub(bob, 300);
        _sub(carol, 200);
        ArcRacerLeaderboard.Entry[] memory top = board.getTopScores();
        assertEq(top.length, 3);
        assertEq(top[0].player, bob);
        assertEq(top[0].score, 300);
        assertEq(top[1].player, carol);
        assertEq(top[1].score, 200);
        assertEq(top[2].player, alice);
        assertEq(top[2].score, 100);
        _assertBoardValid();
    }

    function test_Board_RankOf() public {
        _sub(alice, 100);
        _sub(bob, 300);
        _sub(carol, 200);
        assertEq(board.rankOf(bob), 1);
        assertEq(board.rankOf(carol), 2);
        assertEq(board.rankOf(alice), 3);
        assertEq(board.rankOf(makeAddr("stranger")), 0);
    }

    function test_Board_OneEntryPerPlayer() public {
        _sub(alice, 100);
        _sub(alice, 120);
        _sub(alice, 140);
        assertEq(board.topLength(), 1);
        assertEq(board.getTopScores()[0].score, 140);
        _assertBoardValid();
    }

    function test_Board_ExistingPlayerMovesUp() public {
        _sub(alice, 100);
        _sub(bob, 200);
        _sub(carol, 300);
        assertEq(board.rankOf(alice), 3);
        _sub(alice, 250);
        assertEq(board.rankOf(alice), 2);
        assertEq(board.rankOf(bob), 3);
        _sub(alice, 350);
        assertEq(board.rankOf(alice), 1);
        assertEq(board.rankOf(carol), 2);
        assertEq(board.rankOf(bob), 3);
        assertEq(board.topLength(), 3);
        _assertBoardValid();
    }

    function test_Board_ExistingPlayerImprovesWithoutChangingRank() public {
        _sub(alice, 300);
        _sub(bob, 100);
        _sub(bob, 150);
        assertEq(board.rankOf(bob), 2);
        assertEq(board.getTopScores()[1].score, 150);
    }

    function test_Board_FullBoardHolds25() public {
        _fillBoard();
        assertEq(board.topLength(), 25);
        assertEq(board.rankOf(_player(24)), 1);
        assertEq(board.rankOf(_player(0)), 25);
        _assertBoardValid();
    }

    function test_Board_FullBoardEvictsLast() public {
        _fillBoard();
        _sub(alice, 15); // beats the last (10), loses to 20
        assertEq(board.topLength(), 25);
        assertEq(board.rankOf(alice), 25);
        assertEq(board.rankOf(_player(0)), 0, "evicted");
        assertEq(board.rankOf(_player(1)), 24);
        _assertBoardValid();
    }

    function test_Board_FullBoardNewTopEvictsLast() public {
        _fillBoard();
        _sub(alice, 375);
        assertEq(board.rankOf(alice), 1);
        assertEq(board.rankOf(_player(0)), 0);
        assertEq(board.rankOf(_player(24)), 2);
        assertEq(board.rankOf(_player(1)), 25);
        assertEq(board.topLength(), 25);
        _assertBoardValid();
    }

    function test_Board_EvictedPlayerKeepsBestAndCanReenter() public {
        _fillBoard();
        _sub(alice, 15);
        address evicted = _player(0);
        assertEq(board.rankOf(evicted), 0);
        assertEq(board.bestScoreOf(evicted), 10);
        assertEq(board.statsOf(evicted).runs, 1);
        // evicted player improves and re-enters
        _sub(evicted, 300);
        assertEq(board.rankOf(evicted), 1);
        assertEq(board.topLength(), 25);
        assertEq(board.rankOf(alice), 0, "alice (15) was last, now evicted");
        assertEq(board.rankOf(_player(1)), 25);
        _assertBoardValid();
    }

    function test_Board_TiesKeepEarlierSubmitterAhead() public {
        _sub(alice, 100);
        _sub(bob, 100);
        _sub(carol, 100);
        assertEq(board.rankOf(alice), 1);
        assertEq(board.rankOf(bob), 2);
        assertEq(board.rankOf(carol), 3);
    }

    function test_Board_ImprovingPlayerTyingKeepsEarlierAhead() public {
        _sub(alice, 100);
        _sub(bob, 50);
        _sub(carol, 100);
        assertEq(board.rankOf(carol), 2);
        assertEq(board.rankOf(bob), 3);
        _sub(bob, 100); // ties with alice and carol, must stay behind them
        assertEq(board.rankOf(alice), 1);
        assertEq(board.rankOf(carol), 2);
        assertEq(board.rankOf(bob), 3);
        _assertBoardValid();
    }

    function test_Board_TieWithLastOnFullBoardStaysOff() public {
        _fillBoard();
        _sub(alice, 10); // equals last (10) -> not admitted
        assertEq(board.rankOf(alice), 0);
        assertEq(board.rankOf(_player(0)), 25);
        assertEq(board.bestScoreOf(alice), 10);
        _assertBoardValid();
    }

    function test_Board_LowerThanLastStaysOffButBestStored() public {
        _fillBoard();
        _sub(alice, 5);
        assertEq(board.rankOf(alice), 0);
        assertEq(board.bestScoreOf(alice), 5);
        assertEq(board.statsOf(alice).runs, 1);
        assertEq(board.topLength(), 25);
        assertEq(board.rankOf(_player(0)), 25);
        _assertBoardValid();
    }

    function test_Board_OffBoardPlayerImprovesIntoBoard() public {
        _fillBoard();
        _sub(alice, 5);
        _sub(alice, 135);
        // 135 sits between 130 (player12) and 140 (player13)
        assertEq(board.rankOf(alice), 25 - 12); // 13th from bottom among 25 -> rank 13
        assertEq(board.rankOf(_player(0)), 0);
        assertEq(board.topLength(), 25);
        _assertBoardValid();
    }

    function test_Board_OffBoardPlayerStaysOffWhenImprovementStillLow() public {
        _fillBoard();
        _sub(alice, 5);
        _sub(alice, 8);
        assertEq(board.rankOf(alice), 0);
        assertEq(board.bestScoreOf(alice), 8);
        assertEq(board.statsOf(alice).runs, 2);
    }

    function test_Board_ComputedScoreDrivesRanking() public {
        _submit(alice, 100, 0, 10); // 100
        _submit(bob, 10, 10, 10); // 10 + 200 = 210
        _submit(carol, 150, 1, 10); // 170
        assertEq(board.rankOf(bob), 1);
        assertEq(board.rankOf(carol), 2);
        assertEq(board.rankOf(alice), 3);
    }
}
