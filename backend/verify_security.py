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

class TestVaultAISecurityAndRAG(unittest.IsolatedAsyncioTestCase):

    @patch("services.collection")
    @patch("services.client.models.embed_content")
    @patch("services.gorouter_client.chat.completions.create")
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
    @patch("services.client.models.embed_content")
    @patch("services.gorouter_client.chat.completions.create")
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
    @patch("services.client.models.embed_content")
    @patch("services.gorouter_client.chat.completions.create")
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
    @patch("services.client.models.embed_content")
    @patch("services.gorouter_client.chat.completions.create")
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

    def test_11_csrf_valid_token_and_auth(self):
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
