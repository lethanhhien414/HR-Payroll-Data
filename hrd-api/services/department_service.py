"""
services/department_service.py
Master source : HUMAN_2025.Departments (SQL Server)
Sync target   : payroll.departments_payroll (MySQL)
"""

from config.mssql import get_sqlserver_connection
from config.mysql import get_connection


# ──────────────────────────────────────────────
# GET ALL  (FR7)
# ──────────────────────────────────────────────

def get_all_departments(name=None):
    conn = None
    try:
        conn   = get_sqlserver_connection()
        cursor = conn.cursor()

        query = """
            SELECT
                d.DepartmentID,
                d.DepartmentName,
                COUNT(e.EmployeeID) AS employee_count
            FROM Departments d
            LEFT JOIN Employees e ON d.DepartmentID = e.DepartmentID
            WHERE 1=1
        """
        params = []

        if name and name.strip():
            query += " AND d.DepartmentName LIKE ?"
            params.append(f"%{name.strip()}%")

        query += " GROUP BY d.DepartmentID, d.DepartmentName ORDER BY d.DepartmentID ASC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        return [
            {
                "DepartmentID":   r[0],
                "DepartmentName": r[1],
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

def get_department_detail(dep_id):
    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        sc.execute("""
            SELECT DepartmentID, DepartmentName
            FROM Departments
            WHERE DepartmentID = ?
        """, (dep_id,))
        row = sc.fetchone()

        if not row:
            return None

        mc.execute("""
            SELECT COUNT(*) FROM employees_payroll WHERE DepartmentID = %s
        """, (dep_id,))
        emp_count = mc.fetchone()[0] or 0

        mc.execute("""
            SELECT COALESCE(SUM(s.NetSalary), 0)
            FROM salaries s
            JOIN employees_payroll e ON s.EmployeeID = e.EmployeeID
            WHERE e.DepartmentID = %s
        """, (dep_id,))
        total_salary = float(mc.fetchone()[0] or 0)

        return {
            "DepartmentID":   row[0],
            "DepartmentName": row[1],
            "EmployeeCount":  emp_count,
            "TotalSalary":    total_salary,
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        if sql_conn:
            sql_conn.close()
        if mysql_conn:
            mysql_conn.close()


# ──────────────────────────────────────────────
# GET EMPLOYEES IN DEPARTMENT  (UC.07 - view detail)
# ──────────────────────────────────────────────

def get_department_employees(dep_id):
    """
    Trả về danh sách nhân viên thuộc phòng ban:
    EmployeeID, FullName, PositionName, Email, Status
    Source: HUMAN_2025 (SQL Server)
    """
    conn = None
    try:
        conn   = get_sqlserver_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                e.EmployeeID,
                e.FullName,
                p.PositionName,
                e.Email,
                e.Status
            FROM Employees e
            LEFT JOIN Positions p ON e.PositionID = p.PositionID
            WHERE e.DepartmentID = ?
            ORDER BY e.FullName ASC
        """, (dep_id,))

        rows = cursor.fetchall()

        return [
            {
                "EmployeeID":   r[0],
                "FullName":     r[1],
                "PositionName": r[2] or "—",
                "Email":        r[3] or "—",
                "Status":       r[4] or "—",
            }
            for r in rows
        ]

    except Exception as e:
        return {"error": str(e)}

    finally:
        if conn:
            conn.close()


# ──────────────────────────────────────────────
# ADD  (FR7 + FR9)
# ──────────────────────────────────────────────

def add_department(body):
    if not body or not body.get("DepartmentName", "").strip():
        return {"error": "DepartmentName is required"}, 400

    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        sc.execute("""
            INSERT INTO Departments (DepartmentName)
            OUTPUT INSERTED.DepartmentID
            VALUES (?)
        """, (body["DepartmentName"].strip(),))

        new_id = sc.fetchone()[0]

        mc.execute("""
            INSERT INTO departments_payroll (DepartmentID, DepartmentName)
            VALUES (%s, %s)
        """, (new_id, body["DepartmentName"].strip()))

        sql_conn.commit()
        mysql_conn.commit()

        return {
            "message":      "Department added and synced successfully",
            "DepartmentID": new_id,
        }, 201

    except Exception as e:
        for c in [sql_conn, mysql_conn]:
            if c:
                try: c.rollback()
                except: pass
        return {"error": str(e)}, 500

    finally:
        for c in [sql_conn, mysql_conn]:
            if c: c.close()


# ──────────────────────────────────────────────
# UPDATE  (FR7 + FR9)
# ──────────────────────────────────────────────

def update_department(dep_id, body):
    if not body or not body.get("DepartmentName", "").strip():
        return {"error": "DepartmentName is required"}, 400

    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        sc.execute("SELECT 1 FROM Departments WHERE DepartmentID = ?", (dep_id,))
        if not sc.fetchone():
            return {"error": "Department not found"}, 404

        sc.execute("""
            UPDATE Departments
            SET DepartmentName = ?, UpdatedAt = GETDATE()
            WHERE DepartmentID = ?
        """, (body["DepartmentName"].strip(), dep_id))

        mc.execute("""
            UPDATE departments_payroll
            SET DepartmentName = %s, SyncedAt = NOW()
            WHERE DepartmentID = %s
        """, (body["DepartmentName"].strip(), dep_id))

        sql_conn.commit()
        mysql_conn.commit()

        return {"message": "Department updated and synced successfully"}, 200

    except Exception as e:
        for c in [sql_conn, mysql_conn]:
            if c:
                try: c.rollback()
                except: pass
        return {"error": str(e)}, 500

    finally:
        for c in [sql_conn, mysql_conn]:
            if c: c.close()


# ──────────────────────────────────────────────
# DELETE  (FR7 + FR9)
# ──────────────────────────────────────────────

def delete_department(dep_id):
    sql_conn   = None
    mysql_conn = None
    try:
        sql_conn   = get_sqlserver_connection()
        mysql_conn = get_connection()
        sc = sql_conn.cursor()
        mc = mysql_conn.cursor()

        sc.execute("SELECT 1 FROM Departments WHERE DepartmentID = ?", (dep_id,))
        if not sc.fetchone():
            return {"error": "Department not found"}, 404

        sc.execute("SELECT 1 FROM Employees WHERE DepartmentID = ?", (dep_id,))
        if sc.fetchone():
            return {
                "error": "Cannot delete department: employees are currently assigned to it"
            }, 409

        mc.execute("DELETE FROM departments_payroll WHERE DepartmentID = %s", (dep_id,))
        sc.execute("DELETE FROM Departments WHERE DepartmentID = ?", (dep_id,))

        sql_conn.commit()
        mysql_conn.commit()

        return {"message": "Department deleted and synced successfully"}, 200

    except Exception as e:
        for c in [sql_conn, mysql_conn]:
            if c:
                try: c.rollback()
                except: pass
        return {"error": str(e)}, 500

    finally:
        for c in [sql_conn, mysql_conn]:
            if c: c.close()