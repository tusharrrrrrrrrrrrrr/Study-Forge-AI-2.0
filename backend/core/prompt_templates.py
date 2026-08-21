"""
Prompt Templates — All LLM prompt templates for study features.
Carefully engineered for maximum quality and structured output.
"""


SYSTEM_CHAT = """You are an expert study assistant analyzing a document for a student. 
Your role is to help the student deeply understand the material.

Rules:
- Always cite specific page numbers when referencing content (e.g., "As explained on page 12...")
- If a question cannot be answered from the document, say so honestly
- Use clear, educational language appropriate for a student
- When explaining complex concepts, use analogies and examples
- Suggest related topics the student should explore in the document
- Format your responses with markdown for readability"""

SYSTEM_SUMMARY = """You are a study assistant that creates concise, well-structured summaries.
Your summaries should highlight the most important concepts, definitions, and relationships.
Always organize information hierarchically and use bullet points for clarity."""

SYSTEM_FLASHCARD = """You are an expert at creating educational flashcards from academic content.
Generate flashcards that test key concepts, definitions, formulas, and relationships.
Each flashcard should be self-contained and test one specific piece of knowledge."""

SYSTEM_QUIZ = """You are a quiz generator that creates challenging but fair questions from academic content.
Questions should test understanding, not just memorization.
Include a mix of difficulty levels and question types."""

SYSTEM_CONCEPTS = """You are an expert at identifying key concepts and their relationships in academic text.
Extract the most important entities, concepts, and how they relate to each other."""

SYSTEM_ELI5 = """You are a friendly teacher explaining complex topics to a curious 10-year-old.
Use simple language, fun analogies, and everyday examples.
Make learning feel exciting and accessible. Use emojis sparingly to keep it engaging."""

SYSTEM_MASTER_CONTEXT = """You are an expert AI tasked with creating a highly dense, comprehensive 'Master Context' summary of an academic or technical document.
Your goal is to extract the deepest level of insight, capturing all core themes, arguments, key facts, and essential nuances so that this summary can be used as the ultimate source of truth for future AI tasks.
Be extremely concise, structured, and informative. Do not use fluff."""

SYSTEM_VISUALS = """You are an expert educational designer specializing in visual learning and memory techniques.
Your goal is to extract the core workflow, process, or concept from academic text and transform it into a Mermaid.js diagram and a creative mnemonic device."""

SYSTEM_MOCK_EXAM = """You are a rigorous university professor generating a mock exam for your students.
Your goal is to test deep understanding, critical thinking, and synthesis of the provided material.
Create a well-balanced exam with a mix of multiple-choice, short answer, and essay questions."""

SYSTEM_MOCK_EXAM_GRADER = """You are a strict but fair professor grading a student's mock exam.
Evaluate their answers against the provided academic material.
Provide constructive feedback, correct any misconceptions, and assign a score based on accuracy and depth of understanding."""

def chat_prompt(query: str, context_chunks: list[dict], chat_history: list[dict] = None, master_context: str = "") -> str:
    """Build a chat prompt with RAG context and conversation history."""
    context_text = "\n\n".join(
        f"[Page {c['page']}, Section: {c.get('section', 'N/A')}]\n{c['text']}"
        for c in context_chunks
    )
    
    master_text = f"--- MASTER CONTEXT ---\n{master_context}\n" if master_context else ""

    history_text = ""
    if chat_history:
        history_text = "\n--- CONVERSATION HISTORY ---\n"
        for msg in chat_history[-6:]:  # Keep last 6 messages for context
            role = "Student" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"

    return f"""{history_text}
{master_text}
--- RELEVANT DOCUMENT EXCERPTS ---
{context_text}

--- STUDENT'S QUESTION ---
{query}

Provide a thorough, well-cited answer. After answering, suggest 2-3 follow-up questions the student might find helpful."""


