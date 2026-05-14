"""
ingest.py — Document Ingestion Router

Handles uploading, chunking, and embedding of organizational documents
(company descriptions, event FAQs, legal/compliance docs, general references)
into the OrgDocument table for use in RAG pipelines.

Chunking strategy:
  - Plain text / Markdown: sliding window of 512 tokens, 64-token overlap
  - PDF: extract text per page, then apply same chunking
  - Each chunk → its own row with a vector embedding
"""

import io
import logging
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.database import get_pool
from app.embeddings import encode
from app.middleware.auth import require_master_jwt
from pypdf import PdfReader

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_master_jwt)])

# ─── Constants ────────────────────────────────────────────────────────────────

# Approximate characters per token for the MiniLM tokenizer (~4 chars/token)
_CHARS_PER_TOKEN = 4
_CHUNK_SIZE_TOKENS = 512
_OVERLAP_TOKENS = 64
_CHUNK_SIZE_CHARS = _CHUNK_SIZE_TOKENS * _CHARS_PER_TOKEN   # 2048 chars
_OVERLAP_CHARS = _OVERLAP_TOKENS * _CHARS_PER_TOKEN          # 256 chars

# Allowed docType values (mirrors the OrgDocumentType enum in Prisma)
_VALID_DOC_TYPES = {
    "COMPANY_DESCRIPTION",
    "EVENT_DESCRIPTION",
    "LEGAL_COMPLIANCE",
    "GENERAL",
}

# ─── Pydantic models ──────────────────────────────────────────────────────────

class IngestTextRequest(BaseModel):
    organizationId: str | None = None   # None = platform-wide doc
    docType: str = "GENERAL"
    title: str
    content: str                         # Raw text or Markdown
    sourceUrl: str | None = None


class IngestResponse(BaseModel):
    chunks_created: int
    doc_ids: list[str]


class DeleteResponse(BaseModel):
    deleted: int


# ─── Chunking helper ─────────────────────────────────────────────────────────

def _chunk_text(text: str) -> list[str]:
    """
    Split text into overlapping chunks.
    Returns a list of non-empty string chunks.
    """
    # Normalise whitespace
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + _CHUNK_SIZE_CHARS
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += _CHUNK_SIZE_CHARS - _OVERLAP_CHARS   # advance with overlap

    return chunks


# ─── Database helpers ─────────────────────────────────────────────────────────

async def _insert_chunk(
    pool,
    org_id: str | None,
    doc_type: str,
    title: str,
    content: str,
    source_url: str | None,
    embedding: list[float],
) -> str:
    """Insert a single document chunk into OrgDocument. Returns the new row ID."""
    doc_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO "OrgDocument"
                (id, "organizationId", "docType", title, content, "sourceUrl", embedding,
                 "createdAt", "updatedAt")
            VALUES
                ($1::uuid, $2::uuid, $3::"OrgDocumentType", $4, $5, $6, $7, NOW(), NOW())
            """,
            doc_id,
            org_id,
            doc_type,
            title,
            content,
            source_url,
            embedding,
        )
    return doc_id


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/text", response_model=IngestResponse, summary="Ingest plain text or Markdown")
async def ingest_text(body: IngestTextRequest):
    """
    Split a plain text / Markdown document into chunks, embed each chunk,
    and persist them to the OrgDocument table.
    """
    if body.docType not in _VALID_DOC_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid docType '{body.docType}'. Must be one of: {sorted(_VALID_DOC_TYPES)}",
        )

    chunks = _chunk_text(body.content)
    if not chunks:
        raise HTTPException(status_code=422, detail="Document content is empty after processing.")

    pool = get_pool()
    doc_ids: list[str] = []

    # Embed all chunks at once for efficiency
    embeddings = encode(chunks)  # list[list[float]]
    if isinstance(embeddings[0], float):
        embeddings = [embeddings]  # single chunk fallback

    for chunk, embedding in zip(chunks, embeddings):
        chunk_title = f"{body.title} (chunk {len(doc_ids) + 1})"
        doc_id = await _insert_chunk(
            pool,
            body.organizationId,
            body.docType,
            chunk_title,
            chunk,
            body.sourceUrl,
            embedding,
        )
        doc_ids.append(doc_id)

    logger.info(
        "Ingested '%s' → %d chunk(s) | org=%s | type=%s",
        body.title, len(doc_ids), body.organizationId, body.docType,
    )
    return IngestResponse(chunks_created=len(doc_ids), doc_ids=doc_ids)


@router.post("/pdf", response_model=IngestResponse, summary="Ingest a PDF file")
async def ingest_pdf(
    file: UploadFile = File(...),
    organizationId: str | None = Form(None),
    docType: str = Form("GENERAL"),
    title: str = Form(...),
    sourceUrl: str | None = Form(None),
):
    """
    Parse a PDF, extract its text, chunk and embed it,
    then persist to the OrgDocument table.
    """
    if docType not in _VALID_DOC_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid docType '{docType}'. Must be one of: {sorted(_VALID_DOC_TYPES)}",
        )
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Uploaded file must be a PDF.")

    raw_bytes = await file.read()
    reader = PdfReader(io.BytesIO(raw_bytes))
    full_text = "\n\n".join(
        page.extract_text() or "" for page in reader.pages
    )

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from this PDF.")

    chunks = _chunk_text(full_text)
    pool = get_pool()
    doc_ids: list[str] = []

    embeddings = encode(chunks)
    if isinstance(embeddings[0], float):
        embeddings = [embeddings]

    for chunk, embedding in zip(chunks, embeddings):
        chunk_title = f"{title} (chunk {len(doc_ids) + 1})"
        doc_id = await _insert_chunk(
            pool, organizationId, docType, chunk_title, chunk, sourceUrl, embedding
        )
        doc_ids.append(doc_id)

    logger.info(
        "Ingested PDF '%s' → %d chunk(s) | org=%s | type=%s",
        title, len(doc_ids), organizationId, docType,
    )
    return IngestResponse(chunks_created=len(doc_ids), doc_ids=doc_ids)


@router.delete("/{doc_id}", response_model=DeleteResponse, summary="Delete a document chunk")
async def delete_document(doc_id: str):
    """Remove a single OrgDocument chunk by its ID."""
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            'DELETE FROM "OrgDocument" WHERE id = $1::uuid',
            doc_id,
        )
    # asyncpg returns "DELETE N" string
    deleted = int(result.split()[-1]) if result else 0
    if deleted == 0:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
    return DeleteResponse(deleted=deleted)


@router.delete("/org/{org_id}", response_model=DeleteResponse, summary="Delete all docs for an org")
async def delete_org_documents(org_id: str, doc_type: str | None = None):
    """
    Remove all OrgDocument chunks for a given organization.
    Optionally filter by docType to delete only a specific category.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        if doc_type:
            result = await conn.execute(
                'DELETE FROM "OrgDocument" WHERE "organizationId" = $1::uuid AND "docType" = $2::"OrgDocumentType"',
                org_id, doc_type,
            )
        else:
            result = await conn.execute(
                'DELETE FROM "OrgDocument" WHERE "organizationId" = $1::uuid',
                org_id,
            )
    deleted = int(result.split()[-1]) if result else 0
    return DeleteResponse(deleted=deleted)
