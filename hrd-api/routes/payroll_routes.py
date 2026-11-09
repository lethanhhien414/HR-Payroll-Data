# routes/payroll_routes.py
from flask import Blueprint, Response, request
from services.payroll_service import (
    calculate_payroll,
    get_payroll,
    get_payroll_detail,
    get_salary_history,
    check_salary_anomaly,
)
import json

payroll_bp = Blueprint("payroll", __name__)


def make_resp(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False, default=str),
        status=status,
        content_type="application/json; charset=utf-8",
    )


# ──────────────────────────────────────────────
# POST /api/payroll/calculate
# ──────────────────────────────────────────────
@payroll_bp.route("/api/payroll/calculate", methods=["POST"])
def calculate():
    try:
        if not request.is_json:
            return make_resp({"error": "Invalid JSON"}, 400)

        body   = request.json
        emp_id = body.get("EmployeeID")
        month  = body.get("SalaryMonth")

        if not isinstance(emp_id, int):
            return make_resp({"error": "EmployeeID must be integer"}, 400)
        if not month or not isinstance(month, str):
            return make_resp({"error": "Invalid SalaryMonth"}, 400)

        result, status = calculate_payroll(
            emp_id, month,
            body.get("Bonus", 0),
            body.get("Deductions", 0),
        )
        return make_resp(result, status)

    except Exception as e:
        return make_resp({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# GET /api/payroll
# ──────────────────────────────────────────────
@payroll_bp.route("/api/payroll", methods=["GET"])
def get_all():
    try:
        month      = request.args.get("month") or None
        department = request.args.get("department") or None

        if department in ["", "all", "All Departments"]:
            department = None

        data = get_payroll(month, department)

        # get_payroll trả list hoặc dict (lỗi)
        if isinstance(data, dict) and "error" in data:
            return make_resp(data, 500)

        return make_resp(data, 200)

    except Exception as e:
        return make_resp({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# GET /api/payroll/<emp_id>
# ──────────────────────────────────────────────
@payroll_bp.route("/api/payroll/<int:emp_id>", methods=["GET"])
def detail(emp_id):
    try:
        data = get_payroll_detail(emp_id)
        if data is None:
            return make_resp({"error": "Payroll not found"}, 404)
        if isinstance(data, dict) and "error" in data:
            return make_resp(data, 500)
        return make_resp(data, 200)

    except Exception as e:
        return make_resp({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# GET /api/payroll/history/<emp_id>
# ──────────────────────────────────────────────
@payroll_bp.route("/api/payroll/history/<int:emp_id>", methods=["GET"])
def history(emp_id):
    try:
        data = get_salary_history(emp_id)
        if isinstance(data, dict) and "error" in data:
            return make_resp(data, 500)
        return make_resp(data, 200)

    except Exception as e:
        return make_resp({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# GET /api/payroll/alert/<emp_id>
# ──────────────────────────────────────────────
@payroll_bp.route("/api/payroll/alert/<int:emp_id>", methods=["GET"])
def alert(emp_id):
    try:
        data = check_salary_anomaly(emp_id)
        if isinstance(data, dict) and "error" in data:
            return make_resp(data, 500)
        return make_resp(data, 200)

    except Exception as e:
        return make_resp({"error": str(e)}, 500)
    
# Thêm vào dòng import
from services.payroll_service import (
    calculate_payroll,
    get_payroll,
    get_payroll_detail,
    get_salary_history,
    check_salary_anomaly,
    update_payroll,          # ← thêm dòng này
)

# Thêm route PUT vào cuối file
@payroll_bp.route("/api/payroll/<int:salary_id>", methods=["PUT"])
def update(salary_id):
    try:
        if not request.is_json:
            return make_resp({"error": "Invalid JSON"}, 400)

        body = request.json
        bonus      = body.get("Bonus")
        deductions = body.get("Deductions")
        net_salary = body.get("NetSalary")

        if bonus is None or deductions is None or net_salary is None:
            return make_resp({"error": "Bonus, Deductions, NetSalary are required"}, 400)

        result, status = update_payroll(salary_id, bonus, deductions, net_salary)
        return make_resp(result, status)

    except Exception as e:
        return make_resp({"error": str(e)}, 500)