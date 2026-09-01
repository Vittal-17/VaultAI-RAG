import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from services import generate_chat_response

client = TestClient(app)

class TestCYPHRSecurityAndRAG(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        import main
        main.limiter._storage.reset()

    @patch("services.collection")
    @patch("services.client.aio.models.embed_content", new_callable=AsyncMock)
    @patch("services.gorouter_client.chat.completions.create", new_callable=AsyncMock)
    async def test_1_multi_tenant_isolation(self, mock_gorouter, mock_embed, mock_collection):
        """[1] Multi-Tenant Isolation Verification Test"""
        mock_embed_response = MagicMock()
        mock_embed_response.embeddings = [MagicMock(values=[0.1]*768)]
        mock_embed.return_value = mock_embed_response
        mock_collection.distinct = AsyncMock(return_value=[])
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        mock_collection.aggregate.return_value = mock_cursor

        mock_llm_response = MagicMock()
        mock_llm_response.choices = [MagicMock(message=MagicMock(content="Mocked answer"))]
        mock_gorouter.return_value = mock_llm_response

        # Run test for alpha
        await generate_chat_response("Hello", "user_alpha@test.com")
        pipeline_alpha = mock_collection.aggregate.call_args[0][0]
        vector_search_stage_alpha = pipeline_alpha[0]["$vectorSearch"]
        self.assertEqual(vector_search_stage_alpha["filter"]["user_email"], {"$eq": "user_alpha@test.com"})

        # Run test for beta
        await generate_chat_response("Hello", "user_beta@test.com")
        pipeline_beta = mock_collection.aggregate.call_args[0][0]
        vector_search_stage_beta = pipeline_beta[0]["$vectorSearch"]
        self.assertEqual(vector_search_stage_beta["filter"]["user_email"], {"$eq": "user_beta@test.com"})

    @patch("services.collection")
    @patch("services.client.aio.models.embed_content", new_callable=AsyncMock)
    @patch("services.gorouter_client.chat.completions.create", new_callable=AsyncMock)
    async def test_2_filename_aware_scoping(self, mock_gorouter, mock_embed, mock_collection):
        """[2] Filename-Aware Scoping Verification Test"""
        mock_embed_response = MagicMock()
        mock_embed_response.embeddings = [MagicMock(values=[0.1]*768)]
        mock_embed.return_value = mock_embed_response
        mock_collection.distinct = AsyncMock(return_value=["testnewnewtestnew.pdf", "otherfile.pdf"])
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        mock_collection.aggregate.return_value = mock_cursor

        mock_llm_response = MagicMock()
        mock_llm_response.choices = [MagicMock(message=MagicMock(content="Mocked answer"))]
        mock_gorouter.return_value = mock_llm_response

        await generate_chat_response("Summarize testnewnewtestnew.pdf please", "user@test.com")

        pipeline = mock_collection.aggregate.call_args[0][0]
        vector_search_stage = pipeline[0]["$vectorSearch"]

        self.assertEqual(vector_search_stage["filter"]["user_email"], {"$eq": "user@test.com"})
        self.assertEqual(vector_search_stage["filter"]["filename"], {"$eq": "testnewnewtestnew.pdf"})

    @patch("services.collection")
    @patch("services.client.aio.models.embed_content", new_callable=AsyncMock)
    @patch("services.gorouter_client.chat.completions.create", new_callable=AsyncMock)
    async def test_3_metadata_page_fallback(self, mock_gorouter, mock_embed, mock_collection):
        """[3] Metadata Page Integrity & Fallback Test"""
        mock_embed_response = MagicMock()
        mock_embed_response.embeddings = [MagicMock(values=[0.1]*768)]
        mock_embed.return_value = mock_embed_response
        mock_collection.distinct = AsyncMock(return_value=["doc.pdf"])
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {"filename": "doc.pdf", "text": "Missing page chunk"}
        ])
        mock_collection.aggregate.return_value = mock_cursor

        mock_llm_response = MagicMock()
        mock_llm_response.choices = [MagicMock(message=MagicMock(content="Here is the info."))]
        mock_gorouter.return_value = mock_llm_response

        answer = await generate_chat_response("query", "user@test.com")

        self.assertIn("- **doc.pdf** (Page 1)", answer)
        self.assertNotIn("(Page ?)", answer)

    @patch("services.collection")
    @patch("services.client.aio.models.embed_content", new_callable=AsyncMock)
    @patch("services.gorouter_client.chat.completions.create", new_callable=AsyncMock)
    async def test_4_precision_citation_filtering(self, mock_gorouter, mock_embed, mock_collection):
        """[4] Post-LLM Precision Citation Filtering Test"""
        mock_embed_response = MagicMock()
        mock_embed_response.embeddings = [MagicMock(values=[0.1]*768)]
        mock_embed.return_value = mock_embed_response
        mock_collection.distinct = AsyncMock(return_value=["file1.pdf", "file2.pdf", "file3.pdf"])
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {"filename": "file1.pdf", "page": 1, "text": "Top match"},
            {"filename": "file2.pdf", "page": 5, "text": "Random context"},
            {"filename": "file3.pdf", "page": 2, "text": "Context for file3"}
        ])
        mock_collection.aggregate.return_value = mock_cursor

        mock_llm_response = MagicMock()
        mock_llm_response.choices = [MagicMock(message=MagicMock(content="Based on file3.pdf, here is the result."))]
        mock_gorouter.return_value = mock_llm_response

        answer = await generate_chat_response("query", "user@test.com")

        self.assertIn("- **file1.pdf** (Page 1)", answer)
        self.assertIn("- **file3.pdf** (Page 2)", answer)

        sources_block = answer.split("### 📚 Sources:")[1] if "### 📚 Sources:" in answer else ""
        self.assertNotIn("file2.pdf", sources_block)

    @patch("main.chats_collection.insert_one", new_callable=AsyncMock)
    @patch("main.generate_chat_response", new_callable=AsyncMock)
    def test_5_graceful_error_boundary(self, mock_generate_chat, mock_insert):
        """[5] Graceful Error Boundary & Exception Handling Test"""
        mock_generate_chat.side_effect = Exception("Upstream OpenAI Timeout")

        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}

        response = client.post("/chat", json={"message": "Crash it"}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})

        app.dependency_overrides = {}
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "Failed to generate response. Please try again.")

    def test_6_csrf_get_without_token(self):
        """1. GET request without CSRF token"""
        response = client.get('/api/csrf')
        self.assertEqual(response.status_code, 200)
        self.assertIn("csrf_token", response.json())
        self.assertTrue(len(response.json()["csrf_token"]) > 32)

    def test_7_csrf_post_without_token(self):
        """2. POST without CSRF token"""
        response = client.post('/api/logout')
        self.assertEqual(response.status_code, 403)
        self.assertIn("CSRF validation failed", response.json()["detail"])

    def test_8_csrf_patch_without_token(self):
        """3. PATCH without CSRF token"""
        response = client.patch('/api/chats/123/title')
        self.assertEqual(response.status_code, 403)

    def test_9_csrf_delete_without_token(self):
        """4. DELETE without CSRF token"""
        response = client.delete('/api/chats/123')
        self.assertEqual(response.status_code, 403)

    def test_10_csrf_post_incorrect_token(self):
        """5. POST with incorrect CSRF token"""
        response = client.post('/api/logout', cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'def'})
        self.assertEqual(response.status_code, 403)

    @patch("main.chats_collection.insert_one", new_callable=AsyncMock)
    def test_11_csrf_valid_token_and_auth(self, mock_insert):
        """8, 14, 15. Valid CSRF token + Auth"""
        cookies = {'csrf_token': 'match'}
        headers = {'X-CSRF-Token': 'match', 'Origin': 'http://localhost:5173'}
        # mock auth
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}
        response = client.post('/api/chats/new', cookies=cookies, headers=headers)
        app.dependency_overrides = {}
        self.assertEqual(response.status_code, 200)

    def test_12_csrf_missing_header(self):
        """9. Correct token in cookie but missing header"""
        response = client.post('/api/logout', cookies={'csrf_token': 'abc'})
        self.assertEqual(response.status_code, 403)

    def test_13_csrf_mismatched_cookie(self):
        """10. Correct header but mismatched cookie"""
        response = client.post('/api/logout', cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'xyz'})
        self.assertEqual(response.status_code, 403)

    def test_14_invalid_origin(self):
        """11. Invalid Origin"""
        response = client.post('/api/logout', cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://evil.com'})
        self.assertEqual(response.status_code, 403)

    def test_15_options_preflight(self):
        """13. OPTIONS preflight"""
        response = client.options('/api/logout', headers={'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST'})
        self.assertEqual(response.status_code, 200)

    @patch('main.process_and_store_document', new_callable=AsyncMock)
    def test_16_upload_oversized_pdf(self, mock_process):
        """Oversized PDF"""
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}

        # Create a file just over 25MB but mock the read
        # Wait, if we send real 25MB it's slow. We can patch MAX_PDF_SIZE_BYTES
        import main
        orig_max = main.MAX_PDF_SIZE_BYTES
        main.MAX_PDF_SIZE_BYTES = 100 # 100 bytes limit

        response = client.post('/upload', files={'file': ('test.pdf', b'A'*150, 'application/pdf')}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})

        main.MAX_PDF_SIZE_BYTES = orig_max
        app.dependency_overrides = {}

        self.assertEqual(response.status_code, 413)
        self.assertIn("too large", response.json()["detail"])
        mock_process.assert_not_called()

    def test_17_upload_fake_pdf(self):
        """Fake .pdf file extension check"""
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}

        response = client.post('/upload', files={'file': ('test.txt', b'abc', 'text/plain')}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})
        app.dependency_overrides = {}

        self.assertEqual(response.status_code, 400)
        self.assertIn("Only PDF files", response.json()["detail"])

    @patch('services.PdfReader')
    def test_18_upload_corrupted_pdf(self, mock_pdfreader):
        """Corrupted PDF"""
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}
        mock_pdfreader.side_effect = Exception("corrupt")

        response = client.post('/upload', files={'file': ('test.pdf', b'bad', 'application/pdf')}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})
        app.dependency_overrides = {}

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid or corrupted", response.json()["detail"])

    @patch('services.PdfReader')
    def test_19_upload_too_many_pages(self, mock_pdfreader):
        """PDF exceeding page limit"""
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}

        mock_reader_instance = MagicMock()
        mock_reader_instance.pages = [MagicMock()] * 201
        mock_pdfreader.return_value = mock_reader_instance

        response = client.post('/upload', files={'file': ('test.pdf', b'bad', 'application/pdf')}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})
        app.dependency_overrides = {}

        self.assertEqual(response.status_code, 413)
        self.assertIn("too many pages", response.json()["detail"])

    @patch('services.PdfReader')
    def test_20_upload_empty_pdf(self, mock_pdfreader):
        """Empty PDF / No extractable text"""
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}

        mock_reader_instance = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "   "
        mock_reader_instance.pages = [mock_page]
        mock_pdfreader.return_value = mock_reader_instance

        response = client.post('/upload', files={'file': ('test.pdf', b'bad', 'application/pdf')}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})
        app.dependency_overrides = {}

        self.assertEqual(response.status_code, 400)
        self.assertIn("no extractable text", response.json()["detail"])

    @patch('services.PdfReader')
    def test_21_upload_chunk_explosion(self, mock_pdfreader):
        """Document exceeding chunk limit"""
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}

        mock_reader_instance = MagicMock()
        mock_page = MagicMock()
        # Generates a massive string to trigger thousands of chunks
        mock_page.extract_text.return_value = "A" * 5000000
        mock_reader_instance.pages = [mock_page]
        mock_pdfreader.return_value = mock_reader_instance

        response = client.post('/upload', files={'file': ('test.pdf', b'bad', 'application/pdf')}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})
        app.dependency_overrides = {}

        self.assertEqual(response.status_code, 413)
        self.assertIn("too many text chunks", response.json()["detail"])

    @patch('services.PdfReader')
    @patch('services.client.aio.models.embed_content', new_callable=AsyncMock)
    def test_22_upload_embedding_failure(self, mock_embed, mock_pdfreader):
        """Embedding failure"""
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}

        mock_reader_instance = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Valid text"
        mock_reader_instance.pages = [mock_page]
        mock_pdfreader.return_value = mock_reader_instance

        mock_embed.side_effect = Exception("API Timeout")

        response = client.post('/upload', files={'file': ('test.pdf', b'bad', 'application/pdf')}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})
        app.dependency_overrides = {}

        self.assertEqual(response.status_code, 500)
        self.assertIn("Failed to generate embeddings", response.json()["detail"])
        self.assertNotIn("Timeout", response.json()["detail"])

    @patch('services.PdfReader')
    @patch('services.client.aio.models.embed_content', new_callable=AsyncMock)
    @patch('services.collection.insert_many', new_callable=AsyncMock)
    def test_23_upload_mongodb_failure(self, mock_insert, mock_embed, mock_pdfreader):
        """MongoDB insertion failure"""
        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "user@test.com"}

        mock_reader_instance = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Valid text"
        mock_reader_instance.pages = [mock_page]
        mock_pdfreader.return_value = mock_reader_instance

        mock_embed_response = MagicMock()
        mock_embed_response.embeddings = [MagicMock(values=[0.1]*768)]
        mock_embed.return_value = mock_embed_response

        mock_insert.side_effect = Exception("DB Down")

        response = client.post('/upload', files={'file': ('test.pdf', b'bad', 'application/pdf')}, cookies={'csrf_token': 'abc'}, headers={'X-CSRF-Token': 'abc', 'Origin': 'http://localhost:5173'})
        app.dependency_overrides = {}

        self.assertEqual(response.status_code, 500)
        self.assertIn("Database insertion failed", response.json()["detail"])
        self.assertNotIn("DB Down", response.json()["detail"])


    def test_24_rate_limit_login(self):
        """Login requests over limit return 429"""
        from unittest.mock import AsyncMock
        with patch('main.users_collection.find_one', new_callable=AsyncMock) as mock_find:
            mock_find.return_value = None  # user not found, will return 401
            import main
            main.limiter._storage.reset()
            cookies = {'csrf_token': 'rl_token'}
            headers = {'X-CSRF-Token': 'rl_token', 'Origin': 'http://localhost:5173', 'X-Forwarded-For': '192.168.1.1'}

            # 10 allowed
            for _ in range(10):
                res = client.post('/api/login', json={"email": "t@t.com", "password": "1"}, cookies=cookies, headers=headers)
                self.assertEqual(res.status_code, 401)

            # 11th should be 429
            res = client.post('/api/login', json={"email": "t@t.com", "password": "1"}, cookies=cookies, headers=headers)
            self.assertEqual(res.status_code, 429)
            self.assertIn("Too many login attempts", res.json()["detail"])
            self.assertIn("retry-after", res.headers)
            self.assertTrue(res.headers["retry-after"].isdigit())
            self.assertGreaterEqual(int(res.headers["retry-after"]), 1)

    @patch('main.generate_chat_response')
    @patch('main.chats_collection.find_one', new_callable=AsyncMock)
    @patch('main.chats_collection.update_one', new_callable=AsyncMock)
    def test_25_rate_limit_chat_user_isolated(self, mock_update, mock_find, mock_gen):
        """User A exhausting quota does not affect User B and bypasses expensive work"""
        mock_gen.return_value = "mocked_response"
        mock_find.return_value = {"title": "Test"}
        import main
        main.limiter._storage.reset()
        cookies = {'csrf_token': 'rl_token', 'access_token': 'mock_token'}
        headers = {'X-CSRF-Token': 'rl_token', 'Origin': 'http://localhost:5173'}

        from main import get_current_user

        # User A hits 20 chats
        app.dependency_overrides[get_current_user] = lambda: {"email": "userA@test.com"}
        with patch('auth.decode_access_token', return_value={"sub": "userA@test.com"}):
            for _ in range(20):
                res = client.post('/chat', json={"message": "hi", "chat_id": "1"}, cookies=cookies, headers=headers)
                self.assertEqual(res.status_code, 200)

            # 21st should be 429 and downstream not called
            mock_gen.reset_mock()
            res = client.post('/chat', json={"message": "hi", "chat_id": "1"}, cookies=cookies, headers=headers)
            self.assertEqual(res.status_code, 429)
            self.assertIn("Too many chat requests", res.json()["detail"])
            self.assertIn("retry-after", res.headers)
            self.assertTrue(res.headers["retry-after"].isdigit())
            self.assertGreaterEqual(int(res.headers["retry-after"]), 1)
            mock_gen.assert_not_called()

        # User B should still be allowed
        app.dependency_overrides[get_current_user] = lambda: {"email": "userB@test.com"}
        with patch('auth.decode_access_token', return_value={"sub": "userB@test.com"}):
            res = client.post('/chat', json={"message": "hi", "chat_id": "1"}, cookies=cookies, headers=headers)
            self.assertEqual(res.status_code, 200)

        app.dependency_overrides = {}

    @patch('main.process_and_store_document', new_callable=AsyncMock)
    def test_26_rate_limit_upload(self, mock_process):
        """Upload requests over limit return 429 and bypass processing"""
        import main
        main.limiter._storage.reset()
        cookies = {'csrf_token': 'rl_token', 'access_token': 'mock_token'}
        headers = {'X-CSRF-Token': 'rl_token', 'Origin': 'http://localhost:5173'}

        from main import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"email": "upload@test.com"}

        with patch('auth.decode_access_token', return_value={"sub": "upload@test.com"}):
            for _ in range(10):
                res = client.post('/upload', files={'file': ('test.pdf', b'fake', 'application/pdf')}, cookies=cookies, headers=headers)
                self.assertEqual(res.status_code, 200)

            mock_process.reset_mock()
            res = client.post('/upload', files={'file': ('test.pdf', b'fake', 'application/pdf')}, cookies=cookies, headers=headers)
            self.assertEqual(res.status_code, 429)
            self.assertIn("Upload rate limit exceeded", res.json()["detail"])
            self.assertIn("retry-after", res.headers)
            self.assertTrue(res.headers["retry-after"].isdigit())
            self.assertGreaterEqual(int(res.headers["retry-after"]), 1)
            mock_process.assert_not_called()

        app.dependency_overrides = {}

    @patch('main.decode_access_token')
    @patch('main.users_collection.find_one', new_callable=AsyncMock)
    @patch('main.chats_collection.find_one', new_callable=AsyncMock)
    def test_27_chat_not_found_returns_404(self, mock_chats_find, mock_users_find, mock_decode):
        mock_decode.return_value = {"sub": "test@example.com"}
        mock_users_find.return_value = {"email": "test@example.com", "fullname": "Test User"}

        # Simulate chat not found
        mock_chats_find.return_value = None

        headers = {"x-csrf-token": "dummy_csrf"}
        cookies = {"access_token": "dummy_jwt", "csrf_token": "dummy_csrf"}

        response = client.post("/chat", json={"message": "hello", "chat_id": "nonexistent_chat"}, headers=headers, cookies=cookies)

        self.assertEqual(response.status_code, 404)
        self.assertIn("Chat not found", response.json()["detail"])

    @patch('main.decode_access_token')
    @patch('main.users_collection.find_one', new_callable=AsyncMock)
    @patch('main.chats_collection.find_one', new_callable=AsyncMock)
    def test_28_chat_unexpected_exception_returns_500(self, mock_chats_find, mock_users_find, mock_decode):
        mock_decode.return_value = {"sub": "test@example.com"}
        mock_users_find.return_value = {"email": "test@example.com", "fullname": "Test User"}

        # Simulate an unexpected exception in chats_collection.find_one
        mock_chats_find.side_effect = Exception("SECRET_DB_CONNECTION_STRING_ERROR")

        headers = {"x-csrf-token": "dummy_csrf"}
        cookies = {"access_token": "dummy_jwt", "csrf_token": "dummy_csrf"}

        response = client.post("/chat", json={"message": "hello", "chat_id": "existing_chat"}, headers=headers, cookies=cookies)

        self.assertEqual(response.status_code, 500)
        self.assertIn("Failed to generate response. Please try again.", response.json()["detail"])
        self.assertNotIn("SECRET_DB_CONNECTION_STRING_ERROR", response.text)

    def test_29_cors_preflight(self):
        # 1. REAL CORS PRE-FLIGHT TEST
        headers = {'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST'}
        response = client.options('/api/login', headers=headers)
        self.assertEqual(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173')
        self.assertEqual(response.headers.get('Access-Control-Allow-Credentials'), 'true')

        # Verify unexpected origin does NOT get configured allowed-origin
        headers = {'Origin': 'http://attacker.com', 'Access-Control-Request-Method': 'POST'}
        response = client.options('/api/login', headers=headers)
        self.assertNotEqual(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173')

    @patch('main.users_collection.find_one', new_callable=unittest.mock.AsyncMock)
    @patch('main.users_collection.insert_one', new_callable=unittest.mock.AsyncMock)
    def test_30_actual_auth_cookie_creation(self, mock_insert, mock_find):
        # 2. TEST ACTUAL AUTH COOKIE CREATION
        mock_find.return_value = None
        import main

        main.IS_PRODUCTION = False
        main.COOKIE_SAMESITE = 'lax'

        client.cookies.clear()
        res_csrf = client.get('/api/csrf')
        token = res_csrf.json()['csrf_token']

        response = client.post('/api/register', json={"fullname": "test", "email": "new@test.com", "password": "123"}, cookies={'csrf_token': token}, headers={'X-CSRF-Token': token, 'Origin': 'http://localhost:5173'})
        set_cookies = response.headers.get_list('set-cookie')
        access_cookie = next(c for c in set_cookies if c.startswith('access_token='))

        self.assertIn('HttpOnly', access_cookie)
        self.assertIn('Path=/', access_cookie)
        self.assertIn('Max-Age=86400', access_cookie)
        self.assertIn('samesite=lax', access_cookie.lower())
        self.assertNotIn('Secure', access_cookie)

        main.IS_PRODUCTION = True
        main.COOKIE_SAMESITE = 'none'
        main.limiter._storage.reset()
        mock_find.return_value = None

        client.cookies.clear()
        res_csrf = client.get('/api/csrf')
        token = res_csrf.json()['csrf_token']

        response = client.post('/api/register', json={"fullname": "test", "email": "new2@test.com", "password": "123"}, cookies={'csrf_token': token}, headers={'X-CSRF-Token': token, 'Origin': 'http://localhost:5173'})
        set_cookies = response.headers.get_list('set-cookie')
        access_cookie = next(c for c in set_cookies if c.startswith('access_token='))
        self.assertIn('samesite=none', access_cookie.lower())
        self.assertIn('Secure', access_cookie)

        main.IS_PRODUCTION = False
        main.COOKIE_SAMESITE = 'lax'

    def test_31_csrf_cookie_creation(self):
        # 3. TEST CSRF COOKIE CREATION
        import main
        main.IS_PRODUCTION = False
        main.COOKIE_SAMESITE = 'lax'

        client.cookies.clear()
        response = client.get('/api/csrf')
        self.assertEqual(response.status_code, 200)

        json_token = response.json().get('csrf_token')
        self.assertTrue(len(json_token) >= 32)

        set_cookies = response.headers.get_list('set-cookie')
        csrf_cookie_str = next((c for c in set_cookies if c.startswith('csrf_token=')), None)
        self.assertIsNotNone(csrf_cookie_str)

        cookie_val = csrf_cookie_str.split(';')[0].split('=')[1]
        self.assertEqual(json_token, cookie_val)

        self.assertIn('Path=/', csrf_cookie_str)
        self.assertNotIn('HttpOnly', csrf_cookie_str)
        self.assertNotIn('Secure', csrf_cookie_str)
        self.assertIn('samesite=lax', csrf_cookie_str.lower())

        main.IS_PRODUCTION = True
        main.COOKIE_SAMESITE = 'none'

        client.cookies.clear()
        response = client.get('/api/csrf')
        set_cookies = response.headers.get_list('set-cookie')
        csrf_cookie_str = next(c for c in set_cookies if c.startswith('csrf_token='))
        self.assertIn('Secure', csrf_cookie_str)
        self.assertIn('samesite=none', csrf_cookie_str.lower())

        main.IS_PRODUCTION = False
        main.COOKIE_SAMESITE = 'lax'

    def test_32_invalid_cookie_samesite(self):
        # 4. INVALID COOKIE_SAMESITE TEST
        import subprocess
        import sys
        from pathlib import Path

        backend_dir = str(Path(__file__).resolve().parent)

        script = """
import os
os.environ['COOKIE_SAMESITE'] = 'banana'
import main
"""
        result = subprocess.run([sys.executable, '-c', script], capture_output=True, text=True, cwd=backend_dir)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("COOKIE_SAMESITE must be 'lax', 'strict', or 'none'", result.stderr)

        script2 = """
import os
os.environ['COOKIE_SAMESITE'] = 'none'
os.environ['ENVIRONMENT'] = 'development'
import main
print(main.COOKIE_SAMESITE)
"""
        result2 = subprocess.run([sys.executable, '-c', script2], capture_output=True, text=True, cwd=backend_dir)
        self.assertEqual(result2.returncode, 0)
        self.assertEqual(result2.stdout.strip(), 'lax')

        script3 = """
import os
os.environ['COOKIE_SAMESITE'] = 'none'
os.environ['ENVIRONMENT'] = 'production'
import main
print(main.COOKIE_SAMESITE)
print(main.IS_PRODUCTION)
"""
        result3 = subprocess.run([sys.executable, '-c', script3], capture_output=True, text=True, cwd=backend_dir)
        self.assertEqual(result3.returncode, 0)
        self.assertIn('none', result3.stdout)
        self.assertIn('True', result3.stdout)

    def test_33_logout_cookie_deletion(self):
        # 5. LOGOUT COOKIE DELETION
        response = client.post('/api/logout', cookies={'csrf_token': 'rl_token'}, headers={'X-CSRF-Token': 'rl_token', 'Origin': 'http://localhost:5173'})
        set_cookies = response.headers.get_list('set-cookie')

        access_deleted = next((c for c in set_cookies if c.startswith('access_token=')), None)

        self.assertIsNotNone(access_deleted)
        self.assertIn('""', access_deleted)
        self.assertIn('Path=/', access_deleted)

        self.assertFalse(any('csrftoken=' in c for c in set_cookies))

    def test_34_security_headers(self):
        # 6. SECURITY HEADERS
        import main
        main.IS_PRODUCTION = False
        response = client.get('/api/csrf')
        self.assertEqual(response.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(response.headers.get('X-Frame-Options'), 'DENY')
        self.assertEqual(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
        self.assertNotIn('Strict-Transport-Security', response.headers)

        main.IS_PRODUCTION = True
        response = client.get('/api/csrf')
        self.assertEqual(response.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(response.headers.get('X-Frame-Options'), 'DENY')
        self.assertEqual(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
        self.assertIn('Strict-Transport-Security', response.headers)
        self.assertEqual(response.headers.get('Strict-Transport-Security'), 'max-age=31536000; includeSubDomains')

        main.IS_PRODUCTION = False

    def test_35_csrf_flow(self):
        # 7. CSRF FLOW
        client.cookies.clear()
        response1 = client.get('/api/csrf')
        json_token = response1.json().get('csrf_token')

        set_cookies = response1.headers.get_list('set-cookie')
        csrf_cookie_str = next(c for c in set_cookies if c.startswith('csrf_token='))
        cookie_token = csrf_cookie_str.split(';')[0].split('=')[1]

        self.assertEqual(json_token, cookie_token)

        response2 = client.post('/api/logout', cookies={'csrf_token': cookie_token}, headers={'X-CSRF-Token': cookie_token, 'Origin': 'http://localhost:5173'})
        self.assertEqual(response2.status_code, 200)

    @patch('main.id_token.verify_oauth2_token')
    @patch('main.users_collection.find_one')
    @patch('main.users_collection.insert_one')
    def test_36_google_auth_email_verified(self, mock_insert, mock_find, mock_verify):
        async def mock_none(*args, **kwargs): return None
        mock_find.side_effect = mock_none
        mock_insert.side_effect = mock_none

        # Unverified email
        mock_verify.return_value = {"email": "test@example.com", "name": "Test", "email_verified": False}
        response = client.post('/api/auth/google', json={"credential": "fake"}, headers={'Origin': 'http://localhost:5173', 'X-CSRF-Token': 'a'}, cookies={'csrf_token': 'a'})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid Google token")

        # Missing email_verified
        mock_verify.return_value = {"email": "test@example.com", "name": "Test"}
        response2 = client.post('/api/auth/google', json={"credential": "fake"}, headers={'Origin': 'http://localhost:5173', 'X-CSRF-Token': 'a'}, cookies={'csrf_token': 'a'})
        self.assertEqual(response2.status_code, 401)

        # Verified email
        mock_verify.return_value = {"email": "test@example.com", "name": "Test", "email_verified": True}
        response3 = client.post('/api/auth/google', json={"credential": "fake"}, headers={'Origin': 'http://localhost:5173', 'X-CSRF-Token': 'a'}, cookies={'csrf_token': 'a'})
        self.assertEqual(response3.status_code, 200)

    @patch('main.verify_password')
    @patch('main.users_collection.find_one')
    def test_37_login_timing_enumeration(self, mock_find, mock_verify):
        async def mock_none(*args, **kwargs):
            return None
        mock_find.side_effect = mock_none
        mock_verify.return_value = False

        response = client.post('/api/login', json={"email": "nonexistent@test.com", "password": "abc"}, headers={'Origin': 'http://localhost:5173', 'X-CSRF-Token': 'a'}, cookies={'csrf_token': 'a'})
        self.assertEqual(response.status_code, 401)
        self.assertTrue(mock_verify.called)

    def test_38_jwt_cookie_max_age_sync(self):
        import auth
        self.assertEqual(auth.ACCESS_TOKEN_EXPIRE_MINUTES, 1440)

        script = """
import os
os.environ['COOKIE_SAMESITE'] = 'lax'
from auth import ACCESS_TOKEN_EXPIRE_MINUTES
import main
print(ACCESS_TOKEN_EXPIRE_MINUTES * 60)
"""
        import subprocess
        import sys
        from pathlib import Path
        backend_dir = str(Path(__file__).resolve().parent)
        result = subprocess.run([sys.executable, '-c', script], capture_output=True, text=True, cwd=backend_dir)
        self.assertIn("86400", result.stdout)
    def test_39_patch_7a_rate_limit_spoofing(self):
        # PATCH 7A TEST
        # Verify default uvicorn config is safe and does not use wildcard forwarded_allow_ips
        import subprocess
        import sys
        from pathlib import Path
        backend_dir = str(Path(__file__).resolve().parent)
        # Check Procfile
        with open(os.path.join(backend_dir, "Procfile"), "r") as f:
            procfile_content = f.read()
            self.assertNotIn('--forwarded-allow-ips="*"', procfile_content)
        # Check main.py
        with open(os.path.join(backend_dir, "main.py"), "r") as f:
            main_content = f.read()
            self.assertNotIn('forwarded_allow_ips="*"', main_content)

        # Check dynamic_key_func fallback
        import main
        from fastapi import Request
        from unittest.mock import MagicMock
        req = MagicMock(spec=Request)
        req.cookies.get.return_value = None
        req.client.host = "9.9.9.9"
        key = main.dynamic_key_func(req)
        self.assertEqual(key, "ip:9.9.9.9")

        req.cookies.get.return_value = "invalid_jwt"
        key_invalid = main.dynamic_key_func(req)
        self.assertEqual(key_invalid, "ip:9.9.9.9")

    @patch("services.client.aio.models.embed_content", new_callable=AsyncMock)
    @patch("services.gorouter_client.chat.completions.create", new_callable=AsyncMock)
    async def test_40_patch_7b_async_embedding_used(self, mock_gorouter, mock_embed):
        """PATCH 7B: Verify async embedding and chat completion APIs are used"""
        from services import generate_chat_response
        mock_embed_response = MagicMock()
        mock_embed_response.embeddings = [MagicMock(values=[0.9]*768)]
        mock_embed.return_value = mock_embed_response
        mock_gorouter_response = MagicMock()
        mock_gorouter_response.choices = [MagicMock(message=MagicMock(content="Async response"))]
        mock_gorouter.return_value = mock_gorouter_response
        with patch("services.collection.distinct", new_callable=AsyncMock, return_value=["test.pdf"]), \
             patch("services.collection.aggregate") as mock_aggregate:
            mock_cursor = AsyncMock()
            mock_cursor.to_list = AsyncMock(return_value=[{"filename": "test.pdf", "page": 1, "text": "async data"}])
            mock_aggregate.return_value = mock_cursor
            result = await generate_chat_response("test query", "user@test.com")
            mock_embed.assert_awaited_once()
            mock_gorouter.assert_awaited_once()
            self.assertIn("Async response", result)


class EmojiTestResult(unittest.TextTestResult):
    def addSuccess(self, test):
        unittest.TextTestResult.addSuccess(self, test)
        if self.showAll:
            self.stream.write("✅ [PASS]\n")
            self.stream.flush()

    def addFailure(self, test, err):
        unittest.TextTestResult.addFailure(self, test, err)
        if self.showAll:
            self.stream.write("❌ [FAILED]\n")
            self.stream.flush()

    def addError(self, test, err):
        unittest.TextTestResult.addError(self, test, err)
        if self.showAll:
            self.stream.write("❌ [ERROR]\n")
            self.stream.flush()

class EmojiTestRunner(unittest.TextTestRunner):
    def _makeResult(self):
        return EmojiTestResult(self.stream, self.descriptions, self.verbosity)

if __name__ == '__main__':
    unittest.main(testRunner=EmojiTestRunner(verbosity=2))
