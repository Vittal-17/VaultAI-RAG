import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "vault_ai")
COLLECTION_NAME = os.getenv("MONGODB_COLLECTION_NAME", "documents")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]
users_collection = db["users"]
chats_collection = db["chats"]

async def check_db_connection():
    try:
        await client.admin.command('ping')
        print("Successfully connected to MongoDB Atlas!")
    except Exception as e:
        print(f"Error connecting to MongoDB Atlas: {e}")
