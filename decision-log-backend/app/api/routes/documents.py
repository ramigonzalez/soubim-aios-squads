"""Document upload endpoints for PDF and DOCX ingestion.

Story 10.2: Document Ingestion (PDF & DOCX)
"""

import os
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Source
from app.database.session import get_db
from app.services.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_DOCUMENT_SIZE_MB = int(os.getenv("MAX_DOCUMENT_SIZE_MB", "10"))
MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024

ALLOWED_EXTENSIONS = {"pdf", "docx"}


def _get_user(request: Request):
    """Extract authenticated user from request state (set by auth middleware)."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


def _generate_summary(text: str) -> str:
    """Generate a one-line AI summary from extracted text using Claude.

    Falls back to a text truncation if the API call fails.
    """
    snippet = text[:2000]
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=100,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Summarize the following document excerpt in one concise sentence "
                        "(max 120 characters). Return ONLY the summary, no preamble.\n\n"
                        f"{snippet}"
                    ),
                }
            ],
        )
        summary = response.content[0].text.strip()
        return summary[:200]  # Safety cap
    except Exception as e:
        logger.warning(f"AI summary generation failed, using fallback: {e}")
        # Fallback: first 200 chars of extracted text
        return snippet[:200].strip() + ("..." if len(snippet) > 200 else "")


@router.post("/projects/{project_id}/documents")
async def upload_document(
    project_id: str,
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload a PDF or DOCX document for a project.

    Extracts text, generates AI summary, and creates a Source record
    with ingestion_status='pending' for admin review.

    Args:
        project_id: UUID of the project.
        file: Uploaded PDF or DOCX file.
        title: Optional title (defaults to filename).

    Returns:
        Source ID, status, and AI summary.
    """
    # Authenticate
    user = _get_user(request)

    # Validate file extension
    if not file.filename or "." not in file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have an extension (.pdf or .docx)",
        )

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PDF and DOCX files are supported. Got: .{ext}",
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds {MAX_DOCUMENT_SIZE_MB}MB limit",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # Extract text
    processor = DocumentProcessor()
    raw_text = processor.extract_text(content, ext)

    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract text from the uploaded document",
        )

    # Generate source ID before saving file
    source_id = uuid.uuid4()

    # Save file to disk
    file_path = f"uploads/documents/{project_id}/{source_id}.{ext}"
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    # Generate AI summary
    summary = _generate_summary(raw_text)

    # Create Source record
    source = Source(
        id=source_id,
        project_id=project_id,
        source_type="document",
        title=title or file.filename,
        raw_content=raw_text,
        file_url=file_path,
        file_type=ext,
        file_size=len(content),
        ai_summary=summary,
        ingestion_status="pending",
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    logger.info(
        f"Document uploaded: source_id={source_id}, project={project_id}, "
        f"type={ext}, size={len(content)} bytes"
    )

    return {
        "source_id": str(source.id),
        "status": "pending",
        "ai_summary": summary,
    }
