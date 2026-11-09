"""
services/attendance_service.py
Source: payroll (MySQL) — attendance, employees_payroll
"""

import datetime
from config.mysql import get_connection


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def _validate_date(date_str):
    try:
        datetime.datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except Exception:
        return False


def _row_to_dict(row):
    return {
        "AttendanceID":   row[0],
        "EmployeeID":     row[1],
        "FullName":       row[2],
        "WorkDays":       row[3],
        "AbsentDays":     row[4],
        "LeaveDays":      row[5],
        "AttendanceMonth": str(row[6]),
    }


# ──────────────────────────────────────────────
# GET ALL + FILTER  (FR12)
# ──────────────────────────────────────────────

def get_all_attendance(month=None, employee_id=None):
    """
    FR12 – Hiển thị dữ liệu chấm công, lọc theo tháng hoặc nhân viên.
    """
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        query = """
            SELECT
                a.AttendanceID,
                a.EmployeeID,
                e.FullName,
                a.WorkDays,
                a.AbsentDays,
                a.LeaveDays,
                a.AttendanceMonth
            FROM attendance a
            JOIN employees_payroll e ON a.EmployeeID = e.EmployeeID
            WHERE 1=1
        """
        params = []

        if month:
            query += " AND DATE_FORMAT(a.AttendanceMonth, '%%Y-%%m') = %s"
            params.append(month)

        if employee_id:
            query += " AND a.EmployeeID = %s"
            params.append(employee_id)

        query += " ORDER BY a.AttendanceMonth DESC, e.FullName ASC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        return [_row_to_dict(r) for r in rows]

    except Exception as e:
        return {"error": str(e)}

    finally:
        if conn:
            conn.close()


# ──────────────────────────────────────────────
# GET DETAIL
# ──────────────────────────────────────────────

def get_attendance_detail(att_id):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                a.AttendanceID,
                a.EmployeeID,
                e.FullName,
                a.WorkDays,
                a.AbsentDays,
                a.LeaveDays,
                a.AttendanceMonth
            FROM attendance a
            JOIN employees_payroll e ON a.EmployeeID = e.EmployeeID
            WHERE a.AttendanceID = %s
        """, (att_id,))

        row = cursor.fetchone()
        if not row:
            return None, 404

        return _row_to_dict(row), 200

    except Exception as e:
        return {"error": str(e)}, 500

    finally:
        if conn:
            conn.close()


# ──────────────────────────────────────────────
# ADD  (FR12)
# ──────────────────────────────────────────────

def add_attendance(body):
    """
    FR12 – Thêm bản ghi chấm công mới.
    Validation: WorkDays ≤ 26, tổng ≤ 31, không trùng tháng.
    """
    required = ["EmployeeID", "WorkDays", "AbsentDays", "LeaveDays", "AttendanceMonth"]
    for k in required:
        if k not in body:
            return {"error": f"Missing required field: {k}"}, 400

    if not _validate_date(body["AttendanceMonth"]):
        return {"error": "Invalid date format. Use YYYY-MM-DD"}, 400

    try:
        wd = int(body["WorkDays"])
        ad = int(body["AbsentDays"])
        ld = int(body["LeaveDays"])
    except (ValueError, TypeError):
        return {"error": "WorkDays, AbsentDays, LeaveDays must be integers"}, 400

    if wd < 0 or ad < 0 or ld < 0:
        return {"error": "Days must be >= 0"}, 400
    if wd > 26:
        return {"error": "WorkDays cannot exceed 26"}, 400
    if wd + ad + ld > 31:
        return {"error": "Total days (WorkDays + AbsentDays + LeaveDays) cannot exceed 31"}, 400

    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # Kiểm tra nhân viên tồn tại
        cursor.execute(
            "SELECT 1 FROM employees_payroll WHERE EmployeeID = %s",
            (body["EmployeeID"],)
        )
        if not cursor.fetchone():
            return {"error": "Employee not found"}, 404

        # Kiểm tra trùng tháng
        cursor.execute("""
            SELECT 1 FROM attendance
            WHERE EmployeeID = %s AND AttendanceMonth = %s
        """, (body["EmployeeID"], body["AttendanceMonth"]))
        if cursor.fetchone():
            return {"error": "Attendance record already exists for this employee and month"}, 409

        cursor.execute("""
            INSERT INTO attendance
                (EmployeeID, WorkDays, AbsentDays, LeaveDays, AttendanceMonth)
            VALUES (%s, %s, %s, %s, %s)
        """, (body["EmployeeID"], wd, ad, ld, body["AttendanceMonth"]))

        conn.commit()
        return {"message": "Attendance record added successfully"}, 201

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return {"error": str(e)}, 500

    finally:
        if conn:
            conn.close()


# ──────────────────────────────────────────────
# UPDATE  (FR12)
# ──────────────────────────────────────────────

def update_attendance(att_id, body):
    """
    FR12 – Cập nhật bản ghi chấm công.
    Chỉ cập nhật các trường được gửi lên (partial update).
    """
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # Lấy bản ghi cũ
        cursor.execute("""
            SELECT EmployeeID, WorkDays, AbsentDays, LeaveDays, AttendanceMonth
            FROM attendance
            WHERE AttendanceID = %s
        """, (att_id,))
        old = cursor.fetchone()
        if not old:
            return {"error": "Attendance record not found"}, 404

        employee_id = old[0]

        # Merge với giá trị cũ nếu không có trong body
        try:
            wd    = int(body.get("WorkDays",       old[1]))
            ad    = int(body.get("AbsentDays",      old[2]))
            ld    = int(body.get("LeaveDays",       old[3]))
            month = body.get("AttendanceMonth",     str(old[4]))
        except (ValueError, TypeError):
            return {"error": "Days must be integers"}, 400

        if not _validate_date(month):
            return {"error": "Invalid date format. Use YYYY-MM-DD"}, 400

        if wd < 0 or ad < 0 or ld < 0:
            return {"error": "Days must be >= 0"}, 400
        if wd > 26:
            return {"error": "WorkDays cannot exceed 26"}, 400
        if wd + ad + ld > 31:
            return {"error": "Total days cannot exceed 31"}, 400

        # Kiểm tra trùng tháng (ngoại trừ chính bản ghi đang update)
        cursor.execute("""
            SELECT 1 FROM attendance
            WHERE EmployeeID = %s AND AttendanceMonth = %s AND AttendanceID <> %s
        """, (employee_id, month, att_id))
        if cursor.fetchone():
            return {"error": "Duplicate attendance record for this employee and month"}, 409

        cursor.execute("""
            UPDATE attendance
            SET WorkDays = %s, AbsentDays = %s, LeaveDays = %s, AttendanceMonth = %s
            WHERE AttendanceID = %s
        """, (wd, ad, ld, month, att_id))

        conn.commit()
        return {"message": "Attendance updated successfully"}, 200

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return {"error": str(e)}, 500

    finally:
        if conn:
            conn.close()


# ──────────────────────────────────────────────
# DELETE  (FR12)
# ──────────────────────────────────────────────

def delete_attendance(att_id):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT 1 FROM attendance WHERE AttendanceID = %s", (att_id,)
        )
        if not cursor.fetchone():
            return {"error": "Attendance record not found"}, 404

        cursor.execute(
            "DELETE FROM attendance WHERE AttendanceID = %s", (att_id,)
        )
        conn.commit()

        return {"message": "Attendance deleted successfully"}, 200

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return {"error": str(e)}, 500

    finally:
        if conn:
            conn.close()