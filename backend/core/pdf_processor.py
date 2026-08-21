"""
PDF Processor — Extracts text, images, and structure from PDFs using PyMuPDF.
"""

import fitz  # PyMuPDF
import os
import re
from dataclasses import dataclass, field


@dataclass
class PageContent:
    """Represents extracted content from a single PDF page."""
    page_number: int
    text: str
    headings: list[str] = field(default_factory=list)
    has_images: bool = False
    has_tables: bool = False


@dataclass
class PDFDocument:
    """Represents a fully processed PDF document."""
    filename: str
    filepath: str
    total_pages: int
    pages: list[PageContent]
    title: str = ""
    author: str = ""
    toc: list[dict] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        return "\n\n".join(p.text for p in self.pages if p.text.strip())


class PDFProcessor:
    """Extracts structured content from PDF files."""

    # Patterns that suggest a heading
    HEADING_PATTERNS = [
        r"^(?:Chapter|CHAPTER)\s+\d+",
        r"^\d+\.\d*\s+[A-Z]",
        r"^[A-Z][A-Z\s]{4,}$",
        r"^(?:Introduction|Conclusion|Summary|Abstract|References|Bibliography|Appendix)",
    ]

    def process(self, filepath: str) -> PDFDocument:
        """Process a PDF file and extract all content."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"PDF not found: {filepath}")

        doc = fitz.open(filepath)
        filename = os.path.basename(filepath)

        # Extract metadata
        metadata = doc.metadata or {}
        title = metadata.get("title", "") or filename.replace(".pdf", "")
        author = metadata.get("author", "")

        # Extract table of contents
        toc = []
        raw_toc = doc.get_toc()
        for level, heading, page_num in raw_toc:
            toc.append({
                "level": level,
                "title": heading,
                "page": page_num,
            })

        # Extract page content
        pages = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_content = self._extract_page(page, page_num + 1)
            pages.append(page_content)

        doc.close()

        return PDFDocument(
            filename=filename,
            filepath=filepath,
            total_pages=len(pages),
            pages=pages,
            title=title,
            author=author,
            toc=toc,
        )

    def _extract_page(self, page: fitz.Page, page_number: int) -> PageContent:
        """Extract content from a single page."""
        # Get text with layout preservation
        text = page.get_text("text")

        # Clean up the text
        text = self._clean_text(text)

        # Detect headings
        headings = self._detect_headings(text)

        # Check for images
        has_images = len(page.get_images()) > 0

        # Check for tables (heuristic: look for tab-separated or grid-like content)
        has_tables = self._detect_tables(text)

        return PageContent(
            page_number=page_number,
            text=text,
            headings=headings,
            has_images=has_images,
            has_tables=has_tables,
        )

    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        # Remove excessive whitespace but preserve paragraph breaks
        lines = text.split("\n")
        cleaned_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped:
                cleaned_lines.append(stripped)
            elif cleaned_lines and cleaned_lines[-1] != "":
                cleaned_lines.append("")

        return "\n".join(cleaned_lines)

    def _detect_headings(self, text: str) -> list[str]:
        """Detect likely headings in the text."""
        headings = []
        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue
            for pattern in self.HEADING_PATTERNS:
                if re.match(pattern, line):
                    headings.append(line)
                    break
        return headings

    def _detect_tables(self, text: str) -> bool:
        """Heuristic detection of table-like content."""
        lines = text.split("\n")
        tab_lines = sum(1 for line in lines if "\t" in line or line.count("  ") >= 3)
        return tab_lines >= 3
