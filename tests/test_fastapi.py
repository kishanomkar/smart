from __future__ import annotations

import unittest

from starlette.testclient import TestClient

from backend.fastapi.api import app


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_status_and_summary(self):
        self.assertEqual(self.client.get("/status").status_code, 200)
        response = self.client.get("/dashboard-summary")
        self.assertEqual(response.status_code, 200)
        self.assertIn("forecast", response.json())
        self.assertIn("network_graph", response.json())

    def test_data_endpoints(self):
        for endpoint in ("/flows", "/forecast", "/attack-progression", "/explanation", "/network"):
            self.assertEqual(self.client.get(endpoint).status_code, 200, endpoint)

    def test_malformed_flow(self):
        response = self.client.post("/analyze-flow", json={"features": {"bad": 1}})
        self.assertEqual(response.status_code, 400)

    def test_pcap_reports_existing_limitation(self):
        response = self.client.post("/analyze-pcap", files={"file": ("sample.pcap", b"not-a-pcap")})
        self.assertEqual(response.status_code, 501)
        self.assertFalse(response.json()["available"])


if __name__ == "__main__":
    unittest.main()
