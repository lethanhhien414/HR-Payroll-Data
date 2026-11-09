from flask import Flask, g
from flask_cors import CORS
from routes.employee_routes   import employee_bp
from routes.department_routes import department_bp
from routes.attendance_routes import attendance_bp
from routes.position_routes   import position_bp
from routes.payroll_routes    import payroll_bp
from routes.report_routes     import report_bp
from routes.auth_routes       import auth_bp
from routes.alert_routes      import alert_bp
from services.alert_service   import AlertService
from config.mysql  import get_connection
from config.mssql  import get_sqlserver_connection

app = Flask(__name__)

# ── CORS ─────────────────────────────────────────────────────────────
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-User-Role"],
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
)

# ── Blueprints ────────────────────────────────────────────────────────
app.register_blueprint(employee_bp)
app.register_blueprint(department_bp)
app.register_blueprint(attendance_bp)
app.register_blueprint(position_bp)
app.register_blueprint(payroll_bp)
app.register_blueprint(report_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(alert_bp, url_prefix="/api/alerts")

# ── Per-request DB connections ────────────────────────────────────────
# FIX: mở connection lazy (chỉ khi cần), đóng sau mỗi request
#      tránh connection pool exhausted gây timeout → CORS error giả

@app.before_request
def open_db():
    """Mở 2 DB connections và gắn vào g — dùng chung trong 1 request."""
    try:
        g.mysql_conn  = get_connection()
        g.mssql_conn  = get_sqlserver_connection()
        g.alert_service = AlertService(g.mysql_conn, g.mssql_conn)
    except Exception as e:
        # Không crash app nếu DB tạm thời unavailable
        print(f"[DB] open_db error: {e}")
        g.mysql_conn    = None
        g.mssql_conn    = None
        g.alert_service = None

    # Current user — thay bằng JWT decode thực tế ở auth_middleware
    g.current_user = {"id": 1, "role": "admin"}


@app.teardown_request
def close_db(exc=None):
    """Đóng connections sau mỗi request dù thành công hay lỗi."""
    mysql_conn = g.pop("mysql_conn", None)
    mssql_conn = g.pop("mssql_conn", None)

    if mysql_conn:
        try:
            mysql_conn.close()
        except Exception:
            pass

    if mssql_conn:
        try:
            mssql_conn.close()
        except Exception:
            pass

@app.route("/")
def home():
    return "Backend is running!"


if __name__ == "__main__":
    app.run(debug=True)