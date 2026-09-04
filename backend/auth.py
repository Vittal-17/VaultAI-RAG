import config
from datetime import datetime, timedelta, timezone
import os
import bcrypt
import jwt
import hashlib


# FATAL CRASH if secret is missing
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("FATAL: JWT_SECRET_KEY environment variable is not set!")

IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"
if IS_PRODUCTION and len(SECRET_KEY) < 32:
    raise ValueError("FATAL: JWT_SECRET_KEY must be at least 32 characters long in production")

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

def hash_password(password: str) -> str:
    # Pre-hash to bypass bcrypt's 72-byte truncation limit while preserving infinite entropy
    pre_hashed = hashlib.sha256(password.encode("utf-8")).hexdigest().encode("utf-8")
    hashed = bcrypt.hashpw(pre_hashed, bcrypt.gensalt())
    return hashed.decode("utf-8")

get_password_hash = hash_password

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pre_hashed = hashlib.sha256(plain_password.encode("utf-8")).hexdigest().encode("utf-8")
    return bcrypt.checkpw(pre_hashed, hashed_password.encode("utf-8"))

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload 
    except jwt.PyJWTError:
        return None
