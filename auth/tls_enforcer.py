import ssl
import logging
from functools import wraps
from flask import Flask, request, jsonify, redirect

logger = logging.getLogger(__name__)

# Minimum required TLS version
MIN_TLS_VERSION = ssl.TLSVersion.TLSv1_2

# Allowed TLS versions (1.2 and 1.3 only)
ALLOWED_TLS_VERSIONS = {"TLSv1.2", "TLSv1.3"}

# Cipher suites approved for TLS 1.2+
APPROVED_CIPHER_SUITES = [
    "ECDHE-ECDSA-AES256-GCM-SHA384",
    "ECDHE-RSA-AES256-GCM-SHA384",
    "ECDHE-ECDSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES128-GCM-SHA256",
    "ECDHE-ECDSA-CHACHA20-POLY1305",
    "ECDHE-RSA-CHACHA20-POLY1305",
    "DHE-RSA-AES256-GCM-SHA384",
    "DHE-RSA-AES128-GCM-SHA256",
]


def create_tls_context(
    certfile: str,
    keyfile: str,
    cafile: str = None,
    verify_client: bool = False,
) -> ssl.SSLContext:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = MIN_TLS_VERSION
    context.options |= ssl.OP_NO_SSLv2
    context.options |= ssl.OP_NO_SSLv3
    context.options |= ssl.OP_NO_TLSv1
    context.options |= ssl.OP_NO_TLSv1_1
    context.options |= ssl.OP_NO_COMPRESSION
    context.options |= ssl.OP_CIPHER_SERVER_PREFERENCE
    context.options |= ssl.OP_SINGLE_DH_USE
    context.options |= ssl.OP_SINGLE_ECDH_USE
    context.load_cert_chain(certfile=certfile, keyfile=keyfile)
    if verify_client:
        context.verify_mode = ssl.CERT_REQUIRED
        if cafile:
            context.load_verify_locations(cafile=cafile)
        else:
            context.load_default_certs()
    else:
        context.verify_mode = ssl.CERT_NONE
    context.set_ciphers(":".join(APPROVED_CIPHER_SUITES))
    return context


def require_https(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        forwarded_proto = request.headers.get("X-Forwarded-Proto", "").lower()
        if request.scheme != "https" and forwarded_proto != "https":
            return jsonify({"error": "HTTPS required", "message": "Authentication endpoints must be accessed over HTTPS/TLS 1.2+."}), 403
        return f(*args, **kwargs)
    return decorated_function


def https_redirect(app: Flask) -> None:
    @app.before_request
    def _redirect_to_https():
        forwarded_proto = request.headers.get("X-Forwarded-Proto", "").lower()
        if request.scheme == "http" and forwarded_proto != "https":
            https_url = request.url.replace("http://", "https://", 1)
            return redirect(https_url, code=301)


def add_security_headers(response):
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response


def register_tls_enforcement(app: Flask) -> None:
    https_redirect(app)
    app.after_request(add_security_headers)
