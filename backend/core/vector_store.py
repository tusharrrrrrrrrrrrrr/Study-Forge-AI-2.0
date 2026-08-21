"""
Vector Store — ChromaDB wrapper for storing and querying document embeddings.
"""

import chromadb
import os
from core.gemini_client import get_gemini_client
from core.chunker import TextChunk


class VectorStore:
    """Manages ChromaDB collections for document embeddings."""

    def __init__(self, persist_dir: str = None):
        if persist_dir is None:
            persist_dir = os.path.join(os.path.dirname(__file__), "..", "data", "chroma")
        os.makedirs(persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.gemini = get_gemini_client()

    def _collection_name(self, workspace_id: str) -> str:
        """Generate a valid collection name from workspace_id."""
        # ChromaDB collection names must be 3-63 chars, alphanumeric + underscores/hyphens
        name = f"workspace_{workspace_id}"
        return name[:63]

    def index_chunks(self, workspace_id: str, doc_id: str, chunks: list[TextChunk]) -> int:
        """Embed and store chunks for a document in a workspace. Returns count of indexed chunks."""
        if not chunks:
            return 0

        collection_name = self._collection_name(workspace_id)

        collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        # Remove existing chunks for this specific doc_id if re-indexing
        try:
            collection.delete(where={"doc_id": doc_id})
        except Exception:
            pass

        # Generate embeddings
        texts = [chunk.text for chunk in chunks]
        embeddings = self.gemini.generate_embeddings(texts)

        # Prepare metadata
        ids = [f"chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "page_start": chunk.page_start,
                "page_end": chunk.page_end,
                "section": chunk.section,
                "chunk_index": chunk.chunk_index,
                "char_count": chunk.char_count,
                "doc_id": doc_id,
            }
            for chunk in chunks
        ]

        # Store in ChromaDB
        collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return len(chunks)

    def search(self, workspace_id: str, query: str, top_k: int = 5) -> list[dict]:
        """Search for relevant chunks using semantic similarity within a workspace."""
        collection_name = self._collection_name(workspace_id)

        try:
            collection = self.client.get_collection(collection_name)
        except Exception:
            return []

        # Generate query embedding
        query_embedding = self.gemini.generate_embeddings([query])[0]

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        # Format results
        chunks = []
        if results and results["documents"]:
            for i, doc_text in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i]
                distance = results["distances"][0][i]
                chunks.append({
                    "text": doc_text,
                    "page": meta["page_start"],
                    "page_end": meta.get("page_end", meta["page_start"]),
                    "section": meta.get("section", "Unknown"),
                    "relevance": round(1 - distance, 4),  # Convert distance to similarity
                    "doc_id": meta.get("doc_id"),
                })

        return chunks

    def get_all_chunks(self, workspace_id: str) -> list[dict]:
        """Retrieve all chunks for a workspace (used for full-document features)."""
        collection_name = self._collection_name(workspace_id)

        try:
            collection = self.client.get_collection(collection_name)
        except Exception:
            return []

        results = collection.get(
            include=["documents", "metadatas"],
        )

        chunks = []
        if results and results["documents"]:
            for i, doc_text in enumerate(results["documents"]):
                meta = results["metadatas"][i]
                chunks.append({
                    "text": doc_text,
                    "page": meta["page_start"],
                    "page_end": meta.get("page_end", meta["page_start"]),
                    "section": meta.get("section", "Unknown"),
                    "doc_id": meta.get("doc_id"),
                })

        # Sort by page number
        chunks.sort(key=lambda c: (c["page"], c.get("page_end", c["page"])))
        return chunks

    def delete_workspace(self, workspace_id: str):
        """Delete all data for a workspace."""
        collection_name = self._collection_name(workspace_id)
        try:
            self.client.delete_collection(collection_name)
        except Exception:
            pass

    def delete_document(self, workspace_id: str, doc_id: str):
        """Delete specific document chunks from a workspace collection."""
        collection_name = self._collection_name(workspace_id)
        try:
            collection = self.client.get_collection(collection_name)
            collection.delete(where={"doc_id": doc_id})
        except Exception:
            pass


# Singleton
_store = None


def get_vector_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store
