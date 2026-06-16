# Architectural Analysis: Migrating to LangChain for RAG

This document provides a detailed evaluation of whether to transition the current lightweight RAG implementation in the `ai-service` to a **LangChain-based RAG pipeline**, along with the exact code modifications required.

---

## 1. Current RAG Architecture vs. LangChain

The current implementation in `ai-service/app/routers/chat.py` and `generate.py` uses a **lightweight, native design**:
* **Database Access**: Direct asynchronous queries using `asyncpg` with pgvector distance operator (`<=>`).
* **Embeddings**: Direct calls to `app/embeddings.py` (fetching from Hugging Face Serverless API).
* **Memory**: Manual rolling-window SQL queries to load the last 10 messages from PostgreSQL.
* **LLM Calls**: Direct calls via the standard OpenAI async SDK client.
* **Retrieval Strategy**: 5 parallel async database calls fetched concurrently using `asyncio.gather` (highly custom multi-source blending).

### LangChain Conceptual Mapping
To achieve the equivalent logic with LangChain, the components map as follows:

| System Layer | Current Implementation | LangChain Equivalent |
| :--- | :--- | :--- |
| **Vector Database** | Custom raw SQL on `OrgDocument` via `asyncpg` | `PGVector` Vector Store integration |
| **Embeddings** | `app/embeddings.py` (HF endpoint query) | `HuggingFaceInferenceEmbeddings` or custom subclass |
| **LLM Interface** | Standard `openai` / `httpx` wrapper | `ChatOpenAI` (or other chat model classes) |
| **Conversation Memory** | Custom Postgres queries to `ChatMessage` table | `PostgresChatMessageHistory` + `ConversationBufferWindowMemory` |
| **Execution Flow** | Standard Python functions + `asyncio.gather` | LangChain Expression Language (LCEL) Runnables |

---

## 2. Required Changes to Codebase

If you decide to switch to LangChain, the following structural changes will be required:

### A. Dependencies Update (`requirements.txt`)
Add the following packages:
```text
langchain==0.2.x
langchain-core==0.2.x
langchain-community==0.2.x
langchain-openai==0.1.x
# For PGVector support in LangChain:
sqlalchemy[asyncio]==2.0.x
pgvector==0.3.x
```
> [!WARNING]
> LangChain brings a large footprint of transitive dependencies. This will increase docker image size (~150MB extra) and memory overhead during cold start.

### B. Embeddings Wrapper Modification (`app/embeddings.py`)
Wrap the existing Hugging Face endpoint call under LangChain's `Embeddings` base class:
```python
from langchain_core.embeddings import Embeddings
from app.embeddings import encode # your existing hf encode function

class HuggingFaceServerlessEmbeddings(Embeddings):
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        # Call HF serverless API in batches
        return encode(texts)

    def embed_query(self, text: str) -> list[float]:
        # Call HF serverless API for single string
        return encode(text)
```

### C. Vector Retrieval & LCEL Chain Construction (`app/routers/chat.py`)
Instead of manual SQL queries, you would initialize a `PGVector` client and assemble an asynchronous LCEL chain:
```python
from langchain_community.vectorstores import PGVector
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI

# 1. Initialize Vector Store
db = PGVector(
    connection_string=settings.DATABASE_URL,
    embedding_function=HuggingFaceServerlessEmbeddings(),
    collection_name="OrgDocument" # Maps to table
)

# 2. Build Retriever
retriever = db.as_retriever(search_kwargs={"k": 4})

# 3. Create History-Aware Retrieval Chain
prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer the user's question based on: {context}"),
    MessagesPlaceholder(variable_name="history"),
    ("user", "{input}")
])

llm = ChatOpenAI(model=settings.LLM_MODEL_NAME, temperature=0.3)
rag_chain = (
    {"context": retriever, "history": lambda x: x["history"], "input": lambda x: x["input"]}
    | prompt
    | llm
)
```

---

## 3. Analysis: Is LangChain a Good Option for this Project?

### 🔴 The Cons (Why you should probably NOT switch)

1. **High Overhead & Memory Constraints**: 
   Your deployment requirement specifies keeping resource usage low to avoid out-of-memory (OOM) crashes on Render starter/free tiers. LangChain pulls in heavy frameworks like SQLAlchemy, Pydantic v2 core overrides, and LangSmith telemetry, increasing both container boot times and RAM usage.
2. **Complexity of Multi-Source Concurrent Retrieval**:
   In `chat.py`, your chatbot retrieves **5 distinct sources** in parallel:
   * Event entity details (direct ID lookups, no threshold).
   * Organization facts.
   * Semantic matches on `OrgDocument` types.
   * Similar events via cosine distance.
   * Platform-wide legal policies.
   
   Running this multi-modal retrieval is trivial and fast using `asyncio.gather` on raw SQL. In LangChain, combining these five sources requires writing complex custom `Runnables` or a custom multi-retriever router, which is harder to write, debug, and optimize.
3. **SQLAlchemy vs. Asyncpg Performance**:
   LangChain's `PGVector` relies on SQLAlchemy. Since your database is on a remote Render instance, direct `asyncpg` execution has minimal overhead and maximum query efficiency. Introducing an ORM wrapper in LangChain adds unnecessary abstraction latency.
4. **Opaque Stack Traces**:
   LCEL chains make code look clean, but when an error occurs (e.g., connection drop, serialization mismatch, token limit exceeded), the stack trace spans dozens of internal LangChain files, making it hard to pinpoint the issue.

### 🟢 The Pros (When LangChain is a Good Option)

1. **Advanced RAG Features**:
   If you plan to implement complex search techniques such as **Query Expansion (Multi-Query)**, **Parent Document Retrieval**, or **Reranking (using Cohere/Cross-Encoders)**, LangChain provides off-the-shelf components that save you from writing custom algorithms.
2. **Transitioning to Agents**:
   If the Chatbot needs to perform active tasks (e.g., *"Create a booking for me"* or *"Send an email"*), LangChain's Agent library simplifies tool binding and execution loops (ReAct framework).

---

## 4. Final Verdict

> [!IMPORTANT]
> **Recommendation: Stick with the current Native RAG implementation.**
>
> Your current architecture is highly optimized, lightweight, runs instantly on a CPU-friendly memory profile, and provides a clear view of all SQL execution. Given the constraints of hosting costs (keeping RAM usage minimal) and the highly custom multi-source blending required for your chat/matching logic, the overhead and complexity of LangChain outweigh its benefits. 
> 
> *Only switch to LangChain if you intend to transition your chatbot into a fully autonomous agent that calls external APIs (tool-calling).*
