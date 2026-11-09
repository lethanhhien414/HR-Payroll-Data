"""
routes/department_routes.py
"""

from flask import Blueprint, Response, request
from middleware.auth_middleware import require_auth
from services.department_service import (
    get_all_departments,
    get_department_detail,
    get_department_employees,
    add_department,
    update_department,
    delete_department,
)
import json

department_bp = Blueprint("department", __name__)


def make_resp(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False, default=str),
        status=status,
        content_type="application/json; charset=utf-8"
    )


@department_bp.route("/api/departments", methods=["GET"])
@require_auth
def get_departments():
    name = request.args.get("name") or None
    data = get_all_departments(name)
    if isinstance(data, dict) and "error" in data:
        return make_resp(data, 500)
    return make_resp(data, 200)


@department_bp.route("/api/departments/<int:dep_id>", methods=["GET"])
@require_auth
def get_detail(dep_id):
    data = get_department_detail(dep_id)
    if data is None:
        return make_resp({"error": "Department not found"}, 404)
    if isinstance(data, dict) and "error" in data:
        return make_resp(data, 500)
    return make_resp(data, 200)


# ── NEW: danh sách nhân viên theo phòng ban ──
@department_bp.route("/api/departments/<int:dep_id>/employees", methods=["GET"])
@require_auth
def get_employees_in_dept(dep_id):
    data = get_department_employees(dep_id)
    if isinstance(data, dict) and "error" in data:
        return make_resp(data, 500)
    return make_resp(data, 200)


@department_bp.route("/api/departments", methods=["POST"])
@require_auth
def create_department():
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)
    body = request.get_json(silent=True) or {}
    result, status = add_department(body)
    return make_resp(result, status)


@department_bp.route("/api/departments/<int:dep_id>", methods=["PUT"])
@require_auth
def update_dep(dep_id):
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)
    body = request.get_json(silent=True) or {}
    result, status = update_department(dep_id, body)
    return make_resp(result, status)


@department_bp.route("/api/departments/<int:dep_id>", methods=["DELETE"])
@require_auth
def delete_dep(dep_id):
    result, status = delete_department(dep_id)
    return make_resp(result, status)