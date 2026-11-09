"""
routes/alert_routes.py
-----------------------
Flask Blueprint cho tất cả endpoint Alert.
Dùng AlertService instance từ Flask g (khởi tạo trong app.py before_request).

Endpoints:
  GET  /api/alerts/system-scan        → Quét real-time, trả alert list
  GET  /api/alerts/history            → Lịch sử các lần scan
  POST /api/alerts/<alert_id>/resolve → Đánh dấu đã xử lý
  POST /api/alerts/resolve-bulk       → Xử lý hàng loạt
  GET  /api/alerts/stats              → Thống kê tổng quan
"""

from flask import Blueprint, jsonify, request, g
from datetime import datetime
import uuid

alert_bp = Blueprint("alerts", __name__)

# ─────────────────────────────────────────────
#  IN-MEMORY STORE
# ─────────────────────────────────────────────
_resolved_store: dict = {}  
_alert_history:  list = []   


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def _get_service():
    """Lấy AlertService từ Flask g. Trả về None nếu DB không khả dụng."""
    return getattr(g, "alert_service", None)


def _check_auth():
    """
    Kiểm tra quyền truy cập.
    Ưu tiên g.current_user (set bởi auth middleware), fallback header X-User-Role.
    Trả về (authorized: bool, role: str).
    """
    current_user = getattr(g, "current_user", None)
    if current_user:
        role = str(current_user.get("role", "")).lower()
    else:
        role = request.headers.get("X-User-Role", "").lower()

    return role in ("admin", "manager", "hr", "hr_manager", "payroll_manager"), role


def _make_alert_id(alert: dict) -> str:
    """Tạo ID duy nhất ổn định từ alertId trả sẵn từ service, hoặc tự tính."""
    if alert.get("alertId"):
        return alert["alertId"]
    meta = alert.get("meta", {})
    key  = (
        f"{alert.get('employeeId','')}_"
        f"{alert.get('type','')}_"
        f"{meta.get('salaryMonth') or meta.get('attendanceMonth') or alert.get('date', '')}"
    )
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, key))


def _enrich(alert: dict) -> dict:
    """Gắn alertId + trạng thái resolved vào mỗi alert."""
    aid      = _make_alert_id(alert)
    resolved = _resolved_store.get(aid)
    return {
        **alert,
        "alertId":     aid,
        "resolved":    resolved is not None,
        "resolvedAt":  resolved["resolvedAt"]  if resolved else None,
        "resolvedBy":  resolved["resolvedBy"]  if resolved else None,
        "resolveNote": resolved.get("note")    if resolved else None,
    }


def _parse_month_to_date_str(month_str: str):
    """
    Chuyển 'YYYY-MM' → 'YYYY-MM-01' để truyền vào alert_service.run_full_scan().
    alert_service.fetch_attendance_rows() và fetch_salary_rows() đều dùng dạng này.
    Trả về (date_str | None, error_response | None).
    """
    if not month_str:
        return None, None
    try:
        y, m = month_str.strip().split("-")
        int(y); int(m)  # validate
        return f"{y}-{m}-01", None
    except (ValueError, AttributeError):
        return None, (
            jsonify({"error": "Tham số month không hợp lệ. Dùng định dạng YYYY-MM."}), 400
        )


# ─────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────

@alert_bp.route("/system-scan", methods=["GET"])
def system_scan():
    """
    GET /api/alerts/system-scan
    Query params:
      month            : YYYY-MM  (optional)
      type             : Birthday | Work Anniversary | Salary anomaly | Excessive leave
      severity         : Critical | Warning | Info
      include_resolved : true / false  (default: false)
    """
    authorized, role = _check_auth()
    if not authorized:
        return jsonify({
            "error":   "Unauthorized",
            "message": "Bạn không có quyền xem cảnh báo. Yêu cầu vai trò: Admin, Manager hoặc HR.",
            "role":    role or "unknown",
        }), 403

    # ── Query params ──
    month            = request.args.get("month")           # "YYYY-MM"
    filter_type      = request.args.get("type")
    filter_severity  = request.args.get("severity")
    include_resolved = request.args.get("include_resolved", "false").lower() == "true"

    # FIX: alert_service.run_full_scan() nhận `month_filter` dạng "YYYY-MM-01"
    month_filter_str, err = _parse_month_to_date_str(month)
    if err:
        return err

    # ── Lấy service ──
    svc = _get_service()
    if svc is None:
        return jsonify({
            "error":   "Không thể truy xuất dữ liệu",
            "message": "Hệ thống không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.",
        }), 503

    # ── Chạy scan — FIX: đúng tên param `month_filter` ──
    scan_warnings = {}
    try:
        raw_alerts = svc.run_full_scan(month_filter=month_filter_str)
    except Exception as e:
        print(f"[Alert] scan error: {e}")
        raw_alerts = []
        scan_warnings["scan"] = str(e)

    # ── Enrich ──
    enriched = [_enrich(a) for a in raw_alerts]

    # ── Filter ──
    if not include_resolved:
        enriched = [a for a in enriched if not a["resolved"]]
    if filter_type:
        enriched = [a for a in enriched if a["type"] == filter_type]
    if filter_severity:
        enriched = [a for a in enriched if a["severity"] == filter_severity]

    # ── Ghi lịch sử ──
    _alert_history.append({
        "scannedAt":  datetime.now().isoformat(),
        "scannedBy":  role,
        "totalFound": len(raw_alerts),
        "totalShown": len(enriched),
        "filters": {
            "month":    month,
            "type":     filter_type,
            "severity": filter_severity,
        },
    })
    if len(_alert_history) > 500:
        _alert_history.pop(0)

    resp = {"alerts": enriched, "total": len(enriched)}
    if scan_warnings:
        resp["warnings"] = scan_warnings

    return jsonify(resp), 200


