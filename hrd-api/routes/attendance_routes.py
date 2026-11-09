"""
routes/attendance_route.py
"""

from flask import Blueprint, Response, request
from middleware.auth_middleware import require_auth
from services.attendance_service import (
    get_all_attendance,
    get_attendance_detail,
    add_attendance,
    update_attendance,
    delete_attendance,
)
import json

attendance_bp = Blueprint("attendance", __name__)


def make_resp(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False),
        status=status,
        content_type="application/json; charset=utf-8"
    )


# ──────────────────────────────
# GET ALL + FILTER
# ──────────────────────────────
@attendance_bp.route("/api/attendance", methods=["GET"])
@require_auth
def get_attendance():
    month       = request.args.get("month")    or None
    employee_id = request.args.get("employee") or None

    if employee_id is not None:
        try:
            employee_id = int(employee_id)
        except ValueError:
            return make_resp({"error": "employee must be a valid integer"}, 400)

    data = get_all_attendance(month, employee_id)

    if isinstance(data, dict) and "error" in data:
        return make_resp(data, 500)

    return make_resp(data, 200)


# ──────────────────────────────
# GET DETAIL
# ──────────────────────────────
@attendance_bp.route("/api/attendance/<int:att_id>", methods=["GET"])
@require_auth
def get_detail(att_id):
    # service trả (data, status_code)
    data, status = get_attendance_detail(att_id)

    if data is None:
        return make_resp({"error": "Attendance record not found"}, 404)

    return make_resp(data, status)


# ──────────────────────────────
# CREATE
# ──────────────────────────────
@attendance_bp.route("/api/attendance", methods=["POST"])
@require_auth
def create_attendance():
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)

    body = request.get_json(silent=True) or {}

    result, status = add_attendance(body)
    return make_resp(result, status)


# ──────────────────────────────
# UPDATE
# ──────────────────────────────
@attendance_bp.route("/api/attendance/<int:att_id>", methods=["PUT"])
@require_auth
def update_att(att_id):
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)

    body = request.get_json(silent=True) or {}

    result, status = update_attendance(att_id, body)
    return make_resp(result, status)


# ──────────────────────────────
# DELETE
# ──────────────────────────────
@attendance_bp.route("/api/attendance/<int:att_id>", methods=["DELETE"])
@require_auth
def delete_att(att_id):
    result, status = delete_attendance(att_id)
    return make_resp(result, status)