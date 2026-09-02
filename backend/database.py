import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("FATAL: MONGODB_URI environment variable is not set!")
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
        logger.info("Successfully connected to MongoDB Atlas!")
    except Exception as e:
        logger.exception("Error connecting to MongoDB Atlas")
        raise RuntimeError("FATAL: Could not connect to MongoDB") from e
