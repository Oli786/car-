// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ArcRacerLeaderboard} from "../ArcRacerLeaderboard.sol";
import {ArcRacerLeaderboardTestBase} from "./ArcRacerLeaderboard.Base.t.sol";

contract ArcRacerLeaderboardRevertTest is ArcRacerLeaderboardTestBase {
    // ---------- ScoreNotHigher ----------

    function test_RevertScoreNotHigher_Equal() public {
        _sub(alice, 100);
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.ScoreNotHigher.selector, 100, 100));
        _submit(alice, 100, 0, 10);
    }

    function test_RevertScoreNotHigher_Lower() public {
        _sub(alice, 100);
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.ScoreNotHigher.selector, 90, 100));
        _submit(alice, 90, 0, 10);
    }

    function test_RevertScoreNotHigher_EqualScoreDifferentMix() public {
        _sub(alice, 100); // 100 distance
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.ScoreNotHigher.selector, 100, 100));
        _submit(alice, 80, 1, 10); // 80 + 20
    }

    function test_RevertScoreNotHigher_ZeroScoreUnseenPlayer() public {
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.ScoreNotHigher.selector, 0, 0));
        _submit(alice, 0, 0, 10);
    }

    function test_RevertScoreNotHigher_ConsumesNothing() public {
        _sub(alice, 100);
        uint256 allowanceBefore = board.allowanceOf(alice);
        vm.expectRevert();
        _submit(alice, 100, 0, 10);
        assertEq(board.allowanceOf(alice), allowanceBefore);
        assertEq(board.statsOf(alice).runs, 1);
    }

    // ---------- InvalidDuration ----------

    function test_RevertInvalidDuration_9() public {
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.InvalidDuration.selector, uint32(9)));
        _submit(alice, 1, 0, 9);
    }

    function test_RevertInvalidDuration_0() public {
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.InvalidDuration.selector, uint32(0)));
        _submit(alice, 1, 0, 0);
    }

    function test_Duration10Accepted() public {
        _submit(alice, 1, 0, 10);
        assertEq(board.bestScoreOf(alice), 1);
    }

    function test_Duration600Accepted() public {
        _submit(alice, 1, 0, 600);
        assertEq(board.bestScoreOf(alice), 1);
        assertEq(board.allowanceOf(alice), 0);
    }

    function test_RevertInvalidDuration_601() public {
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.InvalidDuration.selector, uint32(601)));
        _submit(alice, 1, 0, 601);
    }

    function test_RevertInvalidDuration_Max() public {
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.InvalidDuration.selector, type(uint32).max));
        _submit(alice, 1, 0, type(uint32).max);
    }

    // ---------- ZeroDistance ----------

    function test_RevertZeroDistance() public {
        vm.expectRevert(ArcRacerLeaderboard.ZeroDistance.selector);
        _submit(alice, 0, 5, 10);
    }

    // ---------- DistanceTooHigh ----------

    function _checkDistanceBound(address p, uint32 duration) internal {
        uint256 max = board.maxDistanceFor(duration);
        // exact bound accepted
        _submit(p, uint32(max), 0, duration);
        assertEq(board.bestScoreOf(p), max);
        // bound + 1 rejected (fresh player so score is higher than any best)
        address q = address(uint160(uint160(p) + 0x777));
        vm.expectRevert(
            abi.encodeWithSelector(ArcRacerLeaderboard.DistanceTooHigh.selector, max + 1, max)
        );
        _submit(q, uint32(max + 1), 0, duration);
        assertEq(board.bestScoreOf(q), 0);
    }

    function test_DistanceBound_Duration10() public {
        _checkDistanceBound(_player(1), 10);
    }

    function test_DistanceBound_Duration148() public {
        _checkDistanceBound(_player(2), 148);
    }

    function test_DistanceBound_Duration149() public {
        _checkDistanceBound(_player(3), 149);
    }

    function test_DistanceBound_Duration600() public {
        _checkDistanceBound(_player(4), 600);
    }

    function test_MaxDistanceFor_KnownValues() public view {
        assertEq(board.maxDistanceFor(10), 375);
        assertEq(board.maxDistanceFor(148), 9422);
        assertEq(board.maxDistanceFor(149), 9514);
        assertEq(board.maxDistanceFor(600), 50712);
    }

    // ---------- TooManyCoins ----------

    function _checkCoinCap(address p, uint32 duration) internal {
        uint256 cap = _maxCoins(duration);
        _submit(p, 1, uint32(cap), duration);
        assertEq(board.bestScoreOf(p), 1 + 20 * cap);
        address q = address(uint160(uint160(p) + 0x777));
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.TooManyCoins.selector, cap + 1, cap));
        _submit(q, 1, uint32(cap + 1), duration);
    }

    function test_CoinCap_Duration10() public {
        assertEq(_maxCoins(10), 40);
        _checkCoinCap(_player(1), 10);
    }

    function test_CoinCap_Duration11_OddDuration() public {
        assertEq(_maxCoins(11), 44); // ceil(38.5)=39, +5
        _checkCoinCap(_player(2), 11);
    }

    function test_CoinCap_Duration148() public {
        _checkCoinCap(_player(3), 148);
    }

    function test_CoinCap_Duration600() public {
        assertEq(_maxCoins(600), 2105);
        _checkCoinCap(_player(4), 600);
    }

    // ---------- InsufficientAllowance ----------

    function test_RevertInsufficientAllowance_Exhausted() public {
        _submit(alice, 1, 0, 600); // uses whole allowance
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.InsufficientAllowance.selector, 10, 0));
        _submit(alice, 2, 0, 10);
    }

    function test_RevertInsufficientAllowance_Partial() public {
        _submit(alice, 1, 0, 595); // 5 left
        vm.expectRevert(abi.encodeWithSelector(ArcRacerLeaderboard.InsufficientAllowance.selector, 10, 5));
        _submit(alice, 2, 0, 10);
    }

    function test_RevertInsufficientAllowance_ConsumesNothing() public {
        _submit(alice, 1, 0, 595);
        vm.expectRevert();
        _submit(alice, 2, 0, 10);
        assertEq(board.allowanceOf(alice), 5);
        assertEq(board.bestScoreOf(alice), 1);
    }

    // ---------- Pause / ownership ----------

    function test_RevertSubmitWhenPaused() public {
        vm.prank(owner);
        board.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        _submit(alice, 10, 0, 10);
    }

    function test_NonOwnerCannotPause() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        board.pause();
    }

    function test_NonOwnerCannotUnpause() public {
        vm.prank(owner);
        board.pause();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        board.unpause();
    }

    function test_RevertUnpauseWhenNotPaused() public {
        vm.prank(owner);
        vm.expectRevert(Pausable.ExpectedPause.selector);
        board.unpause();
    }

    function test_RevertRenounceOwnership_Owner() public {
        vm.prank(owner);
        vm.expectRevert(ArcRacerLeaderboard.RenounceDisabled.selector);
        board.renounceOwnership();
        assertEq(board.owner(), owner);
    }

    function test_RevertRenounceOwnership_NonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        board.renounceOwnership();
    }
}
