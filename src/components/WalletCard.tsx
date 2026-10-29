import { ConnectKitButton } from 'connectkit'
import { Check, Copy, ExternalLink, LogOut, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { erc20Abi } from 'viem'
import { useAccount, useDisconnect, useReadContract, useSwitchChain } from 'wagmi'
import { buildAddressExplorerUrl, getUsdc } from '@/onchain-facts'
import { formatUnitsFixed } from '@/onchain-money'
import { ARC_CHAIN_ID, shortAddress } from '@/lib/leaderboard'
import { parseTxError } from '@/lib/errors'

const ghost = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/5 active:scale-95'
const primary = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 font-display text-sm font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-60'

export function useWalletStatus() {
  const { address, chainId, isConnected, isConnecting, isReconnecting } = useAccount()
  return { address, isConnected, isConnecting: isConnecting || isReconnecting, onArc: isConnected && chainId === ARC_CHAIN_ID, chainId }
}

export function WalletCard() {
  const { address, isConnected, isConnecting, onArc, chainId } = useWalletStatus()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [copied, setCopied] = useState(false)
  const usdc = getUsdc(ARC_CHAIN_ID)

  const balance = useReadContract({
    address: usdc?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!usdc, refetchInterval: 20_000 },
  })

  const status = !isConnected
    ? { label: isConnecting ? 'Connecting' : 'Not connected', dot: 'bg-slate-500' }
    : onArc
      ? { label: 'Arc Testnet', dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]' }
      : { label: `Wrong network${chainId ? ` (${chainId})` : ''}`, dot: 'bg-amber-400' }

  const copy = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy the address.')
    }
  }

  const switchToArc = () =>
    switchChain(
      { chainId: ARC_CHAIN_ID },
      {
        onError: (e) => {
          const p = parseTxError(e)
          if (p.rejected) toast('Network switch cancelled.')
          else toast.error('Could not switch network. Switch to Arc Testnet (5042002) in your wallet.')
        },
      },
    )

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          <Wallet size={18} className="text-cyan-300" /> Wallet
        </h2>
        <span className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-medium text-slate-200" role="status">
          <span className={`h-2 w-2 rounded-full ${status.dot}`} /> {status.label}
        </span>
      </div>

      {!isConnected ? (
        <div className="mt-3 space-y-2">
          <p className="text-pretty text-sm text-slate-400">Optional. Connect a wallet to post your score to the Arc Testnet leaderboard. You can play without one.</p>
          <ConnectKitButton.Custom>
            {({ show, isConnecting: busy }) => (
              <button type="button" onClick={show} disabled={busy} className={primary}>
                <Wallet size={16} /> {busy ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-black/25 px-3 py-2">
            <span className="font-mono text-sm text-white" title={address}>{address ? shortAddress(address) : ''}</span>
            <span className="flex gap-1">
              <button type="button" onClick={() => void copy()} className="grid h-11 w-11 place-items-center rounded-full text-slate-300 hover:bg-white/5" aria-label="Copy address">
                {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
              </button>
              {address && (
                <a href={buildAddressExplorerUrl(ARC_CHAIN_ID, address)} target="_blank" rel="noopener noreferrer" className="grid h-11 w-11 place-items-center rounded-full text-slate-300 hover:bg-white/5" aria-label="View address on explorer">
                  <ExternalLink size={16} />
                </a>
              )}
            </span>
          </div>
          {onArc && (
            <p className="text-sm text-slate-400">
              Balance{' '}
              <span className="font-semibold tabular-nums text-white">
                {balance.data !== undefined && usdc ? formatUnitsFixed(balance.data, usdc.decimals, 2) : balance.isLoading ? '...' : '--'} USDC
              </span>
              <span className="text-slate-500"> (testnet, also pays gas)</span>
            </p>
          )}
          {!onArc && (
            <button type="button" onClick={switchToArc} disabled={switching} className={primary}>
              {switching ? 'Check your wallet...' : 'Switch to Arc Testnet'}
            </button>
          )}
          <button type="button" onClick={() => disconnect()} className={`${ghost} w-full`}>
            <LogOut size={15} /> Disconnect
          </button>
        </div>
      )}
    </section>
  )
}
