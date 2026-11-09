import datetime
import jwt
from config.auth_config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    JWT_EXPIRE_MINUTES,
    ADMIN_ACCOUNT,
)

_revoked_tokens: set = set()


def _generate_token(user):
    payload = {
        "sub":     user["username"],
        "role":    user["role"],
        "user_id": user["user_id"],
        "exp":     datetime.datetime.utcnow() + datetime.timedelta(minutes=JWT_EXPIRE_MINUTES),
        "iat":     datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def login_user(body, ip="unknown"):
    if not body:
        return {"error": "Missing request body"}, 400

    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()

    if not username or not password:
        return {"error": "username and password are required"}, 400

    if username != ADMIN_ACCOUNT["username"] or password != ADMIN_ACCOUNT["password"]:
        return {"error": "Invalid username or password"}, 401

    token = _generate_token(ADMIN_ACCOUNT)

    return {
        "message":    "Login successful",
        "token":      token,
        "role":       ADMIN_ACCOUNT["role"],
        "username":   username,
        "expires_in": JWT_EXPIRE_MINUTES * 60,
    }, 200


def logout_user(token_str, ip="unknown"):
    _revoked_tokens.add(token_str)
    return {"message": "Logged out successfully"}, 200


def verify_token(token_str):
    if token_str in _revoked_tokens:
        raise ValueError("Token has been revoked")

    try:
        payload = jwt.decode(token_str, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")