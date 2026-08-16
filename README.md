# pdesign

A UX flow prototype generator — turn plain-text descriptions into clickable, multi-screen mobile prototypes in seconds. No code required.

## What it does

Describe any product flow in plain English and get a polished, click-through mobile prototype:
- **3–5 connected screens** with realistic content
- **Click-through navigation** between screens
- **Shareable public links** to send to stakeholders
- **Follow-up editing** — refine any screen with a prompt

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | Magic link (JWT) |
| AI | Anthropic Claude API |
| Billing | Stripe (stubbed) |

## Project Structure

```
pdesign/
├── client/          # Vite + React frontend (port 5173)
├── server/          # Express backend (port 3001)
└── shared/          # Shared types and demo data
```

## Getting Started

### 1. Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 2. Configure environment (optional)

```bash
cp server/.env.example server/.env
# Edit server/.env with your API keys
```

**Works without any API keys** — the app uses a demo flow and mock Stripe responses.

### 3. Start development servers

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open **http://localhost:5173**

## How to Sign In (Dev Mode)

1. Enter any email on the auth page
2. The magic link token appears on screen (yellow box)
3. Copy and paste the token to sign in

In production, add an email provider (Resend/SendGrid) to `server/src/services/auth.js`.

## Environment Variables

See `server/.env.example` for all available options.

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key for real LLM generation |
| `STRIPE_SECRET_KEY` | Stripe secret for live billing |
| `JWT_SECRET` | Secret for signing JWTs (required in production) |
| `CLIENT_URL` | Frontend URL (default: http://localhost:5173) |

## Prototype Component Library

23 mobile UI components that render inside a phone frame:

`PHeading` `PText` `PButton` `PTextInput` `POptionCard` `PImagePlaceholder` `PHeroImage` `PNavBar` `PTabBar` `PListItem` `PCard` `PDivider` `PSpacer` `PPricingTier` `PModal` `PToggle` `PAvatar` `PBadge` `PProgressBar` `PSearchBar` `PIconButton` `PStatCard` `PChipGroup`
