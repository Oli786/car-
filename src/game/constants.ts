/**
 * Arc Racer tuning constants.
 * Speed limits are mirrored by the plausibility bound in ArcRacerLeaderboard.sol:
 * top speed at play time t is min(33.6 + 0.36 t, 86.4) m/s, the contract allows min(34 + 0.36 t, 87).
 */
export const W = 420
export const H = 760

export const LANES = 4
export const LANE_W = 80
export const ROAD_W = LANES * LANE_W
export const ROAD_X = (W - ROAD_W) / 2

export const PX_PER_M = 10

export const CAR_W = 48
export const CAR_H = 92
export const PLAYER_Y = H * 0.76

export const BASE_START = 28
export const BASE_ACCEL = 0.3
export const BASE_MAX = 72
export const BOOST_MULT = 1.2
export const BRAKE_MULT = 0.62

export const MAX_SHIELDS = 3
export const SCORE_PER_COIN = 20
export const INVULN_SECONDS = 1.6

export const STEER_ACCEL = 2600
export const STEER_MAX = 330
export const STEER_DRAG = 9

export const HIGH_SCORE_KEY = 'arc-racer:high-score'
export const SOUND_KEY = 'arc-racer:sound'

export const NEON = {
  cyan: '#22e6ff',
  pink: '#ff2e93',
  yellow: '#ffd23f',
  green: '#3dffa2',
  violet: '#8b5cff',
} as const

export const TRAFFIC_COLORS = ['#ff2e93', '#8b5cff', '#ff7a2e', '#3dffa2', '#e8ecff']

export const laneCenter = (lane: number) => ROAD_X + lane * LANE_W + LANE_W / 2
