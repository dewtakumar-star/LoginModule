"""Unit tests for auth.tls_enforcer — TLS 1.2+ enforcement."""
import ssl
import pytest
from unittest.mock import patch
from flask import Flask

from auth.tls_enforcer import (
    require_https, add_security_headers, register_tls_enforcement,
    create_tls_context, ALLOWED_TLS_VERSIONS, APPROVED_CIPHER_SUITES, MIN_TLS_VERSION,
)

@pytest.fixture()
def base_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    @app.route("/auth/login", methods=["POST"])
    @require_https
    def login():
        return {"token": "abc"}, 200
    @app.route("/public", methods=["GET"])
    def public():
        return {"ok": True}, 200
    return app

@pytest.fixture()
def enforced_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    register_tls_enforcement(app)
    @app.route("/auth/login", methods=["POST"])
    def login():
        return {"token": "abc"}, 200
    @app.route("/public", methods=["GET"])
    def public():
        return {"ok": True}, 200
    return app

class TestRequireHttpsDecorator:
    def test_allows_https_request(self, base_app):
        with base_app.test_client() as client:
            response = client.post("/auth/login", base_url="https://localhost", json={})
            assert response.status_code == 200

    def test_blocks_http_request(self, base_app):
        with base_app.test_client() as client:
            response = client.post("/auth/login", base_url="http://localhost", json={})
            assert response.status_code == 403

    def test_error_body_on_http(self, base_app):
        with base_app.test_client() as client:
            response = client.post("/auth/login", base_url="http://localhost", json={})
            data = response.get_json()
            assert data["error"] == "HTTPS required"
            assert "TLS 1.2" in data["message"]

    def test_allows_request_with_forwarded_proto_https(self, base_app):
        with base_app.test_client() as client:
            response = client.post("/auth/login", base_url="http://localhost", headers={"X-Forwarded-Proto": "https"}, json={})
            assert response.status_code == 200

    def test_blocks_request_with_forwarded_proto_http(self, base_app):
        with base_app.test_client() as client:
            response = client.post("/auth/login", base_url="http://localhost", headers={"X-Forwarded-Proto": "http"}, json={})
            assert response.status_code == 403

class TestHttpsRedirect:
    def test_http_redirected_to_https(self, enforced_app):
        with enforced_app.test_client() as client:
            response = client.get("/public", base_url="http://localhost")
            assert response.status_code == 301
            assert response.headers["Location"].startswith("https://")

    def test_https_not_redirected(self, enforced_app):
        with enforced_app.test_client() as client:
            response = client.get("/public", base_url="https://localhost")
            assert response.status_code == 200

    def test_forwarded_proto_https_not_redirected(self, enforced_app):
        with enforced_app.test_client() as client:
            response = client.get("/public", base_url="http://localhost", headers={"X-Forwarded-Proto": "https"})
            assert response.status_code == 200

class TestSecurityHeaders:
    def test_hsts_header_present(self, enforced_app):
        with enforced_app.test_client() as client:
            resp = client.get("/public", base_url="https://localhost")
            hsts = resp.headers.get("Strict-Transport-Security", "")
            assert "max-age=31536000" in hsts
            assert "includeSubDomains" in hsts
            assert "preload" in hsts

    def test_no_cache_headers(self, enforced_app):
        with enforced_app.test_client() as client:
            resp = client.get("/public", base_url="https://localhost")
            assert resp.headers.get("Cache-Control") == "no-store"
            assert resp.headers.get("Pragma") == "no-cache"

    def test_x_content_type_options(self, enforced_app):
        with enforced_app.test_client() as client:
            resp = client.get("/public", base_url="https://localhost")
            assert resp.headers.get("X-Content-Type-Options") == "nosniff"

    def test_x_frame_options(self, enforced_app):
        with enforced_app.test_client() as client:
            resp = client.get("/public", base_url="https://localhost")
            assert resp.headers.get("X-Frame-Options") == "DENY"

    def test_referrer_policy(self, enforced_app):
        with enforced_app.test_client() as client:
            resp = client.get("/public", base_url="https://localhost")
            assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

