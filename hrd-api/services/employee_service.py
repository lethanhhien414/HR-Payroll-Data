"""
services/employee_service.py
Source of truth: HUMAN_2025 (SQL Server) — Employees, Departments, Positions, Dividends
Sync target   : payroll (MySQL)          — employees_payroll

FIX: _row_to_dict và tất cả queries đã thêm DepartmentID + PositionID
     để EmployeeEdit.jsx đọc được khi populate dropdown.
"""

from config.mssql import get_sqlserver_connection
from config.mysql import get_connection

VALID_STATUSES = [
    "Đang làm việc",
    "Nghỉ phép",
    "Thử việc",
    "Thực tập",
]


def _row_to_dict(row):
    """
    Chuyển 1 row SQL Server → dict chuẩn trả về API.

    FIX: Thêm DepartmentID (row[7]) và PositionID (row[8]) vào dict
         để frontend (EmployeeEdit.jsx) populate được dropdown.
         DepartmentName → row[9], PositionName → row[10].
    
    Thứ tự cột query (0-based):
        0  EmployeeID
        1  FullName
        2  DateOfBirth
        3  Gender
        4  PhoneNumber
        5  Email
        6  HireDate
        7  DepartmentID   ← NEW
        8  PositionID     ← NEW
        9  DepartmentName
        10 PositionName
        11 Status
    """
    return {
        "EmployeeID":     row[0],
        "FullName":       row[1],
        "DateOfBirth":    str(row[2]) if row[2] else None,
        "Gender":         row[3],
        "PhoneNumber":    row[4],
        "Email":          row[5],
        "HireDate":       str(row[6]) if row[6] else None,
        "DepartmentID":   row[7],   # ← FIX: cần cho EmployeeEdit dropdown
        "PositionID":     row[8],   # ← FIX: cần cho EmployeeEdit dropdown
        "Department":     row[9],   # DepartmentName (giữ lại để hiển thị)
        "Position":       row[10],  # PositionName   (giữ lại để hiển thị)
        "Status":         row[11],
    }


# ──────────────────────────────────────────────
# BASE QUERY — dùng chung cho get_all + get_detail
# FIX: thêm e.DepartmentID, e.PositionID vào SELECT
# ──────────────────────────────────────────────

_BASE_SELECT = """
    SELECT
        e.EmployeeID,
        e.FullName,
        e.DateOfBirth,
        e.Gender,
        e.PhoneNumber,
        e.Email,
        e.HireDate,
        e.DepartmentID,
        e.PositionID,
        d.DepartmentName,
        p.PositionName,
        e.Status
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
    LEFT JOIN Positions   p ON e.PositionID   = p.PositionID
"""


# ──────────────────────────────────────────────
# GET ALL (SEARCH + FILTER)
# ──────────────────────────────────────────────

def get_all_employees(name=None, department=None, status=None):
    """
    FR3 – Hiển thị danh sách nhân viên, tìm kiếm theo tên/phòng ban/trạng thái.
    Source: HUMAN_2025.Employees JOIN Departments JOIN Positions
    """
    conn   = None
    cursor = None
    try:
        conn   = get_sqlserver_connection()
        cursor = conn.cursor()

        query  = _BASE_SELECT + " WHERE 1=1"
        params = []

        if name and name.strip():
            query += " AND e.FullName LIKE ?"
            params.append(f"%{name.strip()}%")

        if department and department not in ("", "all", "All Departments"):
            query += " AND d.DepartmentName = ?"
            params.append(department)

        if status and status not in ("", "all", "All Status"):
            query += " AND e.Status = ?"
            params.append(status)

        query += " ORDER BY e.EmployeeID ASC"

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

