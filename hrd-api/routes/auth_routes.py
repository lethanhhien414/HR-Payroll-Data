from flask import Blueprint, Response, request
from services.auth_service import login_user, logout_user
import json

auth_bp = Blueprint("auth", __name__)


def make_resp(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False),
        status=status,
        content_type="application/json; charset=utf-8"
    )


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)

    body = request.get_json(silent=True) or {}
    ip   = request.remote_addr

    # login_user trả (data, status_code) — phải unpack tuple
    result, status = login_user(body, ip)
    return make_resp(result, status)


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return make_resp({"error": "Missing Authorization header"}, 401)

    token = auth_header.split(" ", 1)[1].strip()
    ip    = request.remote_addr

    result, status = logout_user(token, ip)
    return make_resp(result, status)