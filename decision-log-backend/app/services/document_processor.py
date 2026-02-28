"""Document text extraction service for PDF and DOCX files.

Story 10.2: Document Ingestion (PDF & DOCX)
"""

import io
import logging

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Extracts text content from PDF and DOCX documents."""

    SUPPORTED_TYPES = ("pdf", "docx")

    def extract_text(self, content: bytes, file_type: str) -> str:
        """Extract text from a document based on file type.

        Args:
            content: Raw file bytes.
            file_type: Extension without dot, e.g. "pdf" or "docx".

        Returns:
            Extracted text or empty string if unsupported/empty.
        """
        if not content:
            return ""

        file_type = file_type.lower()

        if file_type == "pdf":
            return self._extract_pdf(content)
        elif file_type == "docx":
            return self._extract_docx(content)

        logger.warning(f"Unsupported file type for text extraction: {file_type}")
        return ""

    def _extract_pdf(self, content: bytes) -> str:
        """Extract text from all pages of a PDF document."""
        import pdfplumber

        text_parts = []
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
            return ""

        return "\n\n".join(text_parts)

    def _extract_docx(self, content: bytes) -> str:
        """Extract text from all paragraphs of a DOCX document."""
        from docx import Document

        try:
            doc = Document(io.BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {e}")
            return ""

        return "\n\n".join(paragraphs)