def get_employee_detail(emp_id):
    """
    Trả về thông tin đầy đủ 1 nhân viên từ HR.
    FIX: dùng _BASE_SELECT nên tự động có DepartmentID + PositionID.
    """
    conn = None
    try:
        conn   = get_sqlserver_connection()
        cursor = conn.cursor()

        cursor.execute(
            _BASE_SELECT + " WHERE e.EmployeeID = ?",
            (emp_id,)
        )

        row = cursor.fetchone()
        if not row:
            return None

        return _row_to_dict(row)

    except Exception as e:
        return {"error": str(e)}

    finally:
        if conn:
            conn.close()


# ──────────────────────────────────────────────
# ADD EMPLOYEE  (FR4)
# Insert vào HUMAN_2025, sau đó sync → employees_payroll
# Transaction thủ công: rollback cả 2 nếu 1 bên fail
# ──────────────────────────────────────────────

def add_employee(data):
    """
    FR4 – Thêm nhân viên vào HUMAN_2025 và tự động tạo bản ghi tương ứng
    trong PAYROLL.employees_payroll.
    """
    required = ["FullName", "DateOfBirth", "Gender",
                "PhoneNumber", "Email", "HireDate",
                "DepartmentID", "PositionID", "Status"]

    for field in required:
        if not data.get(field):
            return {"error": f"Missing required field: {field}"}, 400

    if data["Status"] not in VALID_STATUSES:
        return {"error": f"Invalid status. Must be one of: {VALID_STATUSES}"}, 400

    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        # ── 1. Kiểm tra DepartmentID & PositionID tồn tại trong HR ──
        sc.execute("SELECT 1 FROM Departments WHERE DepartmentID = ?",
                   (data["DepartmentID"],))
        if not sc.fetchone():
            return {"error": "DepartmentID does not exist"}, 400

        sc.execute("SELECT 1 FROM Positions WHERE PositionID = ?",
                   (data["PositionID"],))
        if not sc.fetchone():
            return {"error": "PositionID does not exist"}, 400

        # ── 2. Insert HUMAN_2025.Employees ──
        sc.execute("""
            INSERT INTO Employees
                (FullName, DateOfBirth, Gender, PhoneNumber, Email,
                 HireDate, DepartmentID, PositionID, Status)
            OUTPUT INSERTED.EmployeeID
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["FullName"],
            data["DateOfBirth"],
            data["Gender"],
            data["PhoneNumber"],
            data["Email"],
            data["HireDate"],
            data["DepartmentID"],
            data["PositionID"],
            data["Status"],
        ))

        new_id = sc.fetchone()[0]

        # ── 3. Sync → PAYROLL.employees_payroll ──
        mc.execute("""
            INSERT INTO employees_payroll
                (EmployeeID, FullName, DepartmentID, PositionID, Status)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            new_id,
            data["FullName"],
            data["DepartmentID"],
            data["PositionID"],
            data["Status"],
        ))

        # ── 4. Commit cả 2 ──
        sql_conn.commit()
        mysql_conn.commit()

        return {"message": "Employee created and synced successfully",
                "EmployeeID": new_id}, 201

    except Exception as e:
        if sql_conn:
            try: sql_conn.rollback()
            except Exception: pass
        if mysql_conn:
            try: mysql_conn.rollback()
            except Exception: pass
        return {"error": str(e)}, 500

    finally:
        if sql_conn:   sql_conn.close()
        if mysql_conn: mysql_conn.close()


# ──────────────────────────────────────────────
# UPDATE EMPLOYEE  (FR5)
# Cập nhật HUMAN_2025 và sync lại employees_payroll
# ──────────────────────────────────────────────

