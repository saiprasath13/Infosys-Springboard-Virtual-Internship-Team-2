# Negotiation Arena

> AI-powered multi-agent negotiation platform — Simulation Mode (AI vs AI) and Practice Mode (Human vs AI).

## Live Demo

[Open Negotiation Arena](https://negotiation-arena-17jj.onrender.com)

## Features

- **3 Prebuilt Scenarios**: Vendor Pricing, Job Offer, Project Budget
- **AI vs AI Simulation**: Watch agents negotiate with personality-driven strategies
- **Human vs AI Practice**: Participate as one of the negotiating parties
- **AI Setup Assistant**: Describe any negotiation in natural language
- **Persistent History**: Per-user conversation history with search, rename, and delete
- **Outcome Reports**: Concession timelines, satisfaction scores, and key turning points
- **Real-time Arena**: SSE-powered live negotiation workspace

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Python 3.11 + FastAPI + Pydantic v2 |
| AI | LangGraph + LangChain + Groq (llama-3.3-70b) |
| Database | PostgreSQL 15 + SQLAlchemy 2 + Alembic |
| Auth | JWT (access + refresh) + bcrypt |

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.11+

### 1. Clone and configure

```bash
git clone <repo>
cd negotiation-arena
cp .env.example .env
# Edit .env — add your GROQ_API_KEY and change SECRET_KEY
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

App will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 3. Run without Docker (development)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See `.env.example` for all required variables.

Key variables:
- `GROQ_API_KEY` — Your Groq API key (get one at https://console.groq.com)
- `USE_MOCK_AGENTS=true` — Use deterministic mock agents (no API key required)
- `SECRET_KEY` — Long random string for JWT signing

## Mock Agent Mode

Set `USE_MOCK_AGENTS=true` to run without a Groq API key. Mock agents use deterministic concession strategies and are clearly labelled in the UI.

## Free deployment (Render + Neon)

The root `Dockerfile` builds and serves the frontend and API together. The root `render.yaml` defines a free Render web service; Neon provides the external PostgreSQL database.

1. Create a PostgreSQL project on [Neon's Free plan](https://neon.com/pricing). Choose the pooled connection string in Neon’s connection details.
2. In Render, create a Blueprint from this GitHub repository and select the repository root. Render reads `render.yaml` and builds the Dockerfile.
3. When prompted for `DATABASE_URL`, paste the Neon pooled connection string directly into Render’s secret field. Do not put it in source control or chat.
4. Let Render generate `SECRET_KEY`. The blueprint selects production mode, disables SQLite fallback, enables mock agents, and configures `/health` as the health check.
5. After deployment, open the Render service URL and verify `/health`.

Both providers have free-tier quotas and service limits that can change. Render's free web service can spin down when idle, so its first request afterward may take longer. Stay on the Free plan and do not enable paid upgrades or add-ons if you need to keep the cost at $0. See [Render pricing](https://render.com/pricing) and [Render free instances](https://render.com/docs/free).

Production startup intentionally refuses the development secret, SQLite fallback, or a non-PostgreSQL database URL. The application creates its SQLAlchemy tables when it starts.

## Running Tests

```bash
# Backend
cd backend
pytest tests/ -v

# Frontend
cd frontend
npm run test
```

## Project Structure

```
negotiation-arena/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, security
│   │   ├── db/        # Models, session
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # Business logic
│   │   ├── engine/    # Negotiation state machine
│   │   └── agents/    # LangGraph AI agents
│   └── tests/
├── frontend/          # React application
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── store/
│       └── api/
├── docker-compose.yml
└── .env.example
```

## License

MIT
