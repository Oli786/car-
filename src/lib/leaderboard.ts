import { isAddress } from 'viem'
import { arcTestnet } from 'viem/chains'

/** Arc Testnet is the only chain this app talks to. */
export const ARC_CHAIN_ID = arcTestnet.id

const raw = import.meta.env.VITE_LEADERBOARD_ADDRESS as string | undefined
export const LEADERBOARD_ADDRESS: `0x${string}` | undefined = raw && isAddress(raw) ? raw : undefined

/** Mirrors the contract's constants (read from the deployed contract when it is configured). */
export const MIN_SUBMIT_DURATION = 10
export const MAX_SUBMIT_DURATION = 600

export const shortAddress = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`
