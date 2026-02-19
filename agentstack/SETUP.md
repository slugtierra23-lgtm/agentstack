# AgentStack — Setup Guide

## 1. Install dependencies
```bash
npm install
```

## 2. Set up environment variables
Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` — from your Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (keep secret)
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — free at cloud.walletconnect.com

## 3. Set up the database
1. Go to your Supabase project → SQL Editor
2. If upgrading from old schema, drop tables first:
```sql
drop table if exists burn_events cascade;
drop table if exists submissions cascade;
drop table if exists tasks cascade;
```
3. Run the contents of `supabase/schema.sql`

## 4. Run locally
```bash
npm run dev
```

Open http://localhost:3000

## Notes
- No STACK token needed to test — rewards are stored as numbers in the DB
- The burn is recorded off-chain until the token contract is deployed
- Connect a Base wallet to post tasks; the wallet address is recorded as the poster