class TestCreateTlsContext:
    @patch("ssl.SSLContext.load_cert_chain")
    @patch("ssl.SSLContext.set_ciphers")
    def test_minimum_tls_version_is_1_2(self, mock_ciphers, mock_chain):
        ctx = create_tls_context(certfile="cert.pem", keyfile="key.pem")
        assert ctx.minimum_version == ssl.TLSVersion.TLSv1_2

    @patch("ssl.SSLContext.load_cert_chain")
    @patch("ssl.SSLContext.set_ciphers")
    def test_tls_1_0_and_1_1_disabled(self, mock_ciphers, mock_chain):
        ctx = create_tls_context(certfile="cert.pem", keyfile="key.pem")
        assert ctx.options & ssl.OP_NO_TLSv1
        assert ctx.options & ssl.OP_NO_TLSv1_1

    @patch("ssl.SSLContext.load_cert_chain")
    @patch("ssl.SSLContext.set_ciphers")
    def test_ssl_v2_and_v3_disabled(self, mock_ciphers, mock_chain):
        ctx = create_tls_context(certfile="cert.pem", keyfile="key.pem")
        assert ctx.options & ssl.OP_NO_SSLv2
        assert ctx.options & ssl.OP_NO_SSLv3

    @patch("ssl.SSLContext.load_cert_chain")
    @patch("ssl.SSLContext.set_ciphers")
    def test_compression_disabled(self, mock_ciphers, mock_chain):
        ctx = create_tls_context(certfile="cert.pem", keyfile="key.pem")
        assert ctx.options & ssl.OP_NO_COMPRESSION

    @patch("ssl.SSLContext.load_cert_chain")
    @patch("ssl.SSLContext.set_ciphers")
    def test_approved_ciphers_applied(self, mock_ciphers, mock_chain):
        create_tls_context(certfile="cert.pem", keyfile="key.pem")
        mock_ciphers.assert_called_once_with(":".join(APPROVED_CIPHER_SUITES))

    @patch("ssl.SSLContext.load_verify_locations")
    @patch("ssl.SSLContext.load_cert_chain")
    @patch("ssl.SSLContext.set_ciphers")
    def test_mutual_tls_sets_cert_required(self, mock_ciphers, mock_chain, mock_verify):
        ctx = create_tls_context(certfile="cert.pem", keyfile="key.pem", cafile="ca.pem", verify_client=True)
        assert ctx.verify_mode == ssl.CERT_REQUIRED
        mock_verify.assert_called_once_with(cafile="ca.pem")

    @patch("ssl.SSLContext.load_cert_chain")
    @patch("ssl.SSLContext.set_ciphers")
    def test_no_mutual_tls_by_default(self, mock_ciphers, mock_chain):
        ctx = create_tls_context(certfile="cert.pem", keyfile="key.pem")
        assert ctx.verify_mode == ssl.CERT_NONE

class TestTlsConstants:
    def test_min_tls_version_is_tls12(self):
        assert MIN_TLS_VERSION == ssl.TLSVersion.TLSv1_2

    def test_allowed_versions_exclude_legacy(self):
        assert "SSLv2" not in ALLOWED_TLS_VERSIONS
        assert "SSLv3" not in ALLOWED_TLS_VERSIONS
        assert "TLSv1" not in ALLOWED_TLS_VERSIONS
        assert "TLSv1.1" not in ALLOWED_TLS_VERSIONS

    def test_allowed_versions_include_modern(self):
        assert "TLSv1.2" in ALLOWED_TLS_VERSIONS
        assert "TLSv1.3" in ALLOWED_TLS_VERSIONS

    def test_no_weak_ciphers_in_approved_list(self):
        weak_patterns = ["RC4", "DES", "3DES", "NULL", "EXPORT", "MD5", "anon"]
        for cipher in APPROVED_CIPHER_SUITES:
            for pattern in weak_patterns:
                assert pattern not in cipher

    def test_all_approved_ciphers_use_forward_secrecy(self):
        for cipher in APPROVED_CIPHER_SUITES:
            assert cipher.startswith(("ECDHE", "DHE"))
