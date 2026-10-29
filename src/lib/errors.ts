import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

export interface ParsedError {
  message: string
  /** True when the user simply dismissed the wallet prompt. */
  rejected: boolean
}

const hasCode = (e: unknown, code: number) => typeof e === 'object' && e !== null && (e as { code?: unknown }).code === code

export function parseTxError(error: unknown): ParsedError {
  if (error instanceof BaseError) {
    const rejected = error.walk((e) => e instanceof UserRejectedRequestError || hasCode(e, 4001))
    if (rejected) return { message: 'You cancelled the request in your wallet.', rejected: true }

    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      switch (revert.data?.errorName) {
        case 'ScoreNotHigher':
          return { message: "This run doesn't beat your best score already onchain.", rejected: false }
        case 'InvalidDuration':
          return { message: 'Only races lasting 10 to 600 seconds can be submitted.', rejected: false }
        case 'ZeroDistance':
          return { message: 'This run has no distance to record.', rejected: false }
        case 'DistanceTooHigh':
        case 'TooManyCoins':
          return { message: 'The contract rejected this run as implausible for its duration.', rejected: false }
        case 'InsufficientAllowance':
          return { message: 'Your play-time allowance is used up. Race a bit more, then submit again.', rejected: false }
        case 'EnforcedPause':
          return { message: 'The leaderboard is paused by its owner right now.', rejected: false }
        default:
          return { message: `Contract reverted (${revert.data?.errorName ?? 'unknown reason'}).`, rejected: false }
      }
    }
  }
  const text = (error instanceof Error ? error.message : String(error)).toLowerCase()
  if (hasCode(error, 4001) || text.includes('user rejected') || text.includes('user denied')) {
    return { message: 'You cancelled the request in your wallet.', rejected: true }
  }
  if (text.includes('insufficient funds') || text.includes('exceeds the balance')) {
    return { message: 'Not enough testnet USDC for gas. Use "Get test USDC" in the sidebar, then retry.', rejected: false }
  }
  if (text.includes('network') || text.includes('timeout') || text.includes('fetch')) {
    return { message: 'Network issue talking to Arc Testnet. Check your connection and retry.', rejected: false }
  }
  return { message: 'Something went wrong. Please try again.', rejected: false }
}
