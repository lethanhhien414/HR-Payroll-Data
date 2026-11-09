"""
middleware/auth_middleware.py
JWT middleware dùng chung cho tất cả routes.
Vì chỉ có 1 Admin đăng nhập → tất cả routes đều require Admin role.
"""

from functools import wraps
from flask import request, Response
from services.auth_service import verify_token
import json


def _json_response(data, status):
    return Response(
        json.dumps(data, ensure_ascii=False),
        status=status,
        content_type="application/json; charset=utf-8"
    )


def require_auth(f):
    """
    Decorator bảo vệ route bằng JWT.
    Lấy token từ header: Authorization: Bearer <token>
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return _json_response({"error": "Missing or invalid Authorization header"}, 401)

        token = auth_header.split(" ", 1)[1].strip()

        try:
            payload = verify_token(token)
            # Gắn payload vào request để route dùng nếu cần
            request.current_user = payload
        except ValueError as e:
            return _json_response({"error": str(e)}, 401)

        return f(*args, **kwargs)

    return decorated