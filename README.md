# CYPHR-RAG v0.1.0

CYPHR-RAG is a production-ready Retrieval-Augmented Generation (RAG) application. It features a robust Python FastAPI backend, MongoDB Atlas for vector storage and semantic search, and a modern React frontend (Vite + Tailwind) with comprehensive light, dark, and system themes.

## Features

### Document & Knowledge Management
- **Document Ingestion**: Upload and process PDF files directly from the UI.
- **Text Extraction & Chunking**: Automatic parsing and token-aware chunking for high-fidelity retrieval.
- **Vector Search**: Embeddings are generated using **Jina Embeddings v3** and stored in MongoDB Atlas, with lightning-fast semantic search powered by `$vectorSearch`.
- **Intelligent Chat**: Get conversational answers to your questions based on the document context, complete with precise source citations.

### Language Model Provider Registry
CYPHR-RAG utilizes a dynamic server-side LLM provider registry, allowing flexible runtime configuration of providers and models.
- **Currently Configured Providers**: Groq, TokenForge, GoRouter, Conduit, JustWorker, TabiToken.
- **Provider/Model Selection**: Users can seamlessly switch between enabled models directly from the frontend UI.
- **Automatic Chat Titles**: Dedicated title generation using a lightweight model to keep chat history organized.
- *Note: The browser never receives provider API keys; all LLM communication routes securely through the backend.*

### Security & Authentication
- **User Authentication**: Secure email/password registration (with bcrypt hashing) and Google OAuth integration.
- **Tenant Isolation**: Strict user-level data isolation ensures users only have access to their own documents and chat histories.
- **Web Security**: Comprehensive CSRF protection, strict Origin validation, and secure HTTP-only cookies.
- **Rate Limiting**: Built-in tiered rate limiting to prevent abuse of the LLM and upload endpoints.
- **Safe Error Boundaries**: Graceful error handling prevents leaking internal system details to the client.

### Modern Frontend Experience
- **Responsive UI**: A sleek, fully mobile-responsive split-screen React frontend.
- **Theming**: Premium "Ice Blue" aesthetic with Light, Dark, and System theme synchronization.
- **Markdown & Code Rendering**: Full support for rich text, code blocks, and source citations inside the chat.

## Architecture

- **Backend**: Python 3.10+, FastAPI, Async Motor (MongoDB driver), PyPDF, Jina Embeddings, OpenAI-compatible SDK for LLMs.
- **Database**: MongoDB Atlas (with Vector Search enabled).
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons.

## Setup Instructions

### Prerequisites
1. **MongoDB Atlas Account**: A cluster with Vector Search configured.
    - Create a database (e.g., `vault_ai`) and a collection for documents (e.g., `documents`).
    - Create a Vector Search index named `vector_index` on the documents collection.
2. **Jina API Key**: Required for document embedding.
3. **LLM Provider API Key(s)**: An API key for at least one configured provider (e.g., Groq).
4. **Google OAuth Credentials** (Optional): For Google Sign-In support.
5. **Node.js**: v18+ recommended.
6. **Python**: v3.10+ recommended.

### Environment Configuration

Create a `.env` file in the `backend` directory based on the following template. Be sure to replace placeholders with your actual secrets.

```env
# MongoDB Configuration
MONGODB_URI="YOUR_MONGODB_ATLAS_CONNECTION_STRING"
MONGODB_DB_NAME="vault_ai"
MONGODB_COLLECTION_NAME="documents"

# Embedding Configuration
EMBEDDING_PROVIDER="jina"
JINA_API_KEY="YOUR_JINA_API_KEY"

# Authentication & Security
ENVIRONMENT="development"  # set to "production" in production
JWT_SECRET_KEY="YOUR_SUPER_SECRET_KEY_MIN_32_CHARS"
JWT_ALGORITHM="HS256"
FRONTEND_URL="http://localhost:5173"
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"

# LLM Providers (Enable/Configure as needed)
LLM_DEFAULT_PROVIDER="groq"
LLM_DEFAULT_MODEL="openai/gpt-oss-20b"

LLM_GROQ_ENABLED="true"
GROQ_API_KEY="YOUR_GROQ_API_KEY"

LLM_TOKENFORGE_ENABLED="false"
# TOKENFORGE_API_KEY="YOUR_TOKENFORGE_KEY"

LLM_GOROUTER_ENABLED="false"
# GOROUTER_API_KEY="YOUR_GOROUTER_KEY"
```

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Navigate to `http://localhost:5173` in your browser. The frontend will communicate securely with the FastAPI backend at `http://localhost:8000`.

## Testing

The backend includes a comprehensive security and regression testing suite.

```bash
cd backend
pytest verify_security.py
```
*Current Baseline: 125 tests passed. Note: You may see ~14 deprecation warnings originating from the upstream `slowapi` dependency under modern Python environments; these are known and do not affect test integrity.*

## Production Deployment Architecture

- **Frontend**: Designed to be deployed on Vercel or similar static hosting platforms.
- **Backend**: Designed for Render, Railway, or standard Docker/VPS hosting. Requires the `ENVIRONMENT="production"` flag to strictly enforce SameSite cookie policies and origin validation.
- **Database**: MongoDB Atlas provides both the document store and the HNSW vector search index.
- **LLM/Embeddings**: Traffic originates securely from the backend to Jina and the enabled LLM providers.

## Roadmap & Planned Features

**v0.1.1**
- Admin-only runtime provider/model registry (UI configuration for LLMs).

**v0.2.0**
- Image ingestion support.
- Optical Character Recognition (OCR).
- Expanded document format support (DOCX, XLSX, etc.).

**Future Exploration**
- Automated provider/model capability discovery.
- Runtime health and model availability detection.
