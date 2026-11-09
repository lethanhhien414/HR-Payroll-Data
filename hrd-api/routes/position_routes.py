"""
routes/position_route.py
"""

from flask import Blueprint, Response, request
from middleware.auth_middleware import require_auth
from services.position_service import (
    get_all_positions,
    get_position_detail,
    add_position,
    update_position,
    delete_position,
)
import json

position_bp = Blueprint("position", __name__)


def make_resp(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False),
        status=status,
        content_type="application/json; charset=utf-8"
    )


# ──────────────────────────────
# GET ALL + SEARCH
# ──────────────────────────────
@position_bp.route("/api/positions", methods=["GET"])
@require_auth
def get_positions():
    name = request.args.get("name") or None

    data = get_all_positions(name)

    if isinstance(data, dict) and "error" in data:
        return make_resp(data, 500)

    return make_resp(data, 200)


# ──────────────────────────────
# GET DETAIL
# ──────────────────────────────
@position_bp.route("/api/positions/<int:pos_id>", methods=["GET"])
@require_auth
def get_detail(pos_id):
    data = get_position_detail(pos_id)

    if data is None:
        return make_resp({"error": "Position not found"}, 404)

    if isinstance(data, dict) and "error" in data:
        return make_resp(data, 500)

    return make_resp(data, 200)


# ──────────────────────────────
# CREATE
# ──────────────────────────────
@position_bp.route("/api/positions", methods=["POST"])
@require_auth
def create_position():
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)

    body = request.get_json(silent=True) or {}

    result, status = add_position(body)
    return make_resp(result, status)


# ──────────────────────────────
# UPDATE
# ──────────────────────────────
@position_bp.route("/api/positions/<int:pos_id>", methods=["PUT"])
@require_auth
def update_pos(pos_id):
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)

    body = request.get_json(silent=True) or {}

    result, status = update_position(pos_id, body)
    return make_resp(result, status)


# ──────────────────────────────
# DELETE
# ──────────────────────────────
@position_bp.route("/api/positions/<int:pos_id>", methods=["DELETE"])
@require_auth
def delete_pos(pos_id):
    result, status = delete_position(pos_id)
    return make_resp(result, status)