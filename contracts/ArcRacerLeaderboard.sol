// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title Arc Racer Leaderboard
/// @notice Personal bests and a bounded leaderboard for Arc Racer on Arc Testnet.
/// @dev Best-effort plausibility checks only: a determined cheater can fabricate a
/// plausible run, and sybil accounts are not prevented. No payments, tokens, or
/// payable entry points exist. Forced native-currency transfers cannot be prevented.
/// Compatible with the project's Solidity 0.8.28 compiler and Cancun EVM target.
contract ArcRacerLeaderboard is Pausable, Ownable {
    /// @notice Score awarded for each collected coin.
    uint256 public constant SCORE_PER_COIN = 20;
    /// @notice Minimum accepted active-play duration in seconds.
    uint256 public constant MIN_DURATION = 10;
    /// @notice Maximum accepted active-play duration in seconds.
    uint256 public constant MAX_DURATION = 600;
    /// @notice Initial play-time allowance for an unseen player, in seconds.
    uint256 public constant INITIAL_ALLOWANCE = 600;
    /// @notice Maximum accumulated play-time allowance, in seconds.
    uint256 public constant MAX_ALLOWANCE = 600;
    /// @notice Play seconds replenished per elapsed chain-clock second.
    uint256 public constant ALLOWANCE_REFILL_RATE = 1;
    /// @notice Maximum number of leaderboard entries.
    uint256 public constant TOP_SIZE = 25;
    /// @notice Coin collection limit per two active-play seconds (3.5 coins per second).
    uint256 public constant MAX_COINS_PER_TWO_SECONDS = 7;
    /// @notice Additional coins allowed beyond the per-second limit.
    uint256 public constant COIN_TOLERANCE = 5;
    /// @notice Initial top speed in metres per second.
    uint256 public constant INITIAL_SPEED = 34;
    /// @notice Capped top speed in metres per second.
    uint256 public constant MAX_SPEED = 87;
    /// @notice Whole-second boundary for the specified piecewise distance model.
    uint256 public constant SPEED_CAP_TIME = 148;
    /// @notice Numerator of the integrated acceleration coefficient (0.18).
    uint256 public constant ACCELERATION_DISTANCE_NUMERATOR = 9;
    /// @notice Denominator of the integrated acceleration coefficient (0.18).
    uint256 public constant ACCELERATION_DISTANCE_DENOMINATOR = 50;
    /// @notice Percentage tolerance added to the modelled distance.
    uint256 public constant DISTANCE_TOLERANCE_PERCENT = 5;
    /// @notice Denominator used for percentage calculations.
    uint256 public constant PERCENT_DENOMINATOR = 100;

    /// @notice One ranked personal best; both fields fit in a single storage slot.
    struct Entry {
        /// @notice Address that submitted the run.
        address player;
        /// @notice Contract-computed personal best score.
        uint64 score;
    }

    /// @notice Publicly returned statistics for a player's best run.
    struct Stats {
        /// @notice Highest accepted computed score.
        uint64 bestScore;
        /// @notice Metres driven in the best run.
        uint32 bestDistance;
        /// @notice Coins collected in the best run.
        uint32 bestCoins;
        /// @notice Active-play seconds in the best run.
        uint32 bestDuration;
        /// @notice Number of accepted, strictly improving runs.
        uint64 runs;
    }

    /// @dev Run data and remaining allowance pack into one slot; timestamp uses another.
    struct Player {
        /// @dev Highest accepted computed score.
        uint64 bestScore;
        /// @dev Distance corresponding to bestScore.
        uint32 bestDistance;
        /// @dev Coins corresponding to bestScore.
        uint32 bestCoins;
        /// @dev Duration corresponding to bestScore.
        uint32 bestDuration;
        /// @dev Accepted run count; zero identifies an unseen player.
        uint64 runs;
        /// @dev Remaining play seconds immediately after the last accepted run.
        uint16 allowance;
        /// @dev Chain timestamp of the last accepted run, in seconds.
        uint256 lastSubmissionTimestamp;
    }

    /// @dev Player records, including off-board personal bests.
    mapping(address => Player) private _players;
    /// @dev Descending scores, with earlier attainment ahead on ties.
    Entry[] private _top;

    /// @notice The submitted score did not strictly improve the personal best.
    /// @param score Newly computed score.
    /// @param currentBest Previously accepted personal best.
    error ScoreNotHigher(uint256 score, uint256 currentBest);
    /// @notice Duration lies outside the accepted inclusive range.
    /// @param duration Submitted active-play seconds.
    error InvalidDuration(uint32 duration);
    /// @notice A run must travel a positive distance.
    error ZeroDistance();

    /// @notice Reverts because ownership renunciation is disabled.
    error RenounceDisabled();
    /// @notice Distance exceeds the tolerated physics bound.
    /// @param distance Submitted metres driven.
    /// @param maxAllowed Maximum tolerated distance for the submitted duration.
    error DistanceTooHigh(uint256 distance, uint256 maxAllowed);
    /// @notice Coin count exceeds the duration-based limit.
    /// @param coins Submitted coin count.
    /// @param maxAllowed Maximum allowed coin count.
    error TooManyCoins(uint256 coins, uint256 maxAllowed);
    /// @notice The player has insufficient refilled play-time allowance.
    /// @param duration Submitted active-play seconds.
    /// @param allowance Available play-time seconds.
    error InsufficientAllowance(uint256 duration, uint256 allowance);

    /// @notice Emitted for every accepted personal improvement, including off-board runs.
    /// @param player Run submitter.
    /// @param score Contract-computed score.
    /// @param distance Metres driven.
    /// @param coins Coins collected.
    /// @param duration Active-play seconds.
    /// @param rank One-based board position, or zero if off-board.
    event ScoreSubmitted(
        address indexed player,
        uint256 score,
        uint32 distance,
        uint32 coins,
        uint32 duration,
        uint256 rank
    );

    /// @notice Initializes the owner without accepting native currency.
    /// @param initialOwner Address authorized to pause and unpause submissions.
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Pauses submissions; views and allowance refill remain available.
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Resumes submissions.
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Ownership renunciation is disabled so a paused board can always be resumed.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    /// @notice Submits a strictly improving run subject to plausibility and allowance checks.
    /// @dev No state, allowance, or timestamp is consumed on any revert.
    /// @param distance Metres driven; must be positive.
    /// @param coins Coins collected.
    /// @param duration Whole active-play seconds, rounded up by the client.
    function submitScore(uint32 distance, uint32 coins, uint32 duration) external whenNotPaused {
        address player = _msgSender();
        Player storage record = _players[player];
        uint256 score = uint256(distance) + uint256(coins) * SCORE_PER_COIN;
        if (score <= record.bestScore) revert ScoreNotHigher(score, record.bestScore);
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert InvalidDuration(duration);
        if (distance == 0) revert ZeroDistance();

        uint256 maxDistance = maxDistanceFor(duration);
        if (distance > maxDistance) revert DistanceTooHigh(distance, maxDistance);
        uint256 maxCoins = (MAX_COINS_PER_TWO_SECONDS * uint256(duration) + 1) / 2 + COIN_TOLERANCE;
        if (coins > maxCoins) revert TooManyCoins(coins, maxCoins);
        uint256 available = allowanceOf(player);
        if (duration > available) revert InsufficientAllowance(duration, available);

        // Even unrestricted uint32 inputs yield a score below 2**37, so uint64 is safe.
        record.bestScore = uint64(score);
        record.bestDistance = distance;
        record.bestCoins = coins;
        record.bestDuration = duration;
        // Strict improvement and the bounded score space also bound accepted run count.
        record.runs += 1;
        record.allowance = uint16(available - duration);
        record.lastSubmissionTimestamp = block.timestamp;

        uint256 rank = _updateTop(player, uint64(score));
        emit ScoreSubmitted(player, score, distance, coins, duration, rank);
    }

    /// @notice Computes the specified distance ceiling including five-percent tolerance.
    /// @dev Integer division floors each model term and then the tolerated result.
    /// This helper accepts every uint32 duration; submissions separately enforce duration limits.
    /// @param duration Active-play duration in seconds.
    /// @return Maximum tolerated distance in whole metres.
    function maxDistanceFor(uint32 duration) public pure returns (uint256) {
        uint256 t = uint256(duration);
        uint256 acceleratingTime = t <= SPEED_CAP_TIME ? t : SPEED_CAP_TIME;
        uint256 modelDistance = INITIAL_SPEED * acceleratingTime
            + (ACCELERATION_DISTANCE_NUMERATOR * acceleratingTime * acceleratingTime)
                / ACCELERATION_DISTANCE_DENOMINATOR;
        if (t > SPEED_CAP_TIME) modelDistance += MAX_SPEED * (t - SPEED_CAP_TIME);
        return (modelDistance * (PERCENT_DENOMINATOR + DISTANCE_TOLERANCE_PERCENT))
            / PERCENT_DENOMINATOR;
    }

    /// @notice Returns the currently available play-time seconds without changing state.
    /// @param player Player whose allowance is requested.
    /// @return Available seconds, initially 600 and capped at 600 after first acceptance.
    function allowanceOf(address player) public view returns (uint256) {
        Player storage record = _players[player];
        if (record.runs == 0) return INITIAL_ALLOWANCE;
        uint256 elapsed = block.timestamp - record.lastSubmissionTimestamp;
        uint256 capacity = MAX_ALLOWANCE - record.allowance;
        if (elapsed >= capacity / ALLOWANCE_REFILL_RATE) return MAX_ALLOWANCE;
        return uint256(record.allowance) + elapsed * ALLOWANCE_REFILL_RATE;
    }

    /// @notice Returns the current board in descending order without padded entries.
    /// @return entries Current ranked players and their best scores.
    function getTopScores() external view returns (Entry[] memory entries) {
        return _top;
    }

    /// @notice Returns a personal best whether or not the player is on the board.
    /// @param player Player to query.
    /// @return Best accepted score, or zero for an unseen player.
    function bestScoreOf(address player) external view returns (uint256) {
        return _players[player].bestScore;
    }

    /// @notice Returns the best run's data and accepted run count.
    /// @param player Player to query.
    /// @return stats Best-run statistics; all fields are zero for unseen players.
    function statsOf(address player) external view returns (Stats memory stats) {
        Player storage record = _players[player];
        return Stats(record.bestScore, record.bestDistance, record.bestCoins, record.bestDuration, record.runs);
    }

    /// @notice Returns the number of entries currently on the board.
    /// @return Number of ranked players, at most TOP_SIZE.
    function topLength() external view returns (uint256) {
        return _top.length;
    }

    /// @notice Returns a player's one-based rank or zero when off-board.
    /// @param player Player to query.
    /// @return One-based board position, or zero.
    function rankOf(address player) public view returns (uint256) {
        for (uint256 i = 0; i < _top.length; ++i) {
            if (_top[i].player == player) return i + 1;
        }
        return 0;
    }

    /// @dev Inserts or improves one entry and bubbles it upward using strictly greater scores.
    /// Equal scores never displace an earlier attainment of that score. At most 25 entries are visited.
    /// @param player Player with a newly stored personal best.
    /// @param score Newly computed score, safely representable as uint64.
    /// @return rank One-based resulting position, or zero when the run does not enter the board.
    function _updateTop(address player, uint64 score) private returns (uint256 rank) {
        uint256 previousRank = rankOf(player);
        uint256 index;
        if (previousRank != 0) {
            index = previousRank - 1;
            _top[index].score = score;
        } else if (_top.length < TOP_SIZE) {
            index = _top.length;
            _top.push(Entry(player, score));
        } else {
            index = _top.length - 1;
            if (score <= _top[index].score) return 0;
            _top[index] = Entry(player, score);
        }

        Entry memory improved = _top[index];
        while (index > 0 && improved.score > _top[index - 1].score) {
            _top[index] = _top[index - 1];
            --index;
        }
        _top[index] = improved;
        return index + 1;
    }
}
