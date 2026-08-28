from fastapi import FastAPI, UploadFile, File, HTTPException, Response, Depends, Cookie
from fastapi.middleware.cors import CORSMiddleware
from database import check_db_connection, users_collection, chats_collection, collection
from services import process_and_store_document, generate_chat_response, generate_auto_title
from auth import get_password_hash, verify_password, create_access_token, decode_access_token
import uvicorn
import uuid
from pydantic import BaseModel, EmailStr
from contextlib import asynccontextmanager
from datetime import datetime
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    await check_db_connection()
    yield

app = FastAPI(title="VaultAI Backend", lifespan=lifespan)

# Read environment variables
IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], # Update with frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    fullname: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChatRequest(BaseModel):
    message: str

async def get_current_user(access_token: str | None = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"email": user["email"], "fullname": user["fullname"]}

@app.post("/api/register")
async def register(request: RegisterRequest, response: Response):
    existing_user = await users_collection.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(request.password)
    user_doc = {
        "fullname": request.fullname,
        "email": request.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    await users_collection.insert_one(user_doc)
    
    access_token = create_access_token(data={"sub": request.email})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
        max_age=7 * 24 * 60 * 60
    )
    return {"message": "User registered successfully", "user": {"email": request.email, "fullname": request.fullname}}

@app.post("/api/login")
async def login(request: LoginRequest, response: Response):
    user = await users_collection.find_one({"email": request.email})
    if not user or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": request.email})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
        max_age=7 * 24 * 60 * 60
    )
    return {"message": "Login successful", "user": {"email": user["email"], "fullname": user["fullname"]}}

@app.post("/api/logout")
async def logout(response: Response):
  response.delete_cookie(
      "access_token", httponly=True, samesite="lax", secure=IS_PRODUCTION
  )
  response.delete_cookie(
      "csrftoken", samesite="lax", secure=IS_PRODUCTION
  )  # Clear CSRF too
  return {"message": "Logged out successfully"}

@app.get("/api/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

class ChatRequest(BaseModel):
    message: str
    chat_id: str | None = None

@app.get("/api/documents")
async def get_documents(current_user: dict = Depends(get_current_user)):
    # Aggregate unique filenames for this user
    pipeline = [
        {"$match": {"user_email": current_user["email"]}},
        {"$group": {"_id": "$filename"}}
    ]
    cursor = collection.aggregate(pipeline)
    docs = await cursor.to_list(length=None)
    return [{"filename": doc["_id"]} for doc in docs]

@app.delete("/api/documents/{filename}")
async def delete_document(filename: str, current_user: dict = Depends(get_current_user)):
    result = await collection.delete_many({"user_email": current_user["email"], "filename": filename})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

@app.get("/api/chats")
async def get_chats(current_user: dict = Depends(get_current_user)):
    cursor = chats_collection.find({"user_email": current_user["email"]}, {"messages": 0}).sort("created_at", -1)
    chats = await cursor.to_list(length=None)
    for chat in chats:
        chat["_id"] = str(chat["_id"])
    return chats

@app.post("/api/chats/new")
async def create_new_chat(current_user: dict = Depends(get_current_user)):
    chat_id = str(uuid.uuid4())
    chat_doc = {
        "chat_id": chat_id,
        "user_email": current_user["email"],
        "title": "New Conversation",
        "created_at": datetime.utcnow(),
        "messages": []
    }
    await chats_collection.insert_one(chat_doc)
    return {"chat_id": chat_id, "title": chat_doc["title"]}

@app.get("/api/chats/{chat_id}")
async def get_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await chats_collection.find_one({"chat_id": chat_id, "user_email": current_user["email"]}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        contents = await file.read()
        await process_and_store_document(file.filename, contents, current_user["email"])
        return {"message": f"Successfully processed and stored {file.filename}"}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

class TitleRequest(BaseModel):
    title: str

@app.patch("/api/chats/{chat_id}/title")
async def update_chat_title(chat_id: str, req: TitleRequest, current_user: dict = Depends(get_current_user)):
    result = await chats_collection.update_one(
        {"chat_id": chat_id, "user_email": current_user["email"]},
        {"$set": {"title": req.title}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"message": "Title updated successfully"}

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    result = await chats_collection.delete_one(
        {"chat_id": chat_id, "user_email": current_user["email"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"message": "Chat successfully deleted"}

@app.post("/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    try:
        chat_id = request.chat_id
        is_new_chat = False
        
        if not chat_id:
            chat_id = str(uuid.uuid4())
            is_new_chat = True
            chat_doc = {
                "chat_id": chat_id,
                "user_email": current_user["email"],
                "title": "New Conversation",
                "created_at": datetime.utcnow(),
                "messages": []
            }
            await chats_collection.insert_one(chat_doc)
        else:
            chat_exists = await chats_collection.find_one({"chat_id": chat_id, "user_email": current_user["email"]})
            if not chat_exists:
                raise HTTPException(status_code=404, detail="Chat not found")

        # Auto-title logic
        chat_title = "New Conversation"
        if not is_new_chat:
            chat_title = chat_exists.get("title", "New Conversation")
            
        generated_title = None
        if chat_title == "New Conversation":
            new_title = await generate_auto_title(request.message)
            if new_title and new_title != "New Conversation":
                await chats_collection.update_one(
                    {"chat_id": chat_id},
                    {"$set": {"title": new_title}}
                )
                generated_title = new_title

        # Generate response
        answer = await generate_chat_response(request.message, current_user["email"])

        # Update chat thread
        user_msg = {"role": "user", "content": request.message, "timestamp": datetime.utcnow()}
        assistant_msg = {"role": "assistant", "content": answer, "timestamp": datetime.utcnow()}

        await chats_collection.update_one(
            {"chat_id": chat_id},
            {"$push": {"messages": {"$each": [user_msg, assistant_msg]}}}
        )

        response_payload = {"response": answer, "chat_id": chat_id}
        if generated_title:
            response_payload["title"] = generated_title
        elif not is_new_chat:
            response_payload["title"] = chat_title

        return response_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
