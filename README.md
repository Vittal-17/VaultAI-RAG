# CYPHR - Full Stack RAG Application

CYPHR is a production-ready Retrieval-Augmented Generation (RAG) application. It features a Python FastAPI backend, MongoDB Atlas for vector storage and search, and a React (Vite + Tailwind) frontend. It utilizes the Google Gemini API for both document embedding and intelligent text generation.

## Features

- **Document Upload**: Upload PDF files directly from the UI.
- **Text Processing**: Automatic text extraction and chunking of uploaded PDFs.
- **Vector Search**: Embeddings are generated using Gemini `text-embedding-004` and stored in MongoDB Atlas, with semantic search powered by `$vectorSearch`.
- **Intelligent Chat**: Get conversational answers to your questions based on the document context using Gemini `gemini-2.5-flash`.
- **Modern UI**: A sleek, responsive split-screen React frontend styled with Tailwind CSS.

## Architecture

- **Backend**: Python 3.10+, FastAPI, Async Motor (MongoDB driver), PyPDF, Google GenAI SDK.
- **Database**: MongoDB Atlas (Vector Search enabled).
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Axios.

## Prerequisites

1. **MongoDB Atlas Account**: You need a cluster with Vector Search configured.
    - Create a database called `vault_ai` and a collection called `documents`.
    - Create a Vector Search index named `vector_index` on the `documents` collection with the path `embedding`.
2. **Google Gemini API Key**: Get an API key from Google AI Studio.
3. **Node.js**: Installed for the frontend (v18+ recommended).
4. **Python**: Installed for the backend (v3.10+ recommended).

## Setup Instructions

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

Create a `.env` file in the `backend` directory based on `.env.example`:

```env
MONGODB_URI="your_mongodb_atlas_connection_string"
GEMINI_API_KEY="your_gemini_api_key"
MONGODB_DB_NAME="vault_ai"
MONGODB_COLLECTION_NAME="documents"
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

Navigate to `http://localhost:5173` in your browser to start using CYPHR!
