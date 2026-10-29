import { ExternalLink, RefreshCw, Trophy } from 'lucide-react'
import { useAccount } from 'wagmi'
import { buildAddressExplorerUrl } from '@/onchain-facts'
import { useTopScores } from '@/hooks/useLeaderboard'
import { ARC_CHAIN_ID, LEADERBOARD_ADDRESS, shortAddress } from '@/lib/leaderboard'

const medal = ['text-yellow-300', 'text-slate-300', 'text-orange-400']

export function Leaderboard() {
  const { address } = useAccount()
  const top = useTopScores()
  const rows = top.data ?? []

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          <Trophy size={18} className="text-yellow-300" /> Leaderboard <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-300">Arc Testnet</span>
        </h2>
        <span className="flex items-center gap-1">
          {LEADERBOARD_ADDRESS && (
            <a href={buildAddressExplorerUrl(ARC_CHAIN_ID, LEADERBOARD_ADDRESS)} target="_blank" rel="noopener noreferrer" className="grid h-11 w-11 place-items-center rounded-full text-slate-400 hover:bg-white/5" aria-label="View contract on explorer">
              <ExternalLink size={16} />
            </a>
          )}
          <button type="button" onClick={() => void top.refetch()} disabled={!LEADERBOARD_ADDRESS || top.isFetching} className="grid h-11 w-11 place-items-center rounded-full text-slate-400 hover:bg-white/5 disabled:opacity-50" aria-label="Refresh leaderboard">
            <RefreshCw size={16} className={top.isFetching ? 'animate-spin' : ''} />
          </button>
        </span>
      </div>

      {!LEADERBOARD_ADDRESS ? (
        <p className="mt-3 text-pretty text-sm text-slate-400">The leaderboard contract is not configured yet, so scores can't be posted.</p>
      ) : top.isLoading ? (
        <ul className="mt-3 space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
          ))}
        </ul>
      ) : top.isError ? (
        <div className="mt-3 text-sm text-slate-400">
          Could not load scores from Arc Testnet.{' '}
          <button type="button" onClick={() => void top.refetch()} className="font-semibold text-cyan-300 underline-offset-2 hover:underline">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-pretty text-sm text-slate-400">No scores yet. Finish a race and be the first on the board.</p>
      ) : (
        <ol className="mt-3 max-h-[22rem] space-y-1.5 overflow-y-auto pr-1">
          {rows.map((r, i) => {
            const me = !!address && r.player.toLowerCase() === address.toLowerCase()
            return (
              <li key={r.player} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${me ? 'bg-cyan-300/10 ring-1 ring-cyan-300/40' : 'bg-black/20'}`}>
                <span className={`w-6 text-center font-display font-bold tabular-nums ${medal[i] ?? 'text-slate-500'}`}>{i + 1}</span>
                <span className="flex-1 font-mono text-slate-200">{shortAddress(r.player)}{me && <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-300">You</span>}</span>
                <span className="font-semibold tabular-nums text-white">{Number(r.score).toLocaleString()}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
