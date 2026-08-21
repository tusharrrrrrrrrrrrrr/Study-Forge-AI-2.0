"""
Smart Chunker — Section-aware text chunking for RAG pipeline.
Respects heading boundaries and maintains context overlap.
"""

import re
from dataclasses import dataclass
from core.pdf_processor import PDFDocument, PageContent


@dataclass
class TextChunk:
    """A chunk of text with metadata for embedding."""
    text: str
    page_start: int
    page_end: int
    section: str
    chunk_index: int
    char_count: int

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "section": self.section,
            "chunk_index": self.chunk_index,
            "char_count": self.char_count,
        }


class SmartChunker:
    """
    Section-aware text chunker that:
    1. Splits on heading/section boundaries first
    2. Falls back to paragraph-level splitting for long sections
    3. Maintains overlap between chunks for context continuity
    """

    def __init__(
        self,
        max_chunk_size: int = 1500,
        overlap_size: int = 200,
        min_chunk_size: int = 100,
    ):
        self.max_chunk_size = max_chunk_size
        self.overlap_size = overlap_size
        self.min_chunk_size = min_chunk_size

    def chunk_document(self, pdf_doc: PDFDocument) -> list[TextChunk]:
        """Chunk a full PDF document into RAG-ready text chunks."""
        # Step 1: Group pages into sections based on headings/TOC
        sections = self._identify_sections(pdf_doc)

        # Step 2: Chunk each section
        chunks = []
        chunk_index = 0

        for section in sections:
            section_chunks = self._chunk_section(
                text=section["text"],
                section_name=section["name"],
                page_start=section["page_start"],
                page_end=section["page_end"],
                start_index=chunk_index,
            )
            chunks.extend(section_chunks)
            chunk_index += len(section_chunks)

        return chunks

    def _identify_sections(self, pdf_doc: PDFDocument) -> list[dict]:
        """Group pages into logical sections using headings and TOC."""
        sections = []
        current_section = {
            "name": pdf_doc.title or "Document Start",
            "text": "",
            "page_start": 1,
            "page_end": 1,
        }

        for page in pdf_doc.pages:
            # Check if page has a heading that starts a new section
            if page.headings and current_section["text"].strip():
                # Save current section
                sections.append(current_section)
                # Start new section
                current_section = {
                    "name": page.headings[0],
                    "text": page.text,
                    "page_start": page.page_number,
                    "page_end": page.page_number,
                }
            else:
                # Append to current section
                current_section["text"] += "\n\n" + page.text
                current_section["page_end"] = page.page_number

        # Don't forget the last section
        if current_section["text"].strip():
            sections.append(current_section)

        return sections

    def _chunk_section(
        self,
        text: str,
        section_name: str,
        page_start: int,
        page_end: int,
        start_index: int,
    ) -> list[TextChunk]:
        """Chunk a section into appropriately-sized pieces."""
        text = text.strip()
        if not text:
            return []

        # If the section fits in one chunk, return as-is
        if len(text) <= self.max_chunk_size:
            return [
                TextChunk(
                    text=text,
                    page_start=page_start,
                    page_end=page_end,
                    section=section_name,
                    chunk_index=start_index,
                    char_count=len(text),
                )
            ]

        # Split by paragraphs first
        paragraphs = re.split(r"\n\s*\n", text)
        chunks = []
        current_text = ""
        chunk_idx = start_index

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # If adding this paragraph exceeds max size, save current chunk
            if current_text and len(current_text) + len(para) + 2 > self.max_chunk_size:
                chunks.append(
                    TextChunk(
                        text=current_text.strip(),
                        page_start=page_start,
                        page_end=page_end,
                        section=section_name,
                        chunk_index=chunk_idx,
                        char_count=len(current_text.strip()),
                    )
                )
                chunk_idx += 1
                # Keep overlap from end of previous chunk
                overlap = current_text[-self.overlap_size :] if len(current_text) > self.overlap_size else ""
                current_text = overlap + "\n\n" + para
            else:
                current_text += ("\n\n" if current_text else "") + para

        # Handle last chunk
        if current_text.strip() and len(current_text.strip()) >= self.min_chunk_size:
            chunks.append(
                TextChunk(
                    text=current_text.strip(),
                    page_start=page_start,
                    page_end=page_end,
                    section=section_name,
                    chunk_index=chunk_idx,
                    char_count=len(current_text.strip()),
                )
            )
        elif current_text.strip() and chunks:
            # Merge too-small last chunk with previous
            chunks[-1] = TextChunk(
                text=chunks[-1].text + "\n\n" + current_text.strip(),
                page_start=chunks[-1].page_start,
                page_end=page_end,
                section=section_name,
                chunk_index=chunks[-1].chunk_index,
                char_count=len(chunks[-1].text) + len(current_text.strip()) + 2,
            )

        return chunks
