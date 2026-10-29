import { useQueryClient } from '@tanstack/react-query'
import { ConnectKitButton } from 'connectkit'
import { CheckCircle2, ExternalLink, Loader2, Send, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { usePlayerStanding } from '@/hooks/useLeaderboard'
import { parseTxError } from '@/lib/errors'
import { ARC_CHAIN_ID, LEADERBOARD_ADDRESS, MAX_SUBMIT_DURATION, MIN_SUBMIT_DURATION } from '@/lib/leaderboard'
import { leaderboardAbi } from '@/lib/leaderboardAbi'
import type { RunResult } from '@/game/types'

type Phase = 'idle' | 'checking' | 'signing' | 'confirming' | 'success' | 'error'

const btn =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 font-display text-sm font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-60'

/** Posts one finished run to the leaderboard contract. Remount (via key) for each run. */
export function SubmitScore({ result }: { result: RunResult }) {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID })
  const queryClient = useQueryClient()
  const standing = usePlayerStanding(address)

  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [hash, setHash] = useState<`0x${string}` | null>(null)

  if (!LEADERBOARD_ADDRESS) {
    return <p className="rounded-xl bg-white/5 p-3 text-xs text-slate-400">Leaderboard contract not configured, so this score stays local.</p>
  }

  const contract = LEADERBOARD_ADDRESS
  const tooShort = result.duration < MIN_SUBMIT_DURATION
  const tooLong = result.duration > MAX_SUBMIT_DURATION
  const notBetter = standing.best !== undefined && result.score <= standing.best
  const blocked = tooShort
    ? `Races under ${MIN_SUBMIT_DURATION}s can't be posted.`
    : tooLong
      ? `Races over ${MAX_SUBMIT_DURATION}s can't be posted.`
      : notBetter
        ? `Your onchain best is ${standing.best?.toLocaleString()}. Beat it to post again.`
        : null

  const submit = async () => {
    if (!address || !publicClient) return
    setMessage(null)
    setHash(null)
    try {
      setPhase('checking')
      const args = [result.distance, result.coins, result.duration] as const
      const { request } = await publicClient.simulateContract({
        account: address,
        address: contract,
        abi: leaderboardAbi,
        functionName: 'submitScore',
        args,
      })
      setPhase('signing')
      const txHash = await writeContractAsync(request)
      setHash(txHash)
      setPhase('confirming')
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      if (receipt.status !== 'success') throw new Error('reverted')
      setPhase('success')
      toast.success('Score posted to the Arc Testnet leaderboard.')
      void queryClient.invalidateQueries({ queryKey: ['readContract'] })
      void queryClient.invalidateQueries({ queryKey: ['readContracts'] })
    } catch (e) {
      const parsed = parseTxError(e)
      setPhase(parsed.rejected ? 'idle' : 'error')
      setMessage(parsed.message)
    }
  }

  if (phase === 'success' && hash) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
        <p className="flex items-center justify-center gap-2 font-semibold">
          <CheckCircle2 size={16} /> Score posted onchain
        </p>
        <a href={buildTxExplorerUrl(ARC_CHAIN_ID, hash)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-300 underline-offset-2 hover:underline">
          View transaction <ExternalLink size={12} />
        </a>
      </div>
    )
  }

  const busy = phase === 'checking' || phase === 'signing' || phase === 'confirming'
  const label = phase === 'checking' ? 'Checking run...' : phase === 'signing' ? 'Confirm in your wallet...' : phase === 'confirming' ? 'Confirming on Arc...' : 'Submit to Leaderboard'

  return (
    <div className="space-y-2">
      {!isConnected ? (
        <ConnectKitButton.Custom>
          {({ show }) => (
            <button type="button" onClick={show} className={btn}>
              <Wallet size={16} /> Connect wallet to post score
            </button>
          )}
        </ConnectKitButton.Custom>
      ) : chainId !== ARC_CHAIN_ID ? (
        <button type="button" disabled={switching} onClick={() => switchChain({ chainId: ARC_CHAIN_ID }, { onError: () => toast('Network switch was cancelled or failed.') })} className={btn}>
          {switching ? 'Check your wallet...' : 'Switch to Arc Testnet'}
        </button>
      ) : (
        <button type="button" disabled={busy || !!blocked} onClick={() => void submit()} className={btn}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {label}
        </button>
      )}
      {isConnected && chainId === ARC_CHAIN_ID && blocked && <p className="text-xs text-slate-400">{blocked}</p>}
      {hash && phase === 'confirming' && (
        <a href={buildTxExplorerUrl(ARC_CHAIN_ID, hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">
          Pending transaction <ExternalLink size={12} />
        </a>
      )}
      {message && (
        <p role="alert" className={`text-pretty text-xs ${phase === 'error' ? 'text-red-300' : 'text-slate-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
