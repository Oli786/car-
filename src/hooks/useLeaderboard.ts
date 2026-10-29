import { useReadContract, useReadContracts } from 'wagmi'
import { leaderboardAbi } from '@/lib/leaderboardAbi'
import { ARC_CHAIN_ID, LEADERBOARD_ADDRESS } from '@/lib/leaderboard'

export function useTopScores() {
  return useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: leaderboardAbi,
    functionName: 'getTopScores',
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!LEADERBOARD_ADDRESS, refetchInterval: 15_000 },
  })
}

export function usePlayerStanding(player: `0x${string}` | undefined) {
  const base = { address: LEADERBOARD_ADDRESS, abi: leaderboardAbi, chainId: ARC_CHAIN_ID } as const
  const q = useReadContracts({
    contracts: [
      { ...base, functionName: 'bestScoreOf', args: player ? [player] : undefined },
      { ...base, functionName: 'rankOf', args: player ? [player] : undefined },
      { ...base, functionName: 'allowanceOf', args: player ? [player] : undefined },
    ],
    query: { enabled: !!LEADERBOARD_ADDRESS && !!player, refetchInterval: 20_000 },
  })
  const [best, rank, allowance] = q.data ?? []
  return {
    isLoading: q.isLoading,
    best: best?.status === 'success' ? Number(best.result) : undefined,
    rank: rank?.status === 'success' ? Number(rank.result) : undefined,
    allowance: allowance?.status === 'success' ? Number(allowance.result) : undefined,
    refetch: q.refetch,
  }
}
