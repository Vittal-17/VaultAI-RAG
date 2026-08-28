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
    base_url="https://gorouter.app/v1/",
)

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts text from a PDF file."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

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
    text = extract_text_from_pdf(pdf_bytes)
    if not text.strip():
        raise ValueError("Could not extract text from PDF.")

    chunks = chunk_text(text)

    for i, chunk in enumerate(chunks):
        try:
            # Generate embedding using text-embedding-004
            response = client.models.embed_content(
                model='gemini-embedding-001',
                contents=chunk,
                config=types.EmbedContentConfig(
                        output_dimensionality=768
                    ),
            )
            # The gemini client returns an EmbedContentResponse object, the embeddings are in it
            embedding = response.embeddings[0].values

            doc = {
                "filename": filename,
                "chunk_index": i,
                "text": chunk,
                "embedding": embedding,
                "user_email": user_email
            }
            await collection.insert_one(doc)
        except Exception as e:
            print(f"Error processing chunk {i} of {filename}: {e}")
            raise e

async def generate_chat_response(query: str, user_email: str) -> str:
    """Searches MongoDB for relevant chunks and generates a response using Gemini."""
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

        # Query database for all unique filenames belonging to the user
        all_docs_cursor = collection.find({"user_email": user_email}, {"filename": 1, "_id": 0})
        all_docs = await all_docs_cursor.to_list(length=None)
        all_filenames = list(set(doc.get("filename") for doc in all_docs if doc.get("filename")))

        # MongoDB Atlas Vector Search Pipeline
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 50,
                    "limit": 10
                }
            },
            {
                "$match": {
                    "user_email": user_email
                }
            },
            {
                "$limit": 4
            },
            {
                "$project": {
                    "text": 1,
                    "filename": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]

        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=4)

        context_parts = []
        for res in results:
            context_parts.append(f"Source: {res.get('filename')}\nContext: {res.get('text')}")

        context = "\n\n".join(context_parts)

        prompt = f"""You are VaultAI, a helpful knowledge assistant.
The user has access to the following files in their Knowledge Base: {all_filenames}

Answer the user's question using the provided context chunks below. If they ask what files you have access to, list all files from the Knowledge Base list above.

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
            temperature=0.7,
        )
        return response.choices[0].message.content

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
