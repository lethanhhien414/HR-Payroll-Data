"""
services/position_service.py
Master source : HUMAN_2025.Positions (SQL Server)
Sync target   : payroll.positions_payroll (MySQL)
"""

from config.mssql import get_sqlserver_connection
from config.mysql import get_connection


# ──────────────────────────────────────────────
# GET ALL  (FR8)
# Source: SQL Server (HR là master, không đọc từ MySQL)
# ──────────────────────────────────────────────

def get_all_positions(name=None):
    """
    FR8 – Hiển thị danh sách chức vụ.
    Source: HUMAN_2025.Positions (HR là master source)
    """
    conn = None
    try:
        conn   = get_sqlserver_connection()
        cursor = conn.cursor()

        query = """
            SELECT
                p.PositionID,
                p.PositionName,
                COUNT(e.EmployeeID) AS employee_count
            FROM Positions p
            LEFT JOIN Employees e ON p.PositionID = e.PositionID
            WHERE 1=1
        """
        params = []

        if name and name.strip():
            query += " AND p.PositionName LIKE ?"
            params.append(f"%{name.strip()}%")

        query += " GROUP BY p.PositionID, p.PositionName ORDER BY p.PositionID ASC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        return [
            {
                "PositionID":     r[0],
                "PositionName":   r[1],
                "employee_count": r[2],
            }
            for r in rows
        ]

    except Exception as e:
        return {"error": str(e)}

    finally:
        if conn:
            conn.close()


# ──────────────────────────────────────────────
# GET DETAIL
# ──────────────────────────────────────────────

def get_position_detail(pos_id):
    """Trả về chi tiết 1 chức vụ từ HR."""
    conn = None
    try:
        conn   = get_sqlserver_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT p.PositionID, p.PositionName, COUNT(e.EmployeeID)
            FROM Positions p
            LEFT JOIN Employees e ON p.PositionID = e.PositionID
            WHERE p.PositionID = ?
            GROUP BY p.PositionID, p.PositionName
        """, (pos_id,))

        row = cursor.fetchone()
        if not row:
            return None

        return {
            "PositionID":     row[0],
            "PositionName":   row[1],
            "employee_count": row[2],
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        if conn:
            conn.close()


# ──────────────────────────────────────────────
# ADD  (FR8 + FR9)
# Insert HR → sync Payroll, rollback cả 2 nếu lỗi
# ──────────────────────────────────────────────

def add_position(body):
    """
    FR8, FR9 – Thêm chức vụ vào HR và sync sang Payroll.
    """
    if not body or not body.get("PositionName", "").strip():
        return {"error": "PositionName is required"}, 400

    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        # ── Insert HR ──
        sc.execute("""
            INSERT INTO Positions (PositionName)
            OUTPUT INSERTED.PositionID
            VALUES (?)
        """, (body["PositionName"].strip(),))

        new_id = sc.fetchone()[0]

        # ── Sync Payroll ──
        mc.execute("""
            INSERT INTO positions_payroll (PositionID, PositionName)
            VALUES (%s, %s)
        """, (new_id, body["PositionName"].strip()))

        sql_conn.commit()
        mysql_conn.commit()

        return {
            "message":    "Position added and synced successfully",
            "PositionID": new_id,
        }, 201

    except Exception as e:
        if sql_conn:
            try:
                sql_conn.rollback()
            except Exception:
                pass
        if mysql_conn:
            try:
                mysql_conn.rollback()
            except Exception:
                pass
        return {"error": str(e)}, 500

    finally:
        if sql_conn:
            sql_conn.close()
        if mysql_conn:
            mysql_conn.close()


# ──────────────────────────────────────────────
# UPDATE  (FR8 + FR9)
# ──────────────────────────────────────────────

def update_position(pos_id, body):
    """
    FR8, FR9 – Cập nhật tên chức vụ và sync sang Payroll.
    """
    if not body or not body.get("PositionName", "").strip():
        return {"error": "PositionName is required"}, 400

    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        # Kiểm tra tồn tại
        sc.execute("SELECT 1 FROM Positions WHERE PositionID = ?", (pos_id,))
        if not sc.fetchone():
            return {"error": "Position not found"}, 404

        # ── Update HR ──
        sc.execute("""
            UPDATE Positions
            SET PositionName = ?, UpdatedAt = GETDATE()
            WHERE PositionID = ?
        """, (body["PositionName"].strip(), pos_id))

        # ── Sync Payroll ──
        mc.execute("""
            UPDATE positions_payroll
            SET PositionName = %s, SyncedAt = NOW()
            WHERE PositionID = %s
        """, (body["PositionName"].strip(), pos_id))

        sql_conn.commit()
        mysql_conn.commit()

        return {"message": "Position updated and synced successfully"}, 200

    except Exception as e:
        if sql_conn:
            try:
                sql_conn.rollback()
            except Exception:
                pass
        if mysql_conn:
            try:
                mysql_conn.rollback()
            except Exception:
                pass
        return {"error": str(e)}, 500

    finally:
        if sql_conn:
            sql_conn.close()
        if mysql_conn:
            mysql_conn.close()


# ──────────────────────────────────────────────
# DELETE  (FR8 + FR9)
# Chặn xóa nếu có nhân viên đang dùng chức vụ này
# ──────────────────────────────────────────────

def delete_position(pos_id):
    """
    FR8, FR9 – Xóa chức vụ (HR + Payroll mirror).
    Constraint: không xóa nếu có nhân viên đang giữ chức vụ này.
    """
    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        # Kiểm tra tồn tại
        sc.execute("SELECT 1 FROM Positions WHERE PositionID = ?", (pos_id,))
        if not sc.fetchone():
            return {"error": "Position not found"}, 404

        # Kiểm tra nhân viên đang dùng (check HR — source of truth)
        sc.execute("SELECT 1 FROM Employees WHERE PositionID = ?", (pos_id,))
        if sc.fetchone():
            return {
                "error": "Cannot delete position: employees are currently assigned to it"
            }, 409

        # ── Xóa Payroll mirror trước ──
        mc.execute(
            "DELETE FROM positions_payroll WHERE PositionID = %s", (pos_id,)
        )

        # ── Xóa HR ──
        sc.execute("DELETE FROM Positions WHERE PositionID = ?", (pos_id,))

        sql_conn.commit()
        mysql_conn.commit()

        return {"message": "Position deleted and synced successfully"}, 200

    except Exception as e:
        if sql_conn:
            try:
                sql_conn.rollback()
            except Exception:
                pass
        if mysql_conn:
            try:
                mysql_conn.rollback()
            except Exception:
                pass
        return {"error": str(e)}, 500

    finally:
        if sql_conn:
            sql_conn.close()
        if mysql_conn:
            mysql_conn.close()