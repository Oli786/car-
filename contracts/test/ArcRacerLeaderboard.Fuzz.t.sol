// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ArcRacerLeaderboard} from "../ArcRacerLeaderboard.sol";
import {ArcRacerLeaderboardTestBase} from "./ArcRacerLeaderboard.Base.t.sol";

contract ArcRacerLeaderboardFuzzTest is ArcRacerLeaderboardTestBase {
    /// PROPERTY: a distance above maxDistanceFor is never accepted; at or below it always is.
    function testFuzz_NeverAcceptsDistanceAboveMax(uint32 distance, uint32 duration) public {
        duration = uint32(bound(duration, 10, 600));
        uint256 max = board.maxDistanceFor(duration);
        // Concentrate runs around the boundary but still cover the full uint32 range.
        distance = uint32(bound(distance, 1, max + 2000));

        if (distance > max) {
            vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.DistanceTooHigh.selector, distance, max));
            _submit(alice, distance, 0, duration);
            assertEq(board.bestScoreOf(alice), 0);
            assertEq(board.rankOf(alice), 0);
        } else {
            _submit(alice, distance, 0, duration);
            assertEq(board.bestScoreOf(alice), distance);
        }
    }

    function testFuzz_NeverAcceptsDistanceAboveMax_FullRange(uint32 distance, uint32 duration) public {
        duration = uint32(bound(duration, 10, 600));
        vm.assume(distance > board.maxDistanceFor(duration));
        vm.expectRevert();
        _submit(alice, distance, 0, duration);
        assertEq(board.bestScoreOf(alice), 0);
    }

    /// PROPERTY: score = distance + 20 * coins, computed on-chain.
    function testFuzz_ScoreComputedOnChain(uint32 distance, uint32 coins, uint32 duration) public {
        duration = uint32(bound(duration, 10, 600));
        distance = uint32(bound(distance, 1, board.maxDistanceFor(duration)));
        coins = uint32(bound(coins, 0, _maxCoins(duration)));

        _submit(alice, distance, coins, duration);

        uint256 expected = uint256(distance) + 20 * uint256(coins);
        assertEq(board.bestScoreOf(alice), expected);
        assertEq(board.rankOf(alice), 1);
        assertEq(board.getTopScores()[0].score, expected);
    }

    /// PROPERTY: coins above the duration cap are never accepted.
    function testFuzz_NeverAcceptsCoinsAboveCap(uint32 coins, uint32 duration) public {
        duration = uint32(bound(duration, 10, 600));
        uint256 cap = _maxCoins(duration);
        coins = uint32(bound(coins, uint32(cap + 1), type(uint32).max));
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.TooManyCoins.selector, coins, cap));
        _submit(alice, 1, coins, duration);
    }

    /// PROPERTY: durations outside [10, 600] are always rejected.
    function testFuzz_InvalidDurationRejected(uint32 duration) public {
        vm.assume(duration < 10 || duration > 600);
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.InvalidDuration.selector, duration));
        _submit(alice, 1, 0, duration);
    }

    /// PROPERTY: the distance ceiling never decreases as duration grows.
    function testFuzz_MaxDistanceMonotonic(uint32 a, uint32 b) public view {
        a = uint32(bound(a, 0, 5000));
        b = uint32(bound(b, a, 5000));
        assertLe(board.maxDistanceFor(a), board.maxDistanceFor(b));
    }

    /// PROPERTY: allowance never exceeds 600 and is exactly min(600, remaining + elapsed).
    function testFuzz_AllowanceRefill(uint32 duration, uint32 elapsed) public {
        duration = uint32(bound(duration, 10, 600));
        elapsed = uint32(bound(elapsed, 0, 2000));
        _submit(alice, 1, 0, duration);
        skip(elapsed);
        uint256 expected = 600 - duration + elapsed;
        if (expected > 600) expected = 600;
        assertEq(board.allowanceOf(alice), expected);
        assertLe(board.allowanceOf(alice), 600);
    }

    /// PROPERTY: a non-improving score never changes the stored best.
    function testFuzz_NonImprovingScoreRejected(uint32 first, uint32 second) public {
        first = uint32(bound(first, 1, 375));
        second = uint32(bound(second, 1, first));
        _sub(alice, first);
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.ScoreNotHigher.selector, second, first));
        _submit(alice, second, 0, 10);
        assertEq(board.bestScoreOf(alice), first);
    }
}
