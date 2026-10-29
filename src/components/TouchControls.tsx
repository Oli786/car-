import { ArrowLeft, ArrowRight, ChevronsUp, OctagonMinus } from 'lucide-react'
import type { PointerEvent, ReactNode } from 'react'
import type { InputState } from '@/game/types'

interface Props {
  onInput: (patch: Partial<InputState>) => void
}

function HoldButton({ k, onInput, label, children, tone }: { k: keyof InputState; onInput: Props['onInput']; label: string; children: ReactNode; tone: string }) {
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    onInput({ [k]: true })
  }
  const up = () => onInput({ [k]: false })
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
      className={`touch-none-select grid h-[68px] w-[68px] place-items-center rounded-2xl border bg-[#0b0d22]/65 text-white backdrop-blur transition active:scale-95 active:bg-white/20 ${tone}`}
    >
      {children}
    </button>
  )
}

export function TouchControls({ onInput }: Props) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-3 pb-4">
      <div className="flex gap-2">
        <HoldButton k="left" onInput={onInput} label="Steer left" tone="border-cyan-300/40">
          <ArrowLeft size={30} />
        </HoldButton>
        <HoldButton k="right" onInput={onInput} label="Steer right" tone="border-cyan-300/40">
          <ArrowRight size={30} />
        </HoldButton>
      </div>
      <div className="flex gap-2">
        <HoldButton k="brake" onInput={onInput} label="Brake" tone="border-pink-400/40">
          <OctagonMinus size={26} />
        </HoldButton>
        <HoldButton k="boost" onInput={onInput} label="Boost" tone="border-yellow-300/50">
          <ChevronsUp size={30} />
        </HoldButton>
      </div>
    </div>
  )
}