def summary_prompt(text: str, mode: str = "full") -> str:
    """Build a summary prompt based on mode."""
    if mode == "eli5":
        return f"""Explain the following content as if you're talking to a curious 10-year-old.
Use simple words, fun analogies, and everyday examples.

--- CONTENT ---
{text}

Create an engaging, easy-to-understand explanation with:
- A one-sentence "big idea"
- 3-5 key points explained simply
- A fun analogy or example for the hardest concept
- A "Did you know?" fun fact if possible"""

    if mode == "chapter":
        return f"""Create a chapter-by-chapter summary of this content.
For each chapter/section, provide:
- Section title
- 3-5 key takeaways
- Important definitions or formulas
- How it connects to other sections

--- CONTENT ---
{text}"""

    if mode == "key_terms":
        return f"""Extract and define all key terms, definitions, and important vocabulary from this content.

--- CONTENT ---
{text}

For each term, provide:
- The term
- A clear, concise definition
- The page/section where it appears
- Why it's important

Format as a structured glossary."""

    # Default: full summary
    return f"""Create a comprehensive study summary of the following content.

--- CONTENT ---
{text}

Include:
1. **Overview** — What is this document about? (2-3 sentences)
2. **Key Themes** — The 3-5 main themes or arguments
3. **Important Concepts** — Key ideas, definitions, and theories
4. **Key Takeaways** — The most important points a student must remember
5. **Connections** — How the main ideas relate to each other

Use bullet points and clear formatting for easy studying."""


def flashcard_prompt(text: str, count: int = 10, difficulty: str = "mixed") -> str:
    """Build a prompt for generating flashcards."""
    diff_instruction = ""
    if difficulty == "easy":
        diff_instruction = "Focus on basic definitions and simple recall."
    elif difficulty == "hard":
        diff_instruction = "Focus on application, analysis, and connecting multiple concepts."
    else:
        diff_instruction = "Include a mix of easy (definitions), medium (explanations), and hard (application) cards."

    return f"""Generate exactly {count} flashcards from the following content.
{diff_instruction}

--- CONTENT ---
{text}

Return a JSON array where each flashcard has:
{{
    "front": "The question or prompt",
    "back": "The answer or explanation",
    "type": "definition" | "concept" | "application" | "formula",
    "difficulty": "easy" | "medium" | "hard",
    "source_page": <page number or null>,
    "topic": "Brief topic label"
}}

Make sure:
- Each card tests ONE specific concept
- Answers are concise but complete
- Include the source page when identifiable
- Cover the most important content first"""


def quiz_prompt(text: str, count: int = 10, difficulty: str = "mixed") -> str:
    """Build a prompt for generating quiz questions."""
    diff_instruction = ""
    if difficulty == "easy":
        diff_instruction = "Focus on recall and basic understanding."
    elif difficulty == "hard":
        diff_instruction = "Focus on analysis, synthesis, and application of concepts."
    else:
        diff_instruction = "Include a mix of easy, medium, and hard questions."

    return f"""Generate exactly {count} quiz questions from the following content.
{diff_instruction}

--- CONTENT ---
{text}

Return a JSON array where each question has:
{{
    "question": "The question text",
    "type": "mcq" | "true_false" | "short_answer",
    "options": ["A", "B", "C", "D"] (only for mcq, null otherwise),
    "correct_answer": "The correct answer",
    "explanation": "Why this is the correct answer, citing the source",
    "difficulty": "easy" | "medium" | "hard",
    "source_page": <page number or null>,
    "topic": "Brief topic label"
}}

For MCQ questions:
- Provide exactly 4 options
- Make distractors plausible but clearly wrong
- Only one correct answer

For True/False:
- Make statements that test understanding, not trivial facts
- correct_answer should be "True" or "False"

For Short Answer:
- Ask questions requiring 1-3 sentence answers
- correct_answer should be a model answer"""


