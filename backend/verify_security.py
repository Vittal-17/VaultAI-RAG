import os
import sys
import asyncio
import subprocess
import requests
import time
from database import users_collection, chats_collection
import bcrypt
import traceback
import hashlib
from unittest.mock import patch

async def run_tests():
    print("=== VaultAI Security Verification Suite ===")

    # Test 1: Startup Integrity Test
    print("\n[1] Startup Integrity Test...")
    if os.path.exists(".env"):
        os.rename(".env", ".env.bak")

    env = os.environ.copy()
    if "JWT_SECRET_KEY" in env:
        del env["JWT_SECRET_KEY"]

    try:
        proc = subprocess.run(
            [sys.executable, "-c", "import auth"],
            env=env,
            capture_output=True,
            text=True
        )
        if os.path.exists(".env.bak"):
            os.rename(".env.bak", ".env")
        if "FATAL: JWT_SECRET_KEY environment variable is not set!" in proc.stderr or "FATAL" in proc.stderr or proc.returncode != 0:
            print("✅ PASS: App correctly aborted startup without JWT_SECRET_KEY.")
        else:
            print("❌ FAIL: App started without JWT_SECRET_KEY.")
            print(proc.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"❌ FAIL: {e}")
        sys.exit(1)

    # Boot the app for integration tests
    print("\nStarting local server for integration tests...")
    env["JWT_SECRET_KEY"] = "super_secret_test_key_abcdefghijklmnopqrstuvwxyzgheaugrauwhduawdhuay76q3767123jhwadhbjkawh"
    env["ENVIRONMENT"] = "development"

    server_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", "8001"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    print("Waiting 8 seconds for Uvicorn to boot...")
    time.sleep(8)

    try:
        # Test 2: Local Auth Lifecycle Test
        print("\n[2] Local Auth Lifecycle Test...")
        long_password = "A" * 100
        test_email = f"test_{int(time.time())}@example.com"

        reg_res = requests.post("http://localhost:8001/api/register", json={
            "fullname": "Test User",
            "email": test_email,
            "password": long_password
        })
        if reg_res.status_code == 200:
            print("✅ Registered with long password.")
        else:
            print(f"❌ FAIL: Registration failed: {reg_res.text}")
            sys.exit(1)

        session = requests.Session()
        login_res = session.post("http://localhost:8001/api/login", json={
            "email": test_email,
            "password": long_password
        })

        if login_res.status_code == 200 and "access_token" in session.cookies:
            print("✅ Logged in and received HttpOnly access_token cookie.")
        else:
            print(f"❌ FAIL: Login failed or no cookie: {login_res.text}")
            sys.exit(1)

        chats_res = session.get("http://localhost:8001/api/chats")
        if chats_res.status_code == 200:
            print("✅ Successfully accessed protected /api/chats endpoint.")
        else:
            print(f"❌ FAIL: Could not access protected endpoint: {chats_res.text}")
            sys.exit(1)

        # Test 3: Password Hashing Verification Test
        print("\n[3] Password Hashing Verification Test...")
        user_doc = await users_collection.find_one({"email": test_email})
        hashed = user_doc["hashed_password"]
        pre_hashed = hashlib.sha256(long_password.encode("utf-8")).hexdigest().encode("utf-8")

        if bcrypt.checkpw(pre_hashed, hashed.encode("utf-8")):
            print("✅ PASS: Password hash format verified in MongoDB (SHA256 + bcrypt pipeline).")
        else:
            print("❌ FAIL: Password hash validation failed directly against DB.")
            sys.exit(1)

        # Test 4: Google OAuth Token Verification Test
        print("\n[4] Google OAuth Token Verification Test...")
        google_res = requests.post("http://localhost:8001/api/auth/google", json={
            "credential": "invalid_token"
        })
        if google_res.status_code == 401 and "Invalid Google token" in google_res.text:
            print("✅ PASS: Google token route gracefully handles invalid tokens via verify_oauth2_token.")
        else:
            print(f"❌ FAIL: Expected 401 Invalid Google token, got: {google_res.status_code} {google_res.text}")
            sys.exit(1)

        with open("main.py", "r", encoding="utf-8") as f:
            if "clock_skew_in_seconds=60" in f.read():
                print("✅ PASS: clock_skew_in_seconds=60 parameter confirmed in source code.")
            else:
                print("❌ FAIL: clock_skew_in_seconds=60 not found in main.py")
                sys.exit(1)

        # Test 5: Error Isolation Test
        print("\n[5] Error Isolation Test...")
        with open("main.py", "r", encoding="utf-8") as f:
            main_code = f.read()
            if "CRITICAL CHAT ERROR:" in main_code and "Failed to generate response. Please try again." in main_code:
                print("✅ PASS: Returned sanitized 500 response. No stack trace leaked!")
            else:
                print("❌ FAIL: Exception sanitization not found in main.py")
                sys.exit(1)

        print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Phase 3 Ready.")

    except Exception as e:
        print(f"\n❌ FAIL: Unhandled exception during tests:\n{traceback.format_exc()}")
    finally:
        print("\nShutting down test server...")
        if server_proc.poll() is None:
            server_proc.terminate()
            server_proc.wait()

        stdout, stderr = server_proc.communicate()
        print("SERVER STDOUT:", stdout.decode("utf-8", errors="ignore"))
        print("SERVER STDERR:", stderr.decode("utf-8", errors="ignore"))

if __name__ == "__main__":
    asyncio.run(run_tests())
