# CorpConnect AI Service

A secure, multi-tenant Python/FastAPI microservice handling AI-powered matchmaking, contextual RAG (Retrieval-Augmented Generation) chatbot sessions, semantic vector search, document ingestion, and asynchronous background embeddings.

The service integrates with the primary database using vector indexing (via `pgvector`) for storing and performing high-performance similarity searches on embeddings.

---

## Architectural Overview

The following diagram illustrates how the AI Service securely integrates into the overall CorpConnect ecosystem:

```mermaid
graph TD
    %% Clients & Interfaces
    User([User in Browser]) <--> |Interactive UI / Chat| NextJS[Next.js Application]
    Dev([External API Consumer]) <--> |Direct API calls / REST| FastAPI[FastAPI AI Service]

    %% Internals & Security
    NextJS <--> |1. Session & Access Verification| DB[(Database)]
    NextJS <--> |2. Internal Server Action Handler| NextBackend[Next.js Backend]
    NextBackend --> |3. Secure System-to-System Token| FastAPI

    %% FastAPI Components
    subgraph AI Service [FastAPI Microservice]
        FastAPI --> Middleware[Auth Middleware]
        Middleware --> |Token Verified| RouterChat[Chat Router RAG]
        Middleware --> |Token Verified| RouterRecommend[Matchmaking Router]
        Middleware --> |Token Verified| RouterSearch[Search Router]
        Middleware --> |Token Verified| RouterIngest[Ingest Router]

        RouterChat --> EmbeddingEncoder[Embeddings Encoder]
        RouterRecommend --> EmbeddingEncoder
        RouterSearch --> EmbeddingEncoder
        RouterIngest --> EmbeddingEncoder
    end

    %% DB & ML / External Services
    EmbeddingEncoder <--> |Local Model Cache| Transformers[Transformers / PyTorch]
    RouterChat --> |Parallel Context Queries| DB
    RouterChat --> |Prompt + History| LLM[LLM Engine]
    RouterRecommend <--> |Read/Write Cache| Redis[(Redis Cache)]
    RouterRecommend --> DB
    RouterSearch --> |Vector similarity search| DB
    RouterIngest --> |Vector Storage| DB

    %% Job Queue Async Flow
    NextJS --> |Enqueue Job| JobQueue[Async Job Queue]
    JobQueue --> |Embed Async Job| NextBackend
```

---

## Core Features & Functionalities

### 1. Contextual RAG Chatbot
Provides an interactive chatbot concierge with persistent conversation memory (rolling window of recent turns) stored securely in the database.

The chatbot operates on a **multi-channel parallel retrieval strategy** to ground system prompts:
* **Entity Facts:** Direct details of the hosting organization or the specific event.
* **Event Documents:** Supplementary FAQs or schedules.
* **Company Documents:** Organization mission and profile details.
* **Related Events:** Pre-computed vector similarity search for other events hosted by the same organization.
* **Platform Policies:** Global compliance and safety regulations.

### 2. Matchmaking & Recommendations
* **Event Recommendations:** Computes a user preference profile based on engagement and participation history, performing similarity searches against upcoming public events. Features an automatic fallback to popular events for new users.
* **Organization Recommendations:** Identifies strategic business-to-business synergies by comparing organizational profiles, boosted by historical interaction frequency.

### 3. Semantic Search
Converts search queries into embeddings and runs high-speed vector queries against the events registry to find semantically relevant events (e.g. matching "startup meetups" with events focused on "venture capital networking").

### 4. Document Ingestion
Handles uploading, chunking (sliding window with overlap), and embedding of files. Supports text, Markdown, and PDF formats.

---

## Authentication & Authorization Pipeline

Every endpoint (except the health check) is secured. The service implements a **dual-authentication middleware** model to isolate system traffic from external integrations:

```
                  ┌───────────────────┐
                  │  Incoming Request │
                  └─────────┬─────────┘
                            │
              Is System Bearer Token present?
              ┌─────────────┴─────────────┐
              │Yes                        │No
              ▼                           ▼
      [System Auth Mode]         [Tenant API Key Mode]
  Verifies signature using     Verifies X-Tenant-ID &
  secure server-to-server      X-API-Key credentials via
  credentials.                 one-way cryptographic hash.
              │                           │
   Internal system access.      Applies subscription tiers
                                & meters API usage counts.
              └─────────────┬─────────────┘
                            ▼
                    Access Authorized
```

### Feature Tier Gating
When using **Tenant API Key Mode**, access is strictly gated based on the organization's subscription tier:
* **FREE:** Allowed basic status check only.
* **PRO:** Allowed Event/Org matchmaking recommendations.
* **ENTERPRISE:** Allowed recommendations, semantic search, chatbot, and ingestion.

---

## Setup & Running

### 1. Prerequisites
* **Python 3.11+**
* **PostgreSQL** with the vector database extension enabled.
* **Redis** (optional; recommendations fallback to live database queries if omitted).

### 2. Installation
```bash
cd ai-service
python -m venv .venv

# Windows Powershell
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configuration
Copy `.env.example` to `.env` and configure:
```env
DATABASE_URL="postgresql+asyncpg://user:password@host:port/dbname"
MASTER_KEY="your-super-secure-shared-key"
LLM_PROVIDER="groq" # or "openai"
LLM_API_KEY="your_api_key_here"
```
> **Note:** The `DATABASE_URL` protocol must be `postgresql+asyncpg` to support async connection pooling.

### 4. Run Development Server
```bash
uvicorn main:app --reload --port 8000
```

### 5. Production Container Deployment
```bash
docker build -t corpconnect-ai .
docker run -p 8000:8000 --env-file .env corpconnect-ai
```

---

## Performance & Optimization Notes

* **Connection Pool Management:** Database client connections are securely managed and capped to ensure the AI Service does not compete with the main application for database resources.
* **Asynchronous Embedding Queue:** Dynamic updates to events or organizations do not trigger heavy embedding computations synchronously on active client requests. Instead, they are placed in a background queue and processed asynchronously.
* **Caching Layer:** Cache keys are stored in Redis with defined Time-To-Live (TTL) intervals to guarantee high throughput and minimize redundant database overhead.
