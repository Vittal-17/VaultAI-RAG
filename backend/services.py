import io
from pypdf import PdfReader
from google import genai
import os
from google.genai import types
from dotenv import load_dotenv
from database import collection

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

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

async def process_and_store_document(filename: str, pdf_bytes: bytes):
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
                "embedding": embedding
            }
            await collection.insert_one(doc)
        except Exception as e:
            print(f"Error processing chunk {i} of {filename}: {e}")
            raise e

async def generate_chat_response(query: str) -> str:
    """Searches MongoDB for relevant chunks and generates a response using Gemini."""
    try:
        # Generate embedding for the query
        query_response = client.models.embed_content(
            model='gemini-embedding-001',
            contents=query,
            config=types.EmbedContentConfig(output_dimensionality=768),
        )
        query_embedding = query_response.embeddings[0].values

        # MongoDB Atlas Vector Search Pipeline
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 50,
                    "limit": 4
                }
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
            context_parts.append(f"Source: {res.get('filename')}\\nContext: {res.get('text')}")

        context = "\\n\\n".join(context_parts)

        prompt = f"""You are a helpful AI assistant. Answer the user's question based on the provided context. If the context does not contain the answer, say "I cannot answer this based on the provided documents."

Context:
{context}

Question:
{query}
"""

        # Generate response using gemini-2.5-flash
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
        )
        return response.text

    except Exception as e:
        print(f"Error in chat generation: {e}")
        raise e
