from datetime import datetime, timedelta
import os
import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_secret_key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 1440


def hash_password(password: str) -> str:
  # Encode password to bytes and safely truncate to 72 bytes (bcrypt limit)
  pwd_bytes = password.encode("utf-8")[:72]
  hashed = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt())
  return hashed.decode("utf-8")


# Alias to match any imports expecting get_password_hash
get_password_hash = hash_password


def verify_password(plain_password: str, hashed_password: str) -> bool:
  pwd_bytes = plain_password.encode("utf-8")[:72]
  return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: timedelta = None):
  to_encode = data.copy()
  expire = datetime.utcnow() + (
      expires_delta
      if expires_delta
      else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  )
  to_encode.update({"exp": expire})
  return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str):
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload  # Returns the full dictionary so payload.get("sub") works in main.py
  except jwt.PyJWTError:
    return None
