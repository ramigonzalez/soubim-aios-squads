"""Unit tests for DocumentProcessor — PDF and DOCX text extraction.

Story 10.2: Document Ingestion (PDF & DOCX)
"""

import io
import pytest

from app.services.document_processor import DocumentProcessor


@pytest.fixture
def processor():
    return DocumentProcessor()


# ──────────────────────────────────────────────────────────────────────────────
# PDF extraction tests
# ──────────────────────────────────────────────────────────────────────────────


def _make_pdf(text_pages: list[str]) -> bytes:
    """Create a simple PDF in memory with one text block per page."""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    for page_text in text_pages:
        c.drawString(72, 700, page_text)
        c.showPage()
    c.save()
    return buf.getvalue()


def test_pdf_single_page(processor):
    """Extract text from a single-page PDF."""
    pdf_bytes = _make_pdf(["Meeting notes for structural review."])
    text = processor.extract_text(pdf_bytes, "pdf")
    assert "Meeting notes" in text
    assert "structural review" in text


def test_pdf_multi_page(processor):
    """Extract text from a multi-page PDF, joining pages with double newline."""
    pdf_bytes = _make_pdf(["Page one content.", "Page two content.", "Page three content."])
    text = processor.extract_text(pdf_bytes, "pdf")
    assert "Page one content" in text
    assert "Page two content" in text
    assert "Page three content" in text


def test_pdf_empty_pages(processor):
    """A PDF with only blank pages returns empty string."""
    # Create a PDF with empty pages
    buf = io.BytesIO()
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    c = canvas.Canvas(buf, pagesize=letter)
    c.showPage()
    c.showPage()
    c.save()
    text = processor.extract_text(buf.getvalue(), "pdf")
    assert text == ""


def test_pdf_invalid_content(processor):
    """Invalid bytes should return empty string, not raise."""
    text = processor.extract_text(b"this is not a pdf", "pdf")
    assert text == ""


# ──────────────────────────────────────────────────────────────────────────────
# DOCX extraction tests
# ──────────────────────────────────────────────────────────────────────────────


def _make_docx(paragraphs: list[str]) -> bytes:
    """Create a simple DOCX in memory with the given paragraph texts."""
    from docx import Document

    doc = Document()
    for para_text in paragraphs:
        doc.add_paragraph(para_text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def test_docx_single_paragraph(processor):
    """Extract text from a DOCX with one paragraph."""
    docx_bytes = _make_docx(["Design review meeting minutes."])
    text = processor.extract_text(docx_bytes, "docx")
    assert "Design review meeting minutes" in text


def test_docx_multiple_paragraphs(processor):
    """Extract text preserving paragraph separation."""
    docx_bytes = _make_docx(["First paragraph.", "Second paragraph.", "Third paragraph."])
    text = processor.extract_text(docx_bytes, "docx")
    assert "First paragraph" in text
    assert "Second paragraph" in text
    assert "Third paragraph" in text
    # Paragraphs separated by double newlines
    assert "\n\n" in text


def test_docx_skips_empty_paragraphs(processor):
    """Empty or whitespace-only paragraphs are excluded."""
    docx_bytes = _make_docx(["Content", "", "   ", "More content"])
    text = processor.extract_text(docx_bytes, "docx")
    assert "Content" in text
    assert "More content" in text
    # Should not have triple newlines from blank paras
    assert "\n\n\n" not in text


def test_docx_invalid_content(processor):
    """Invalid bytes should return empty string, not raise."""
    text = processor.extract_text(b"not a docx file at all", "docx")
    assert text == ""


# ──────────────────────────────────────────────────────────────────────────────
# General / edge-case tests
# ──────────────────────────────────────────────────────────────────────────────


def test_empty_content(processor):
    """Empty bytes should return empty string for any type."""
    assert processor.extract_text(b"", "pdf") == ""
    assert processor.extract_text(b"", "docx") == ""


def test_unsupported_file_type(processor):
    """Unsupported file types return empty string."""
    assert processor.extract_text(b"some content", "txt") == ""
    assert processor.extract_text(b"some content", "xlsx") == ""
    assert processor.extract_text(b"some content", "jpg") == ""


def test_case_insensitive_file_type(processor):
    """File type matching is case-insensitive."""
    docx_bytes = _make_docx(["Hello world"])
    text = processor.extract_text(docx_bytes, "DOCX")
    assert "Hello world" in text


def test_supported_types_constant(processor):
    """Verify SUPPORTED_TYPES includes pdf and docx."""
    assert "pdf" in processor.SUPPORTED_TYPES
    assert "docx" in processor.SUPPORTED_TYPES