def concepts_prompt(text: str) -> str:
    """Build a prompt for extracting concept relationships."""
    return f"""Analyze the following content and extract the key concepts and their relationships.

--- CONTENT ---
{text}

Return a JSON object with:
{{
    "concepts": [
        {{
            "id": "unique_id",
            "label": "Concept Name",
            "description": "Brief description",
            "importance": "high" | "medium" | "low"
        }}
    ],
    "relationships": [
        {{
            "source": "concept_id_1",
            "target": "concept_id_2",
            "label": "relationship description (e.g., 'causes', 'is part of', 'depends on')"
        }}
    ]
}}

Rules:
- Extract 8-15 key concepts
- Identify meaningful relationships between them
- Focus on the most important and interconnected ideas
- Use clear, descriptive relationship labels"""


def master_context_prompt(new_content: str, existing_context: str = None) -> str:
    """Build a prompt to generate or merge the master context."""
    if existing_context:
        return f"""Merge the new content below into the existing Master Context. 
Ensure the resulting Master Context is a cohesive, comprehensive summary of ALL information combined.
Do not lose any critical details from the existing context.

--- EXISTING MASTER CONTEXT ---
{existing_context}

--- NEW CONTENT ---
{new_content}

--- INSTRUCTIONS ---
Output the newly merged Master Context. Use clear headings, bullet points, and dense informational structuring."""
    else:
        return f"""Create a highly dense and comprehensive Master Context of the following content.
Capture the overarching narrative, key concepts, critical facts, and core arguments.
This will be used as the foundational knowledge base for an AI study assistant.

--- CONTENT ---
{new_content}

--- INSTRUCTIONS ---
Output the Master Context using clear headings, bullet points, and dense informational structuring."""


def visuals_prompt(text: str, topic: str = None) -> str:
    """Build a prompt for generating mermaid diagrams and mnemonics."""
    topic_str = f"\nFocus specifically on the topic: {topic}\n" if topic else ""
    return f"""Analyze the following content and generate a Mermaid.js diagram and a mnemonic device.
{topic_str}
--- CONTENT ---
{text}

Return a JSON object with:
{{
    "mermaid_code": "Valid mermaid.js code (e.g. graph TD\\n A-->B;). Do not use markdown backticks in this field.",
    "mnemonic": "A creative memory trick (acronym, story, rhyme, or memory palace) to remember the key points.",
    "explanation": "A brief explanation of how to read the diagram and use the mnemonic."
}}

Rules for Mermaid:
- Use graph TD or flowchart LR.
- Keep node labels concise.
- Ensure the syntax is completely valid Mermaid code. Do not wrap it in ```mermaid ... ``` blocks."""


def mock_exam_prompt(text: str, duration_minutes: int) -> str:
    """Build a prompt for generating a mock exam."""
    q_count = max(5, duration_minutes // 3)
    return f"""Generate a {duration_minutes}-minute mock exam based on the following material.
Target around {q_count} total questions.

--- CONTENT ---
{text}

Return a JSON object with a "questions" array. Each question should have:
{{
    "question": "The question text",
    "type": "mcq" | "short_answer" | "essay",
    "options": ["A", "B", "C", "D"] (only if type is mcq, otherwise null),
    "points": 1 (for mcq) | 5 (for short_answer) | 10 (for essay)
}}

Mix the types: approx 60% mcq, 30% short_answer, 10% essay."""


def mock_exam_grading_prompt(text: str, questions_and_answers: list[dict]) -> str:
    """Build a prompt for grading a mock exam submission."""
    qa_text = "\\n\\n".join([
        f"Q{i}: {qa['question']}\\nType: {qa['type']}\\nMax Points: {qa['points']}\\nStudent Answer: {qa['user_answer']}"
        for i, qa in enumerate(questions_and_answers)
    ])
    
    return f"""Grade the following student exam submission based on the provided source material.

--- SOURCE MATERIAL ---
{text}

--- STUDENT SUBMISSION ---
{qa_text}

Return a JSON array of grading results. Each object must have:
{{
    "question_index": <the integer index from the submission>,
    "question": "The original question",
    "user_answer": "The student's answer",
    "correct_answer": "The ideal, correct answer according to the text",
    "score": <integer score awarded (0 to Max Points)>,
    "max_score": <Max Points>,
    "feedback": "Specific feedback explaining the grade and correcting any mistakes"
}}"""
