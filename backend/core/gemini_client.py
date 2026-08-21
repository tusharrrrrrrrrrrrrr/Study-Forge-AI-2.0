"""
AI-Powered PDF Study Assistant — Gemini API Client
Handles all communication with Google Gemini API for chat, summaries, flashcards, quizzes.
"""

import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()


class GeminiClient:
    """Wrapper around Google Gemini API for study assistant features."""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            raise ValueError(
                "GEMINI_API_KEY not set. Get a free key at https://ai.google.dev "
                "and add it to your .env file."
            )
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-3.6-flash"
        self.embedding_model = "gemini-embedding-2"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(self, prompt: str, system_instruction: str = None, temperature: float = 0.7, use_web_search: bool = False) -> str:
        """Generate text response from Gemini."""
        config = types.GenerateContentConfig(
            temperature=temperature,
        )
        if system_instruction:
            config.system_instruction = system_instruction
        if use_web_search:
            config.tools = [{"google_search": {}}]

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config,
        )
        return response.text

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_json(self, prompt: str, system_instruction: str = None, temperature: float = 0.4) -> dict | list:
        """Generate structured JSON response from Gemini."""
        config = types.GenerateContentConfig(
            temperature=temperature,
            response_mime_type="application/json",
        )
        if system_instruction:
            config.system_instruction = system_instruction

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config,
        )
        return json.loads(response.text)

    async def generate_with_context(
        self,
        query: str,
        context_chunks: list[dict],
        system_instruction: str = None,
        temperature: float = 0.5,
        use_web_search: bool = False,
    ) -> str:
        """Generate response using RAG context chunks."""
        context_text = "\n\n".join(
            f"[Page {c['page']}, Section: {c.get('section', 'Unknown')}]\n{c['text']}"
            for c in context_chunks
        )

        prompt = f"""Use the following document excerpts to answer the question. 
Always cite the page number when referencing information.
If the answer is not found in the excerpts, say so honestly.

--- DOCUMENT EXCERPTS ---
{context_text}

--- QUESTION ---
{query}"""

        return await self.generate(
            prompt, 
            system_instruction=system_instruction, 
            temperature=temperature,
            use_web_search=use_web_search
        )

    async def generate_json_with_context(
        self,
        prompt: str,
        context_chunks: list[dict],
        system_instruction: str = None,
        temperature: float = 0.4,
    ) -> dict | list:
        """Generate structured JSON using RAG context chunks."""
        context_text = "\n\n".join(
            f"[Page {c['page']}, Section: {c.get('section', 'Unknown')}]\n{c['text']}"
            for c in context_chunks
        )

        full_prompt = f"""Use the following document excerpts as your source material.

--- DOCUMENT EXCERPTS ---
{context_text}

--- TASK ---
{prompt}"""

        return await self.generate_json(full_prompt, system_instruction=system_instruction, temperature=temperature)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a list of texts."""
        embeddings = []
        # Process in batches of 100 (API limit)
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            result = self.client.models.embed_content(
                model=self.embedding_model,
                contents=batch,
            )
            embeddings.extend([e.values for e in result.embeddings])
        return embeddings


# Singleton instance
_client = None


def get_gemini_client() -> GeminiClient:
    """Get or create the singleton Gemini client."""
    global _client
    if _client is None:
        _client = GeminiClient()
    return _client
