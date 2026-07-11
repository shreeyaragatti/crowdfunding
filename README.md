BetterFund : Crowdfunding Platform Powered by Ethereum Blockchain

Repository: [shreeyaragatti/crowdfunding](https://github.com/shreeyaragatti/crowdfunding)

Contact: [shreeyaragatti24@gmail.com](mailto:shreeyaragatti24@gmail.com)

## Problem Statement and Necessity 
Crowdfunding is one of the most popular ways to raise funds for any project, cause or for helping any individual in need. With the onset of Covid we have seen a rise in Crowdfunding activities across the globe which includes small campaigns to help people get oxygen and medical help to large funds such as PM Cares.

The major problems with the Current Crowdfunding Platforms that we wanted to solve were : 
- Security : As the funds become larger, they need to be heavily secure, although stringent measures such as symmetric encryption are in place to make e-payment safe and secure,it is still vulnerable to hacking. Blockchain — which has never been compromised yet — can provide that level of security.
- Transparency and Anti-Fraud  : We have seen, and continue to see a lot of crowdfunding scams happening around. There is no way to see where the funds are being used. We wanted to make the entire flow of funds transparent at every stage, so that there is no possibility of the money being misused.
- Global contribution : With some of the platforms being country specific, it becomes hard for people from other countries to contribute to various campaigns. Using blockchain anyone in the world can contribute to the campaign. Transactions are quick and convenient.

We were highly inspired by the CryptoRelief initiative ([www.cryptorelief.in](https://www.cryptorelief.in))  which raised ~1 billion dollars for Covid Relief in India from the entire global community, in a highly transparent manner. 

## Detailed Report and PPT
- A Detailed Report of the Project can be [found here](https://docs.google.com/document/d/1_CdJ5pEimTrejDSBnq9Ze6kz2BcKJ6qtiikqWs0rglc/edit?usp=sharing)
- A Presentation on the Application can be [found here](https://docs.google.com/presentation/d/1X5CMPB_Mece3C7NI5dvB7eTKJjbn0E70NY3pjVZn5ho/edit?usp=sharing)

## Screenshots 
#### Home Page :
![image](https://user-images.githubusercontent.com/49694914/119785319-ba2cf580-beec-11eb-92f4-73c5d686e058.png)
### Campaign Page :
![image](https://user-images.githubusercontent.com/49694914/119785442-d2047980-beec-11eb-8cfd-ac246582a4af.png)
### Create Campaign Page :
![image](https://user-images.githubusercontent.com/49694914/119785522-e47eb300-beec-11eb-88f8-8cc65a7c42ec.png)
### Withdrawal Request Page :
![image](https://user-images.githubusercontent.com/49694914/119785617-ff512780-beec-11eb-961a-b7857665f031.png)
### New Withdrawal Request Page :
![image](https://user-images.githubusercontent.com/49694914/119785671-0d06ad00-beed-11eb-9554-6786c58cc19d.png)



## Tech Stack 
- Next JS
- Chakra UI
- Solidity
- Web3.js

## Local setup
1. Install dependencies:
   `npm install`
2. Copy the environment template:
   `copy .env.example .env`
3. Fill these required values in `.env`:
   - `NEXT_PUBLIC_RPC_URL`: Sepolia RPC URL from Alchemy, Infura, QuickNode, etc.
   - `DEPLOYER_PRIVATE_KEY`: private key for the wallet that will deploy contracts.
   - `NEXT_PUBLIC_BACKEND_PROVIDER`: use `prisma` for server-side Supabase Postgres.
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL, only needed for browser-side Supabase APIs.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key, only needed for browser-side Supabase APIs.
   - `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase key used by API routes for campaign image uploads and metadata writes.
   - `NEXT_PUBLIC_CAMPAIGN_IMAGE_BUCKET`: Supabase Storage bucket for uploaded campaign images. Defaults to `campaign-images`.
   - `DATABASE_URL`: Supabase transaction-mode pooler URL for Prisma runtime queries.
   - `DIRECT_URL`: Supabase session-mode pooler URL for Prisma schema sync and migrations.
4. Sync the Prisma schema to Supabase:
   `npm run db:push`
5. Compile and deploy the contracts:
   `npm run contracts:compile`
   `npm run contracts:deploy:sepolia`
6. Start the app:
   `npm run dev`

The deploy script automatically writes `NEXT_PUBLIC_FACTORY_ADDRESS` back into `.env` or `.env.local` after the `CampaignFactory` contract is deployed.

## Environment values
- `NEXT_PUBLIC_CHAIN_ID`: default `11155111` for Sepolia.
- `NEXT_PUBLIC_CHAIN_NAME`: default `Sepolia`.
- `NEXT_PUBLIC_RPC_URL`: frontend and server-side blockchain RPC.
- `SEPOLIA_RPC_URL`: optional Hardhat-only RPC; leave blank to reuse `NEXT_PUBLIC_RPC_URL`.
- `NEXT_PUBLIC_BLOCK_EXPLORER_URL`: default `https://sepolia.etherscan.io`.
- `NEXT_PUBLIC_FACTORY_ADDRESS`: deployed `CampaignFactory` contract address.
- `NEXT_PUBLIC_OWNER_ADDRESS`: optional project owner/admin wallet address.
- `NEXT_PUBLIC_BACKEND_PROVIDER`: default `supabase`.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for API routes. Never prefix this with `NEXT_PUBLIC`.
- `NEXT_PUBLIC_CAMPAIGN_IMAGE_BUCKET`: public bucket name for uploaded campaign images.
- `DATABASE_URL`: Prisma runtime URL. Use the Supabase transaction-mode pooler on port `6543`.
- `DIRECT_URL`: Prisma migration/schema URL. Use the Supabase session-mode pooler on port `5432`.
- `DEPLOYER_PRIVATE_KEY`: deployer wallet private key. Never prefix this with `NEXT_PUBLIC`.

## Prisma
- `npm run db:generate`: generate Prisma Client.
- `npm run db:push`: sync `prisma/schema.prisma` to Supabase.
- `npm run db:migrate`: create and apply a Prisma migration.
- `npm run db:studio`: open Prisma Studio.

The reusable Prisma client lives at `lib/prisma.js`. Runtime queries use `DATABASE_URL`; Prisma CLI commands use `DIRECT_URL` through `prisma.config.ts`.

## Campaign images
Campaign creation accepts either a local image upload or an existing image URL. Local images are uploaded by `pages/api/campaign-image.js` to Supabase Storage, then the resulting public URL is written to the campaign contract.

Set `SUPABASE_SERVICE_ROLE_KEY` before using local uploads. The route creates the configured bucket as public if it does not already exist.

## Prerequisites to create campaigns and contribute
1. Install MetaMask and create/import a wallet.
2. Switch MetaMask to Sepolia.
3. Fund the wallet with Sepolia test ETH from a faucet.


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
