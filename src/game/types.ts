export type GameStatus = 'idle' | 'running' | 'paused' | 'over'

export interface Hud {
  score: number
  distance: number
  coins: number
  speedKmh: number
  shields: number
  level: number
}

export interface RunResult {
  score: number
  distance: number
  coins: number
  /** Whole seconds of active play, rounded up. */
  duration: number
  isNewHigh: boolean
}

export interface InputState {
  left: boolean
  right: boolean
  boost: boolean
  brake: boolean
}

export interface EngineCallbacks {
  onHud: (hud: Hud) => void
  onStatus: (status: GameStatus) => void
  onGameOver: (result: RunResult) => void
}
