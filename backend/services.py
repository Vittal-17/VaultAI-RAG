import io
from pypdf import PdfReader
from google import genai
import os
from google.genai import types
from dotenv import load_dotenv
from database import collection
from openai import OpenAI

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

gorouter_client = OpenAI(
    api_key=os.getenv("GOROUTER_API_KEY"),
    base_url="https://api.justwoker.icu/v1",
)

def extract_text_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """Extracts text from a PDF file page by page, preserving metadata."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages_data = []
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text and page_text.strip():
            pages_data.append({"page": i + 1, "text": page_text})
    return pages_data

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Splits text into chunks of `chunk_size` characters with an `overlap`."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

async def process_and_store_document(filename: str, pdf_bytes: bytes, user_email: str):
    """Extracts text, chunks it, generates embeddings, and stores in MongoDB."""
    pages_data = extract_text_from_pdf(pdf_bytes)
    if not pages_data:
        raise ValueError("Could not extract text from PDF.")

    for page_info in pages_data:
        chunks = chunk_text(page_info["text"])
        for i, chunk in enumerate(chunks):
            try:
                # Generate embedding using text-embedding-004 via the gemini client
                response = client.models.embed_content(
                    model='gemini-embedding-001',
                    contents=chunk,
                    config=types.EmbedContentConfig(
                        output_dimensionality=768
                    ),
                )
                embedding = response.embeddings[0].values

                doc = {
                    "filename": filename,
                    "page": page_info["page"],
                    "chunk_index": i,
                    "text": chunk,
                    "embedding": embedding,
                    "user_email": user_email
                }
                await collection.insert_one(doc)
            except Exception as e:
                print(f"Error processing chunk {i} of page {page_info['page']} from {filename}: {e}")
                raise e

async def generate_chat_response(query: str, user_email: str) -> str:
    """Searches MongoDB for relevant chunks, isolates tenant data, and formats a sourced response."""
    try:
        # Generate embedding for the query
        query_response = client.models.embed_content(
            model='gemini-embedding-001',
            contents=query,
            config=types.EmbedContentConfig(
                output_dimensionality=768
            ),
        )
        query_embedding = query_response.embeddings[0].values

        # Query database for all unique filenames belonging to the user efficiently
        all_filenames = await collection.distinct("filename", {"user_email": user_email})
        
        # Filename Intent Detection
        query_lower = query.lower()
        target_filename = None
        for fname in all_filenames:
            if fname.lower() in query_lower:
                target_filename = fname
                break

        # Dynamic Vector Search Filtering
        vector_filter = {
            "user_email": {"$eq": user_email}
        }
        if target_filename:
            vector_filter["filename"] = {"$eq": target_filename}

        # MongoDB Atlas Vector Search Pipeline with strict multi-tenant isolation
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 50,
                    "limit": 5,
                    "filter": vector_filter
                }
            },
            {
                "$project": {
                    "text": 1,
                    "filename": 1,
                    "page": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]

        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=5)

        context_parts = []
        for res in results:
            filename = res.get('filename', 'Unknown File')
            page = res.get('page', 1)
            context_parts.append(f"Source: {filename} (Page {page})\nContext: {res.get('text')}")

        context = "\n\n".join(context_parts)

        prompt = f"""You are VaultAI, a precise and highly analytical knowledge assistant.
The user has access to the following files in their Knowledge Base: {all_filenames}

Answer the user's question explicitly relying on the provided context chunks below. 
Do not hallucinate external information. If the answer is not in the context, state that you do not have enough information.

Context:
{context}

Question:
{query}
"""

        # Generate response using GoRouter
        response = gorouter_client.chat.completions.create(
            model="claude-opus-4-8",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.2,
        )

        answer = response.choices[0].message.content.strip()

        # Atomically bundle answer and formatted citations using smart precision filtering
        citations = []
        for i, res in enumerate(results):
            filename = res.get('filename', 'Unknown File')
            page = res.get('page', 1)
            # Append if it's the top result OR if the LLM actually utilized the source
            if i == 0 or filename in answer:
                citation_str = f"- **{filename}** (Page {page})"
                if citation_str not in citations:
                    citations.append(citation_str)

        if citations:
            answer += "\n\n### 📚 Sources:\n" + "\n".join(citations)

        return answer

    except Exception as e:
        print(f"Error in chat generation: {e}")
        raise e

async def generate_auto_title(query: str) -> str:
    """Generates a short punchy title based on the first query."""
    try:
        title_response = gorouter_client.chat.completions.create(
            model="claude-opus-4-8",
            messages=[{
                "role": "user",
                "content": (
                    "Summarize this user prompt into a short, punchy 3-5 word chat title."
                    f" Do not use quotes.\n\nPrompt: {query}"
                ),
            }],
            max_tokens=30,
        )
        return title_response.choices[0].message.content.strip().replace('"', "").replace("'", "")
    except Exception as e:
        print(f"Error in auto-title: {e}")
        return "New Conversation"
