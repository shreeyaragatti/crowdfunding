# BetterFund

A decentralized crowdfunding platform powered by Ethereum blockchain, built with Next.js, Chakra UI, Solidity, and Supabase.

## What is BetterFund

BetterFund lets anyone create and fund campaigns transparently on the Ethereum blockchain. Every contribution and withdrawal is on-chain, so donors can see exactly where money goes. The platform also uses AI to recommend campaigns based on donor interests.

## Why Blockchain Crowdfunding

- **Security**: Blockchain's immutable ledger protects funds from tampering and fraud.
- **Transparency**: All transactions and withdrawal requests are publicly verifiable.
- **Global access**: Anyone with a crypto wallet can contribute, regardless of country.

## Features

- Create and manage crowdfunding campaigns with on-chain targets and minimum contributions.
- Contribute to campaigns using Sepolia ETH via MetaMask.
- Campaign managers can create withdrawal requests; contributors vote to approve them.
- Upload proof images and documents to show how funds are being used.
- AI-powered campaign recommendations based on donor interests.
- AI assistant to help donors compare campaigns and decide where to donate.
- Dev mode for testing without a wallet.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 10, React 17, Chakra UI |
| Blockchain | Solidity 0.8.28, Hardhat, Ethers.js, Web3.js |
| Backend | Next.js API Routes |
| Database | Supabase Postgres with Prisma ORM |
| Storage | Supabase Storage (campaign images and proofs) |
| AI | OpenRouter API (configurable model) |

## Smart Contract Architecture

Two Solidity contracts power the platform:

- **CampaignFactory**: Deploys new `Campaign` instances and tracks all deployed campaigns.
- **Campaign**: Handles contributions, withdrawal requests, contributor approvals, and fund finalization.

Key contract events:
- `CampaignCreated(address indexed campaign, address indexed creator, string name, uint256 target)`
- `ContributionReceived(address indexed contributor, uint256 amount)`
- `RequestCreated(uint256 indexed requestIndex, string description, uint256 value, address indexed recipient)`
- `RequestApproved(uint256 indexed requestIndex, address indexed approver)`
- `RequestFinalized(uint256 indexed requestIndex, address indexed recipient)`

## Prerequisites

- Node.js 16+
- MetaMask browser extension
- Sepolia test ETH (from a faucet) for interacting with deployed contracts
- Supabase project
- OpenRouter API key (optional, for AI features)

## First Steps

The `node_modules` folder is not included in this repository. Run the setup below to install dependencies before doing anything else.

```bash
npm install
```

If install fails because `node_modules` is missing or corrupted, remove it and reinstall:

```bash
rd /s /q node_modules
del package-lock.json
npm install
```

## Local Setup

1. Copy the environment template:
   ```bash
   copy .env.example .env
   ```

2. Fill required values in `.env`:

   | Variable | Purpose |
   |----------|---------|
   | `NEXT_PUBLIC_RPC_URL` | Sepolia RPC URL from Alchemy, Infura, QuickNode, etc. |
   | `SEPOLIA_RPC_URL` | Optional; falls back to `NEXT_PUBLIC_RPC_URL` |
   | `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | Default: `https://sepolia.etherscan.io` |
   | `DEPLOYER_PRIVATE_KEY` | Deployer wallet private key (server-side only) |
   | `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed `CampaignFactory` address |
   | `NEXT_PUBLIC_BACKEND_PROVIDER` | Use `prisma` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key for storage and metadata APIs |
   | `NEXT_PUBLIC_CAMPAIGN_IMAGE_BUCKET` | Storage bucket for campaign images |
   | `NEXT_PUBLIC_CAMPAIGN_PROOF_BUCKET` | Storage bucket for campaign proofs |
   | `DATABASE_URL` | Supabase transaction-pooler URL for Prisma runtime |
   | `DIRECT_URL` | Supabase session-pooler URL for Prisma migrations |
   | `OPENROUTER_API_KEY` | Optional AI assistant key |
   | `OPENROUTER_MODEL` | Optional; default `gpt-4o-mini` |
   | `OPENROUTER_API_HOST` | Optional; default `https://openrouter.ai/api` |

3. Sync the Prisma schema to Supabase:
   ```bash
   npm run db:push
   ```

4. Compile and deploy contracts to Sepolia:
   ```bash
   npm run contracts:compile
   npm run contracts:deploy:sepolia
   ```

   The deploy script automatically writes `NEXT_PUBLIC_FACTORY_ADDRESS` into `.env` or `.env.local` and refreshes ABI files in `smart-contract/build/`.

5. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Sync Prisma schema to Supabase |
| `npm run db:migrate` | Create and apply Prisma migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run contracts:compile` | Compile Solidity contracts with Hardhat |
| `npm run contracts:test` | Run Hardhat tests |
| `npm run contracts:deploy:sepolia` | Deploy CampaignFactory to Sepolia |

## Database Schema

The Prisma schema defines four main models:

- **CampaignMetadata**: Campaign details (name, description, image, target, minimum contribution, category, urgency, beneficiary info).
- **WithdrawalRequestMetadata**: Withdrawal requests linked to campaigns.
- **ChainEvent**: Indexed on-chain events for tracking contract activity.
- **CampaignDonation**: Off-chain donation records for analytics and donor history.
- **CampaignProof**: Proof uploads (images, documents) for campaign transparency.

## Campaign Images and Proofs

- Campaign creation accepts a local image upload or an existing image URL.
- Local images are uploaded via `pages/api/campaign-image.js` to Supabase Storage.
- The resulting public URL is written to the on-chain campaign.
- Set `SUPABASE_SERVICE_ROLE_KEY` before using local uploads. The API route creates the configured bucket as public if it does not already exist.

## AI Features

- **AI Recommendations**: The home page and dedicated recommendations page surface campaigns matched to donor interests.
- **AI Assistant**: The `/api/assistant` endpoint answers donor questions using OpenRouter. Configure `OPENROUTER_API_KEY` to enable live responses.

## Prerequisites to Create Campaigns and Contribute

1. Install MetaMask and create or import a wallet.
2. Switch MetaMask to the Sepolia test network.
3. Fund the wallet with Sepolia test ETH from a faucet.

## Environment Notes

- Never expose `DEPLOYER_PRIVATE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser. Do not prefix them with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_FACTORY_ADDRESS` is automatically set during deployment.
- Use `NEXT_PUBLIC_BACKEND_PROVIDER=prisma` for the server-side Supabase Postgres integration.

## Deploy on Vercel

The easiest way to deploy is via the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). Ensure all environment variables from `.env.example` are set in the Vercel project settings.

## License

MIT
