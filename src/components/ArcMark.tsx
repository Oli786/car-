import { useId } from 'react'

/** Reusable Arc token icon (SVG), matching the in-game coin. */
export function ArcCoinIcon({ size = 16 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Arc coin" className="shrink-0">
      <defs>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b8fbff" />
          <stop offset="0.5" stopColor="#27c4ff" />
          <stop offset="1" stopColor="#2f6bff" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${id}-ring)`} />
      <circle cx="16" cy="16" r="11.5" fill="#07123a" />
      <g fill="none" stroke="#c9fbff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 22 L16 8.5 L22 22" />
        <path d="M12.4 18.6 Q16 15.6 19.6 18.6" />
      </g>
    </svg>
  )
}