def update_employee(emp_id, data):
    """
    FR5 – Cập nhật thông tin nhân viên và tự động đồng bộ sang Payroll.
    """
    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        # Kiểm tra nhân viên tồn tại
        sc.execute("SELECT 1 FROM Employees WHERE EmployeeID = ?", (emp_id,))
        if not sc.fetchone():
            return {"error": "Employee not found"}, 404

        if data.get("Status") and data["Status"] not in VALID_STATUSES:
            return {"error": f"Invalid status. Must be one of: {VALID_STATUSES}"}, 400

        # ── 1. UPDATE SQL Server ──
        sc.execute("""
            UPDATE Employees
            SET
                FullName     = ?,
                DateOfBirth  = ?,
                Gender       = ?,
                PhoneNumber  = ?,
                Email        = ?,
                HireDate     = ?,
                DepartmentID = ?,
                PositionID   = ?,
                Status       = ?,
                UpdatedAt    = GETDATE()
            WHERE EmployeeID = ?
        """, (
            data.get("FullName"),
            data.get("DateOfBirth"),
            data.get("Gender"),
            data.get("PhoneNumber"),
            data.get("Email"),
            data.get("HireDate"),
            data.get("DepartmentID"),
            data.get("PositionID"),
            data.get("Status"),
            emp_id,
        ))

        # ── 2. Sync → PAYROLL.employees_payroll ──
        mc.execute("""
            UPDATE employees_payroll
            SET
                FullName     = %s,
                DepartmentID = %s,
                PositionID   = %s,
                Status       = %s,
                SyncedAt     = NOW()
            WHERE EmployeeID = %s
        """, (
            data.get("FullName"),
            data.get("DepartmentID"),
            data.get("PositionID"),
            data.get("Status"),
            emp_id,
        ))

        sql_conn.commit()
        mysql_conn.commit()

        return {"message": "Employee updated and synced successfully"}, 200

    except Exception as e:
        if sql_conn:
            try: sql_conn.rollback()
            except Exception: pass
        if mysql_conn:
            try: mysql_conn.rollback()
            except Exception: pass
        return {"error": str(e)}, 500

    finally:
        if sql_conn:   sql_conn.close()
        if mysql_conn: mysql_conn.close()


# ──────────────────────────────────────────────
# DELETE EMPLOYEE  (FR6)
# Chặn xóa nếu có dữ liệu lương (MySQL) hoặc cổ tức (SQL Server)
# ──────────────────────────────────────────────

def delete_employee(emp_id):
    """
    FR6 – Xóa nhân viên sau khi kiểm tra ràng buộc:
      - Không được xóa nếu có bản ghi trong PAYROLL.salaries
      - Không được xóa nếu có bản ghi trong HUMAN_2025.Dividends
    """
    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        # Kiểm tra nhân viên tồn tại
        sc.execute("SELECT 1 FROM Employees WHERE EmployeeID = ?", (emp_id,))
        if not sc.fetchone():
            return {"error": "Employee not found"}, 404

        # ── Kiểm tra ràng buộc 1: Dividends trong HR ──
        sc.execute("SELECT 1 FROM Dividends WHERE EmployeeID = ?", (emp_id,))
        if sc.fetchone():
            return {
                "error": "Cannot delete employee: dividend records exist in HR system"
            }, 409

        # ── Kiểm tra ràng buộc 2: Salaries trong Payroll ──
        mc.execute("SELECT 1 FROM salaries WHERE EmployeeID = %s LIMIT 1", (emp_id,))
        if mc.fetchone():
            return {
                "error": "Cannot delete employee: salary records exist in Payroll system"
            }, 409

        # ── Xóa khỏi employees_payroll trước (FK safety) ──
        mc.execute("DELETE FROM employees_payroll WHERE EmployeeID = %s", (emp_id,))

        # ── Xóa khỏi HR ──
        sc.execute("DELETE FROM Employees WHERE EmployeeID = ?", (emp_id,))

        sql_conn.commit()
        mysql_conn.commit()

        return {"message": "Employee deleted successfully"}, 200

    except Exception as e:
        if sql_conn:
            try: sql_conn.rollback()
            except Exception: pass
        if mysql_conn:
            try: mysql_conn.rollback()
            except Exception: pass
        return {"error": str(e)}, 500

    finally:
        if sql_conn:   sql_conn.close()
        if mysql_conn: mysql_conn.close()