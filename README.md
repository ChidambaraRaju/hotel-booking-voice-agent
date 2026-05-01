# Hotel Voice Booking Agent

A real-time voice AI agent for hotel room booking, built with [LiveKit Agents](https://livekit.io). Guests call in through a web browser, authenticate via name + date of birth, and can fully manage their reservations — view, create, modify, or cancel — using natural voice conversation.

> **Status:** Ready for deployment. See [Quick Start](#quick-start) to get running.

---

## Live Demo

**Try it now:** [hotel-booking-voice-agent.vercel.app](https://hotel-booking-voice-agent.vercel.app)

Click **Call Hotel Agent**, allow microphone access, and speak to the agent. It will greet you and ask for your name and date of birth to get started.

---

## Features

| Feature | Description |
|---------|-------------|
| **Voice-first interaction** | Full duplex voice conversation — speak and listen in real time |
| **Guest authentication** | Name + date of birth verification before accessing bookings |
| **View bookings** | Retrieve all bookings for a guest |
| **Create booking** | Book a room with check-in date, duration, room type, and add-ons |
| **Modify booking** | Change dates, room type, or add-ons on existing reservations |
| **Cancel booking** | Cancel a reservation after confirming guest identity |
| **Multi-TTS provider** | Switch between MiniMax Speech-2.8-HD and Sarvam Bulbul v3 |
| **Noise cancellation** | WebRTC-level noise cancellation for cleaner audio |
| **Preemptive speech** | Agent begins speaking while user is still talking for lower latency |

### Room Types

- **Standard** — Basic room with essential amenities
- **Deluxe** — Upgraded room with better view and amenities
- **Suite** — Premium suite with separate living area

### Available Add-ons

- Breakfast included
- Late checkout
- Spa access

---

## Tech Stack

| Layer | Technology |
|------|------------|
| **Frontend** | Next.js 14 (React 18), LiveKit Components, Tailwind CSS |
| **Voice Agent** | Python 3.10+, LiveKit Agents SDK |
| **Speech-to-Text** | Sarvam AI Saaras v3 (en-IN) |
| **LLM** | GroqCloud — `openai/gpt-oss-20b` |
| **Text-to-Speech** | MiniMax Speech-2.8-HD (default) or Sarvam AI Bulbul v3 |
| **VAD** | Silero VAD (Voice Activity Detection) |
| **Database** | Supabase (PostgreSQL) |
| **Infrastructure** | LiveKit Cloud (WebRTC), Vercel (frontend) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                         │
│  ┌─────────────────┐    ┌─────────────────────┐    ┌───────────────────┐  │
│  │  Next.js SPA    │    │  LiveKit JS SDK     │    │  Microphone       │  │
│  │  (UI + controls)│◄───►│  (WebRTC session)   │◄──►│  (audio I/O)      │  │
│  └─────────────────┘    └─────────────────────┘    └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebRTC
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LIVEKIT CLOUD                                     │
│            (manages WebRTC rooms, tokens, participant state)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ ingress / egress
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VOICE AGENT (Python)                                │
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────────────────┐   │
│  │  Silero  │───►│  Sarvam  │───►│   Groq   │───►│   MiniMax / Sarvam   │   │
│  │   VAD    │    │   STT    │    │   LLM    │    │       TTS            │   │
│  └──────────┘    └──────────┘    └──────────┘    └─────────────────────┘   │
│       │                                           │                          │
│       │              ┌──────────────────┐         │                          │
│       └─────────────►│  HotelAgent      │◄────────┘                          │
│                      │  (tools: CRUD)   │                                    │
│                      └────────┬─────────┘                                    │
│                               │                                               │
│                               ▼                                               │
│                      ┌────────────────┐                                     │
│                      │    Supabase    │                                     │
│                      │   (bookings)   │                                     │
│                      └────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Audio Pipeline

1. User speaks → **VAD** detects speech segments
2. Speech segments → **STT** (Sarvam Saaras) converts to text
3. Text → **LLM** (Groq GPT-OSS-20B) generates agent response
4. Agent response → **TTS** (MiniMax or Sarvam) converts to audio
5. Audio → played back to user via WebRTC

---

## Project Structure

```
hotel-booking-voice-agent/
├── hotel-agent/                # Python voice agent
│   ├── src/
│   │   └── agent.py           # HotelAgent class + tools + LiveKit server
│   ├── pyproject.toml         # Dependencies (uv)
│   ├── .env.local             # API keys and secrets
│   └── docs/                  # Architecture docs
│
├── frontend/                   # Next.js web app
│   ├── app/
│   │   ├── page.tsx          # Root page — renders <App>
│   │   ├── layout.tsx        # Root layout with theme provider
│   │   └── api/token/route.ts # LiveKit token generation endpoint
│   ├── components/
│   │   ├── app/              # App shell, view controller, theme toggle
│   │   ├── agents-ui/        # LiveKit session UI components
│   │   └── ui/               # shadcn/ui component library
│   ├── hooks/                # Custom React hooks
│   ├── styles/               # Tailwind + theme CSS
│   └── app-config.ts         # App configuration
│
├── docs/
│   └── plans/               # Design and implementation plans
│
├── CLAUDE.md                # Developer instructions
├── PROJECT.md               # Project specification
└── README.md               # This file
```

---

## Database Schema

Supabase PostgreSQL table: `bookings`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | Primary Key, default `gen_random_uuid()` |
| `customer_name` | `text` | Not null |
| `dob` | `date` | Not null |
| `booking_date` | `timestamp with time zone` | Not null |
| `num_days` | `integer` | Not null |
| `room_type` | `text` | Not null, one of: `standard`, `deluxe`, `suite` |
| `additional_features` | `jsonb` | Default `{}` |
| `created_at` | `timestamp with time zone` | Default `now()` |
| `updated_at` | `timestamp with time zone` | Default `now()` |

### Row Level Security (RLS)

RLS is enabled. The `anon` key can only `SELECT` and `INSERT` (for lookup and booking creation). Booking modifications and cancellations require the `service_role` key, which is only used server-side in the Python agent.

---

## Configuration

### Agent (`hotel-agent/.env.local`)

```env
# LiveKit Cloud
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# AI APIs
SARVAM_API_KEY=your_sarvam_key
GROQ_API_KEY=your_groq_key
MINIMAX_API_KEY=your_minimax_key
MINIMAX_GROUP_ID=your_minimax_group_id

# TTS provider: "minimax" (default) or "sarvam"
TTS_PROVIDER=minimax
```

### Frontend (`frontend/.env.local`)

```env
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_LIVEKIT_API_KEY=your_api_key
```

### Frontend Config (`frontend/app-config.ts`)

```ts
export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Grand Hotel',
  pageTitle: 'Hotel Booking Voice Agent',
  pageDescription: 'A voice AI agent for hotel room booking',
  startButtonText: 'Call Hotel Agent',
  agentName: 'hotel-agent',      // Must match agent dispatch name in LiveKit Cloud
  audioVisualizerType: 'wave',   // 'bar' | 'wave' | 'grid' | 'radial' | 'aura'
  // ...
};
```

---

## Quick Start

### 1. Set up Supabase

Create a project at [supabase.com](https://supabase.com) and run:

```sql
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  dob date NOT NULL,
  booking_date timestamptz NOT NULL,
  num_days integer NOT NULL,
  room_type text NOT NULL CHECK (room_type IN ('standard', 'deluxe', 'suite')),
  additional_features jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can insert (booking creation) and select (lookup)
CREATE POLICY "Allow insert" ON bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow select" ON bookings FOR SELECT TO anon USING (true);
```

### 2. Configure LiveKit Cloud

1. Create a project at [livekit.io/cloud](https://livekit.io/cloud)
2. Note your URL, API key, and API secret
3. Create an agent dispatch entry named `hotel-agent` pointing to your deployed agent

### 3. Set environment variables

```bash
# hotel-agent/.env.local
cp hotel-agent/.env.example hotel-agent/.env.local
# Fill in all values

# frontend/.env.local
cp frontend/.env.example frontend/.env.local
# Fill in VITE_LIVEKIT_URL and VITE_LIVEKIT_API_KEY
```

### 4. Run the voice agent

```bash
cd hotel-agent
uv sync
uv run python src/agent.py dev
```

The agent starts in development mode, listening for WebRTC connections via LiveKit Cloud.

### 5. Run the frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Call Hotel Agent**.

---

## Deployment

### Voice Agent (LiveKit Cloud)

The Python agent can be deployed to LiveKit Cloud via Docker. Build the image and deploy using the LiveKit Cloud dashboard or CLI. Set the following environment variables in LiveKit Cloud secrets:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `SARVAM_API_KEY`, `GROQ_API_KEY`, `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID`
- `TTS_PROVIDER`

Do **not** set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, or `LIVEKIT_API_SECRET` as build arguments or in the Dockerfile — these are injected at runtime by LiveKit Cloud.

### Frontend (Vercel)

```bash
cd frontend
vercel deploy
```

Set the following environment variables in Vercel:

- `VITE_LIVEKIT_URL`
- `VITE_LIVEKIT_API_KEY`
- `NEXT_PUBLIC_CONN_DETAILS_ENDPOINT` (optional — only needed for sandbox token mode)

---

## Available Scripts

### Agent

```bash
cd hotel-agent

uv sync                      # Install dependencies
uv run python src/agent.py dev       # Run in development mode
uv run python src/agent.py console     # Run in console mode (no WebRTC)
uv run mypy src/             # Type check
uv run pytest               # Run tests
```

### Frontend

```bash
cd frontend

pnpm dev                    # Development server
pnpm build                  # Production build
pnpm lint                   # Lint
```

---

## Verification Commands

Before committing, run these to verify the build:

```bash
# Agent
cd hotel-agent && uv sync && uv run mypy src/ && uv run pytest

# Frontend
cd frontend && pnpm build && pnpm lint
```

---

## Troubleshooting

### "ws_url is required" error

LiveKit reads `LIVEKIT_URL` at import time. Ensure `load_dotenv(".env.local")` is called **before** importing any LiveKit modules. See `hotel-agent/src/agent.py` line 19–20.

### Agent connects but doesn't respond

Check that the agent dispatch name in LiveKit Cloud matches `agentName` in `frontend/app-config.ts` (`hotel-agent`).

### Microphone not working in browser

Ensure the page is served over **HTTPS** (or `localhost`). browsers block microphone access on HTTP in production.

### Supabase errors

Verify `SUPABASE_SERVICE_KEY` is the service role key (not the anon key). The anon key only has insert/select permissions, but the agent also needs update/delete for modify/cancel operations.
