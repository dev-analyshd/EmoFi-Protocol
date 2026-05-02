# EmoFi Protocol Workspace

## Overview

pnpm workspace monorepo using TypeScript. Reality-Integrated Emotional Finance DeFi dApp — tokenizes human emotional states as on-chain assets.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + framer-motion (artifacts/emofi)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec)
- **Build**: esbuild (CJS bundle)
- **Smart contracts**: Solidity (contracts/)

## Architecture

```
artifacts/
  emofi/          — React + Vite frontend dApp (all protocol pages)
  api-server/     — Express backend (all EmoFi REST endpoints)
lib/
  api-spec/       — OpenAPI spec + Orval codegen config
  api-client-react/ — Generated React Query hooks
  api-zod/        — Generated Zod schemas
  db/             — Drizzle ORM schema + migrations
contracts/        — Solidity smart contracts (reference implementation)
```

## Frontend Pages

- `/`            — Landing page (home.tsx)
- `/vaults`      — RI-Vaults: Reality-Integrated Emotion Storage
- `/marketplace` — EmoFi Exchange: Trade Human Attributes
- `/staking`     — Attribute Staking: Compound Emotional Capital
- `/governance`  — EmoFi DAO: Govern the Protocol
- `/dashboard`   — User dashboard (portfolio, AI recommendations)

## Smart Contracts

- `EmoFiToken.sol`     — ERC1155 multi-token for emotional attributes
- `EMOToken.sol`       — ERC20 governance token
- `RIVault.sol`        — Reality-Integrated Vault contract
- `EmoMarketplace.sol` — P2P marketplace for emotional tokens
- `EmoStaking.sol`     — Staking rewards contract
- `EmoGovernor.sol`    — DAO governance contract (OpenZeppelin Governor)

## Database Schema

Tables: users, attribute_tokens, user_token_balances, vaults, vault_transactions, marketplace_listings, trades, staking_positions, staking_rates, governance_proposals, votes, oracle_feeds, reward_claims, ai_recommendations

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## API Endpoints

- `POST /api/seed` — seed sample data
- `GET/POST /api/users` + `/api/users/:id` + `/api/users/:id/dashboard`
- `GET /api/tokens` + `/api/tokens/:type`
- `GET/POST /api/vaults` + `/api/vaults/:id`
- `GET/POST /api/marketplace/listings` + buy/cancel
- `GET/POST /api/staking/positions` + claim/unstake + rates
- `GET/POST /api/governance/proposals` + vote
- `GET /api/oracle/feeds` + `/api/oracle/feeds/:feedType` + sentiment
- `GET /api/dashboard/:userId` + AI recommendations

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
