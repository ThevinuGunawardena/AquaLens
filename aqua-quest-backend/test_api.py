"""End-to-end API contract tests for Aqua Quest backend."""

from __future__ import annotations

import os
from pathlib import Path
import tempfile
import unittest

from fastapi.testclient import TestClient


class AquaQuestApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.db_file = Path(self.tmp_dir.name) / "test_aqua_quest.db"

        import database
        import main

        database.DB_PATH = self.db_file
        self.client_ctx = TestClient(main.app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self) -> None:
        self.client_ctx.__exit__(None, None, None)
        self.tmp_dir.cleanup()

    def test_full_angler_flow(self) -> None:
        # 1. Health check
        health = self.client.get("/").json()
        self.assertTrue(health["success"])
        self.assertEqual(health["message"], "Aqua Quest API is running")

        # 2. Register new account
        reg = self.client.post(
            "/auth/register",
            json={
                "name": "Test Angler",
                "email": "angler@example.com",
                "password": "Password123!",
            },
        )
        self.assertEqual(reg.status_code, 200)
        reg_body = reg.json()
        self.assertTrue(reg_body["success"])
        token = reg_body["data"]["access_token"]
        user = reg_body["data"]["user"]
        self.assertEqual(user["email"], "angler@example.com")
        self.assertFalse(user["tutorial_seen"])
        headers = {"Authorization": f"Bearer {token}"}

        # Duplicate email rejected
        dup = self.client.post(
            "/auth/register",
            json={
                "name": "Test Angler",
                "email": "angler@example.com",
                "password": "Password123!",
            },
        )
        self.assertEqual(dup.status_code, 409)

        # 3. Login via OAuth2 form
        login_res = self.client.post(
            "/auth/login",
            data={"username": "angler@example.com", "password": "Password123!"},
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.json()["data"]["access_token"])

        # 4. Tutorial flow
        tut = self.client.get("/tutorial/upload-photo").json()
        self.assertEqual(len(tut["data"]["steps"]), 3)

        done_tut = self.client.post("/users/me/tutorial-complete", headers=headers)
        self.assertEqual(done_tut.status_code, 200)
        self.assertTrue(done_tut.json()["data"]["tutorial_seen"])

        # 5. Species list & search
        species_list = self.client.get("/species/").json()["data"]
        self.assertGreaterEqual(len(species_list), 10)
        first_species_id = species_list[0]["id"]

        filtered = self.client.get("/species/?q=tuna").json()["data"]
        self.assertEqual(len(filtered), 1)

        # 6. Upload image & log catch
        img_bytes = b"\x89PNG\r\n\x1a\nfakepngbytes"
        up = self.client.post(
            "/catches/upload-image",
            headers=headers,
            files={"file": ("catch.png", img_bytes, "image/png")},
        )
        self.assertEqual(up.status_code, 200)
        uploaded_url = up.json()["data"]["url"]
        self.assertTrue(uploaded_url.startswith("/static/uploads/"))

        # Clean up uploaded test file right after verifying static serving
        static_res = self.client.get(uploaded_url)
        self.assertEqual(static_res.status_code, 200)
        uploaded_file = Path(__file__).resolve().parent / uploaded_url.lstrip("/")
        if uploaded_file.exists():
            os.remove(uploaded_file)

        catch_res = self.client.post(
            "/catches/",
            headers=headers,
            json={
                "species_id": first_species_id,
                "length_cm": 55.5,
                "remarks": "Great morning strike",
                "boat_number": "LK-102",
                "image": uploaded_url,
            },
        )
        self.assertEqual(catch_res.status_code, 200)
        catch_data = catch_res.json()["data"]
        self.assertGreaterEqual(catch_data["xp_awarded"], 175)
        self.assertGreaterEqual(len(catch_data["newly_unlocked_achievements"]), 3)

        # 7. Mine catches, profile update, achievements, certificate
        mine = self.client.get("/catches/mine?limit=10&offset=0", headers=headers).json()
        self.assertEqual(mine["total"], 1)
        self.assertEqual(len(mine["data"]), 1)

        prof = self.client.patch(
            "/users/me",
            headers=headers,
            json={"name": "Captain Angler", "district": "Colombo"},
        )
        self.assertEqual(prof.status_code, 200)
        self.assertEqual(prof.json()["data"]["name"], "Captain Angler")
        self.assertEqual(prof.json()["data"]["district"], "Colombo")

        achs = self.client.get("/achievements/", headers=headers).json()["data"]
        self.assertTrue(any(a["completed"] for a in achs))

        cert = self.client.get("/certificate/eligibility", headers=headers).json()["data"]
        self.assertEqual(cert["total_catches"], 1)
        self.assertFalse(cert["eligible"])


if __name__ == "__main__":
    unittest.main()
