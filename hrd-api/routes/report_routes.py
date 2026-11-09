# routes/report_routes.py
from flask import Blueprint, Response, request
from services.report_service import (
    get_dashboard,
    get_department_report,
    get_salary_trend,
    get_top_employees,
    get_all_alerts,
    get_dividend_report,
)
import json

report_bp = Blueprint("report", __name__)


def make_resp(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False, default=str),
        status=status,
        content_type="application/json; charset=utf-8",
    )


# ──────────────────────────────────────────────
# GET /api/reports/dashboard
# ──────────────────────────────────────────────
@report_bp.route("/api/reports/dashboard", methods=["GET"])
def dashboard():
    try:
        month = request.args.get("month") or None
        data, status = get_dashboard(month)
        return make_resp(data, status)
    except Exception as e:
        return make_resp({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# GET /api/reports/departments
# ──────────────────────────────────────────────
@report_bp.route("/api/reports/departments", methods=["GET"])
def department_report():
    try:
        month = request.args.get("month") or None
        data, status = get_department_report(month)
        return make_resp(data, status)
    except Exception as e:
        return make_resp({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# GET /api/reports/trend
# ──────────────────────────────────────────────
@report_bp.route("/api/reports/trend", methods=["GET"])
def trend():
    try:
        emp_id = request.args.get("employee")
        if emp_id:
            try:
                emp_id = int(emp_id)
            except ValueError:
                return make_resp({"error": "Invalid employee id"}, 400)
        else:
            emp_id = None

        data, status = get_salary_trend(emp_id)
        return make_resp(data, status)
    except Exception as e:
        return make_resp({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# GET /api/reports/top
# ──────────────────────────────────────────────
@report_bp.route("/api/reports/top", methods=["GET"])
def top():
    try:
        limit = request.args.get("limit", 5)
        try:
            limit = int(limit)
        except ValueError:
            return make_resp({"error": "Invalid limit"}, 400)

        data, status = get_top_employees(limit)
        return make_resp(data, status)
    except Exception as e:
        return make_resp({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# GET /api/alerts
# ──────────────────────────────────────────────
@report_bp.route("/api/alerts", methods=["GET"])
def alerts():
    try:
        data, status = get_all_alerts()
        return make_resp(data, status)
    except Exception as e:
        return make_resp({"error": str(e)}, 500)

# ──────────────────────────────────────────────
# GET /api/reports/dividends
# ──────────────────────────────────────────────
@report_bp.route("/api/reports/dividends", methods=["GET"])
def dividends():
    try:
        data, status = get_dividend_report()
        return make_resp(data, status)
    except Exception as e:
        return make_resp({"error": str(e)}, 500)