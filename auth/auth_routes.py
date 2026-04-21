import logging
from flask import Flask, request, jsonify
from .tls_enforcer import require_https, register_tls_enforcement, create_tls_context

logger = logging.getLogger(__name__)

app = Flask(__name__)
register_tls_enforcement(app)

@app.route("/auth/login", methods=["POST"])
@require_https
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request", "message": "JSON body required."}), 400
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Missing credentials", "message": "username and password are required."}), 400
    if username == "admin" and password == "s3cr3t":
        return jsonify({"token": "mocked-jwt-token-for-admin", "token_type": "Bearer"}), 200
    return jsonify({"error": "Unauthorized", "message": "Invalid credentials."}), 401

@app.route("/auth/logout", methods=["POST"])
@require_https
def logout():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized", "message": "Valid Bearer token required."}), 401
    return jsonify({"message": "Successfully logged out."}), 200

@app.route("/auth/refresh", methods=["POST"])
@require_https
def refresh_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized", "message": "Valid Bearer token required."}), 401
    return jsonify({"token": "mocked-refreshed-jwt-token", "token_type": "Bearer"}), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    tls_context = create_tls_context(certfile="certs/server.crt", keyfile="certs/server.key")
    app.run(host="0.0.0.0", port=443, ssl_context=tls_context)
