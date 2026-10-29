# Arc Racer

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

Arcade canvas racing game (src/game/*) with an optional wallet and an onchain leaderboard on Arc Testnet. Score = distance + 20 per coin, computed by the contract. No wagering or rewards.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```

## Deployed contracts

- ArcRacerLeaderboard on Arc Testnet: 0xc675cfcfabf025f14bf93d0a098ad386f1c84676 (owner = platform deployer wallet, pause/unpause only). Address is in `.env` as `VITE_LEADERBOARD_ADDRESS`.
- The contract's speed and coin bounds mirror constants in `src/game/constants.ts` and `src/game/world.ts` (top speed min(33.6+0.36t, 86.4) m/s, coin spawn limiter 3.3/s). Change both sides together.
- `bun run scripts/sim-game.ts` runs a headless gameplay simulation and checks runs against the contract bounds.
