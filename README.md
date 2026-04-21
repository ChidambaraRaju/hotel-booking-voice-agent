# Hotel Voice Booking Agent

A voice AI agent for hotel room booking powered by LiveKit Agents. Guests call in, authenticate via name + date of birth, and can view, create, modify, or cancel bookings stored in Supabase.

> **Status: Under Development**

## Tech Stack

- **Frontend**: React (Next.js) + LiveKit Components
- **Agent**: Python LiveKit Agents SDK
- **STT**: Sarvam AI Saaras v3
- **LLM**: GroqCloud
- **TTS**: Sarvam AI Bulbul v3
- **Database**: Supabase

## Project Structure

```
.
├── agent/                 # Python LiveKit Agent
│   └── src/
│       └── agent.py      # Main agent code
├── frontend/             # React dashboard (Next.js)
│   └── app/             # Next.js app router
├── docs/
│   └── plans/           # Design documents
└── SUPABASE.md          # Database setup guide
```

## Features

- Voice-based hotel booking management
- Guest authentication (name + DOB)
- View existing bookings
- Create new bookings
- Modify bookings (dates, room type)
- Cancel bookings

## Setup

### Prerequisites

- Python >= 3.10
- Node.js >= 20
- LiveKit Cloud account
- Supabase account
- Sarvam AI API key
- Groq API key

### Environment Variables

**Agent** (`agent/.env.local`):
```
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
SARVAM_API_KEY=
GROQ_API_KEY=
```

**Frontend** (`frontend/.env.local`):
```
VITE_LIVEKIT_URL=
VITE_LIVEKIT_API_KEY=
```

### Running Locally

```bash
# Agent
cd agent
uv sync
uv run agent

# Frontend
cd frontend
pnpm install
pnpm dev
```

## Architecture

```
Dashboard (React) ---WebRTC---> LiveKit Cloud ---> Agent (Python)
                                              |
                                              +--> Supabase DB
                                              +--> Groq LLM
                                              +--> Sarvam STT/TTS
```

## License

MIT License