@alert_bp.route("/history", methods=["GET"])
def get_history():
    """GET /api/alerts/history — lịch sử các lần scan."""
    authorized, _ = _check_auth()
    if not authorized:
        return jsonify({"error": "Unauthorized"}), 403

    limit  = min(int(request.args.get("limit", 50)), 200)
    recent = list(reversed(_alert_history))[:limit]
    return jsonify({"history": recent, "total": len(_alert_history)}), 200


@alert_bp.route("/<alert_id>/resolve", methods=["POST"])
def resolve_alert(alert_id: str):
    """
    POST /api/alerts/<alert_id>/resolve
    Body: { "resolvedBy": "tên người xử lý", "note": "ghi chú" }
    """
    authorized, role = _check_auth()
    if not authorized:
        return jsonify({"error": "Unauthorized"}), 403

    # Tránh conflict với route khác
    if alert_id in ("history", "stats", "resolve-bulk", "system-scan"):
        return jsonify({"error": "Invalid alert ID."}), 400

    body        = request.get_json(silent=True) or {}
    resolved_by = body.get("resolvedBy") or role
    note        = body.get("note", "")

    if alert_id in _resolved_store:
        stored = _resolved_store[alert_id]
        return jsonify({
            "message":    "Alert này đã được xử lý trước đó.",
            "resolvedAt": stored["resolvedAt"],
            "resolvedBy": stored["resolvedBy"],
        }), 200

    now = datetime.now().isoformat()
    _resolved_store[alert_id] = {
        "resolvedAt": now,
        "resolvedBy": resolved_by,
        "note":       note,
    }

    return jsonify({
        "success":    True,
        "alertId":    alert_id,
        "resolvedAt": now,
        "resolvedBy": resolved_by,
        "message":    "Đã đánh dấu alert là đã xử lý thành công.",
    }), 200


@alert_bp.route("/resolve-bulk", methods=["POST"])
def resolve_bulk():
    """
    POST /api/alerts/resolve-bulk
    Body: { "alertIds": ["id1","id2"], "resolvedBy": "admin", "note": "" }
    """
    authorized, role = _check_auth()
    if not authorized:
        return jsonify({"error": "Unauthorized"}), 403

    body        = request.get_json(silent=True) or {}
    alert_ids   = body.get("alertIds", [])
    resolved_by = body.get("resolvedBy") or role
    note        = body.get("note", "")

    if not alert_ids:
        return jsonify({"error": "Danh sách alertIds không được để trống."}), 400

    resolved_list = []
    already_list  = []
    now = datetime.now().isoformat()

    for aid in alert_ids:
        if aid in _resolved_store:
            already_list.append(aid)
        else:
            _resolved_store[aid] = {
                "resolvedAt": now,
                "resolvedBy": resolved_by,
                "note":       note,
            }
            resolved_list.append(aid)

    return jsonify({
        "success": True,
        "results": {
            "resolved":        resolved_list,
            "alreadyResolved": already_list,
            "total":           len(alert_ids),
        },
        "message": f"Đã xử lý {len(resolved_list)}/{len(alert_ids)} alert.",
    }), 200


@alert_bp.route("/stats", methods=["GET"])
def get_stats():
    """GET /api/alerts/stats — thống kê tổng quan."""
    authorized, _ = _check_auth()
    if not authorized:
        return jsonify({"error": "Unauthorized"}), 403

    svc = _get_service()
    if svc is None:
        return jsonify({"error": "DB không khả dụng"}), 503

    try:
        # FIX: đúng tên param, không truyền month_filter → lấy toàn bộ
        raw_alerts = svc.run_full_scan(month_filter=None)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    enriched = [_enrich(a) for a in raw_alerts]

    by_type          = {}
    by_sev           = {"Critical": 0, "Warning": 0, "Info": 0}
    resolved_count   = 0
    unresolved_count = 0

    for a in enriched:
        t = a.get("type", "Unknown")
        s = a.get("severity", "Info")
        by_type[t] = by_type.get(t, 0) + 1
        by_sev[s]  = by_sev.get(s, 0) + 1
        if a["resolved"]:
            resolved_count += 1
        else:
            unresolved_count += 1

    return jsonify({
        "total":           len(enriched),
        "totalResolved":   resolved_count,
        "totalUnresolved": unresolved_count,
        "byType":          by_type,
        "bySeverity":      by_sev,
        "scannedAt":       datetime.now().isoformat(),
    }), 200