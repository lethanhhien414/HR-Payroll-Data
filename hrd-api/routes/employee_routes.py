"""
routes/employee_route.py
"""

from flask import Blueprint, Response, request
from middleware.auth_middleware import require_auth
from services.employee_service import (
    get_all_employees,
    get_employee_detail,
    add_employee,
    update_employee,
    delete_employee,
)
import json

employee_bp = Blueprint("employee", __name__)


def make_resp(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False),
        status=status,
        content_type="application/json; charset=utf-8"
    )


# ──────────────────────────────
# GET ALL  (search + filter)
# ──────────────────────────────
@employee_bp.route("/api/employees", methods=["GET"])
@require_auth
def get_employees():
    name       = request.args.get("name")       or None
    department = request.args.get("department") or None
    status     = request.args.get("status")     or None

    data = get_all_employees(name, department, status)

    # service trả list hoặc {"error": ...}
    if isinstance(data, dict) and "error" in data:
        return make_resp(data, 500)

    return make_resp(data, 200)


# ──────────────────────────────
# GET DETAIL
# ──────────────────────────────
@employee_bp.route("/api/employees/<int:emp_id>", methods=["GET"])
@require_auth
def get_employee(emp_id):
    data = get_employee_detail(emp_id)

    if data is None:
        return make_resp({"error": "Employee not found"}, 404)

    if isinstance(data, dict) and "error" in data:
        return make_resp(data, 500)

    return make_resp(data, 200)


# ──────────────────────────────
# CREATE
# ──────────────────────────────
@employee_bp.route("/api/employees", methods=["POST"])
@require_auth
def create_emp():
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)

    body = request.get_json(silent=True) or {}

    # service trả (data, status_code)
    result, status = add_employee(body)
    return make_resp(result, status)


# ──────────────────────────────
# UPDATE
# ──────────────────────────────
@employee_bp.route("/api/employees/<int:emp_id>", methods=["PUT"])
@require_auth
def update_emp(emp_id):
    if not request.is_json:
        return make_resp({"error": "Content-Type must be application/json"}, 400)

    body = request.get_json(silent=True) or {}

    result, status = update_employee(emp_id, body)
    return make_resp(result, status)


# ──────────────────────────────
# DELETE
# ──────────────────────────────
@employee_bp.route("/api/employees/<int:emp_id>", methods=["DELETE"])
@require_auth
def delete_emp(emp_id):
    result, status = delete_employee(emp_id)
    return make_resp(result, status)