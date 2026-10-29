# Arc Racer

An arcade top-down racing game with an optional onchain leaderboard on Arc Testnet. Steer a neon sports car through endless traffic, collect Arc tokens, survive as the road speeds up, and post your best run with your wallet. Testnet only: no wagers, no gambling, no real-money rewards.

Built with [Arc Studio](https://studio.arc.io)

## Features

- Endless road with traffic, trucks, barriers and oil slicks, plus difficulty that rises over time
- Arc-branded sports car and collectible Arc tokens, pickup effects, shield power-ups (3 shields per run)
- Score, high score (saved in your browser), distance, speed and level readout
- Start, pause, restart and sound controls
- Responsive layout for desktop and mobile, with on-screen touch controls
- Optional wallet connection and an Arc Testnet leaderboard, kept separate from the track

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | A / D or Left / Right arrows | Left / Right buttons |
| Boost | W or Up arrow | Boost button |
| Brake | S or Down arrow | Brake button |
| Pause / resume | P or Esc | Pause button |
| Start | Space or Enter | Start Game button |

Score is distance in metres plus 20 points per Arc token.

## Tech stack

- React, Vite, TypeScript, Tailwind CSS
- HTML canvas game engine with WebAudio sound (no image or audio files)
- wagmi, viem and ConnectKit for the optional wallet
- Solidity and Foundry for the leaderboard contract

## Setup

Prerequisites: [Bun](https://bun.sh). [Foundry](https://getfoundry.sh) is only needed for the contract.

```bash
git clone <your-repository-url>
cd <your-repository-folder>
bun install
cp .env.example .env
bun run dev
```

Open the local URL that Vite prints. You can play right away; connecting a wallet is optional.

### Scripts

```bash
bun run dev                  # start the dev server
bun run check                # lint and typecheck
bun run scripts/sim-game.ts  # headless gameplay simulation
bun run contracts:build      # compile the contract
bun run contracts:test       # run contract tests (the invariant suite is slow)
```

The contract tests need the Foundry standard library. If `lib/forge-std` is missing, run `forge install foundry-rs/forge-std --no-git` first.

### Environment variables

| Name | Purpose |
| --- | --- |
| `VITE_LEADERBOARD_ADDRESS` | Address of the leaderboard contract on Arc Testnet. If empty, the game still works and the leaderboard shows as not configured. |

Never commit a `.env` file or any private key. Only `.env.example` belongs in the repository.

## Arc Testnet integration

- Network: Arc Testnet, chain ID 5042002. The app only talks to this chain and asks your wallet to switch if it is on another network.
- Wallet: optional. The app shows your address, network status and testnet USDC balance (USDC is also the gas token on Arc).
- Leaderboard contract: `ArcRacerLeaderboard` at `0xc675cfcfabf025f14bf93d0a098ad386f1c84676`, viewable on the [Arc Testnet explorer](https://explorer.testnet.arc.io/address/0xc675cfcfabf025f14bf93d0a098ad386f1c84676).
- Submitting a score: after a race, connect your wallet, switch to Arc Testnet and press Submit to Leaderboard. The run is checked first, then you confirm in your wallet, and the board refreshes after confirmation.
- Fair play: the contract works out the score itself, only accepts personal-best improvements, and rejects runs that are impossible for their duration. This deters casual cheating but cannot prove a race was actually played.
- Getting test funds: use the Circle faucet for Arc Testnet USDC to pay for gas.

To deploy your own copy of the contract, build it with `bun run contracts:build`, deploy `ArcRacerLeaderboard` to Arc Testnet from your own wallet with the owner address as the constructor argument, then set `VITE_LEADERBOARD_ADDRESS` to the new address.

## Project layout

- `src/` - app, game engine (`src/game`), UI components and wallet hooks
- `contracts/` - Solidity contract, Foundry tests and scripts
- `scripts/` - gameplay simulation and deployment helpers
