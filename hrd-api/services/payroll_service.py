"""
services/payroll_service.py  — FIXED
"""
from config.mysql import get_connection


def calculate_payroll(emp_id, month, bonus=0, deductions=0):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT FullName FROM employees_payroll WHERE EmployeeID = %s", (emp_id,)
        )
        if not cursor.fetchone():
            return {"error": "Employee not found"}, 404

        cursor.execute("""
            SELECT WorkDays, AbsentDays FROM attendance
            WHERE EmployeeID = %s
              AND DATE_FORMAT(AttendanceMonth,'%%Y-%%m') = DATE_FORMAT(%s,'%%Y-%%m')
        """, (emp_id, month))
        att = cursor.fetchone()
        if not att:
            return {"error": "No attendance data for this month"}, 404

        work_days, absent_days = att

        cursor.execute("""
            SELECT BaseSalary FROM salaries
            WHERE EmployeeID = %s ORDER BY SalaryMonth DESC LIMIT 1
        """, (emp_id,))
        row         = cursor.fetchone()
        base_salary = float(row[0]) if row else 10_000_000.0
        per_day     = base_salary / 26.0
        net         = work_days * per_day - absent_days * per_day + float(bonus) - float(deductions)

        cursor.execute("""
            SELECT 1 FROM salaries
            WHERE EmployeeID = %s
              AND DATE_FORMAT(SalaryMonth,'%%Y-%%m') = DATE_FORMAT(%s,'%%Y-%%m')
        """, (emp_id, month))
        if cursor.fetchone():
            return {"error": "Payroll already exists for this month"}, 409

        cursor.execute("""
            INSERT INTO salaries
                (EmployeeID, SalaryMonth, BaseSalary, Bonus, Deductions, NetSalary)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (emp_id, month, base_salary, float(bonus), float(deductions), round(net, 2)))
        conn.commit()
        return {"message": "Payroll calculated successfully", "NetSalary": round(net, 2)}, 201

    except Exception as e:
        if conn:
            try: conn.rollback()
            except: pass
        return {"error": str(e)}, 500
    finally:
        if conn: conn.close()


def get_payroll(month=None, department=None):
    """
    FIX 1: Nếu không truyền month → lấy tháng MỚI NHẤT có trong DB
            (tránh trả nhiều tháng → tổng tiền sai)
    FIX 2: INNER JOIN → LEFT JOIN để không mất NV thiếu dept
    FIX 3: Trả cả 2 key "Department" và "DepartmentName" để tương thích frontend
    """
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # FIX 1: Auto-resolve month mới nhất nếu không truyền
        if not month:
            cursor.execute(
                "SELECT DATE_FORMAT(MAX(SalaryMonth), '%%Y-%%m') FROM salaries"
            )
            row = cursor.fetchone()
            month = row[0] if row and row[0] else None

        inner_where  = ""
        inner_params = []
        if month:
            inner_where = "WHERE DATE_FORMAT(SalaryMonth,'%%Y-%%m') = %s"
            inner_params.append(month)

        outer_where  = ""
        outer_params = []
        if department and department not in ["", "all", "All Departments"]:
            outer_where = "AND COALESCE(d.DepartmentName, '') = %s"
            outer_params.append(department)

        # FIX 2: LEFT JOIN thay vì INNER JOIN
        query = f"""
            SELECT
                s.SalaryID,
                s.EmployeeID,
                e.FullName,
                COALESCE(d.DepartmentName, 'N/A') AS DepartmentName,
                s.BaseSalary,
                s.Bonus,
                s.Deductions,
                s.NetSalary,
                s.SalaryMonth
            FROM (
                SELECT EmployeeID, SalaryMonth, MAX(SalaryID) AS max_id
                FROM salaries
                {inner_where}
                GROUP BY EmployeeID, SalaryMonth
            ) AS dedup
            JOIN salaries s                 ON s.SalaryID    = dedup.max_id
            JOIN employees_payroll e        ON s.EmployeeID  = e.EmployeeID
            LEFT JOIN departments_payroll d ON e.DepartmentID = d.DepartmentID
            WHERE 1=1
            {outer_where}
            ORDER BY s.SalaryMonth DESC, e.FullName ASC
        """

        cursor.execute(query, inner_params + outer_params)
        rows = cursor.fetchall()

        return [
            {
                "SalaryID":       row[0],
                "EmployeeID":     row[1],
                "FullName":       row[2],
                # FIX 3: Trả cả hai key để tương thích cả 2 phiên bản frontend
                "Department":     row[3],
                "DepartmentName": row[3],
                "BaseSalary":     float(row[4]),
                "Bonus":          float(row[5]),
                "Deductions":     float(row[6]),
                "NetSalary":      float(row[7]),
                "SalaryMonth":    str(row[8]),
            }
            for row in rows
        ]

    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn: conn.close()


def get_payroll_detail(emp_id):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT e.FullName, s.BaseSalary, s.Bonus, s.Deductions, s.NetSalary, s.SalaryMonth
            FROM salaries s
            JOIN employees_payroll e ON s.EmployeeID = e.EmployeeID
            WHERE s.EmployeeID = %s
            ORDER BY s.SalaryMonth DESC LIMIT 1
        """, (emp_id,))
        row = cursor.fetchone()
        if not row: return None
        return {
            "FullName":    row[0],
            "BaseSalary":  float(row[1]),
            "Bonus":       float(row[2]),
            "Deductions":  float(row[3]),
            "NetSalary":   float(row[4]),
            "SalaryMonth": str(row[5]),
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn: conn.close()


def get_salary_history(emp_id):
    """
    FIX: Trả thêm alias "month" để SalaryTrendChart dùng
         d.month || d.SalaryMonth đều hoạt động đúng.
    """
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                DATE_FORMAT(s.SalaryMonth,'%%Y-%%m') AS SalaryMonth,
                s.BaseSalary,
                s.NetSalary,
                s.Bonus,
                s.Deductions
            FROM (
                SELECT SalaryMonth, MAX(SalaryID) AS max_id
                FROM salaries
                WHERE EmployeeID = %s
                GROUP BY SalaryMonth
            ) AS dedup
            JOIN salaries s ON s.SalaryID = dedup.max_id
            ORDER BY s.SalaryMonth ASC
        """, (emp_id,))
        rows = cursor.fetchall()
        return [
            {
                "SalaryMonth": r[0],
                "month":       r[0],   # alias cho chart compatibility
                "BaseSalary":  float(r[1]),
                "NetSalary":   float(r[2]),
                "Bonus":       float(r[3]),
                "Deductions":  float(r[4]),
            }
            for r in rows
        ]
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn: conn.close()


def check_salary_anomaly(emp_id):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT NetSalary, DATE_FORMAT(SalaryMonth,'%%Y-%%m')
            FROM salaries WHERE EmployeeID = %s
            ORDER BY SalaryMonth DESC LIMIT 2
        """, (emp_id,))
        rows = cursor.fetchall()
        if len(rows) < 2:
            return {"message": "Not enough data"}
        latest, lm = float(rows[0][0]), rows[0][1]
        prev,   pm = float(rows[1][0]), rows[1][1]
        if prev > 0 and latest > prev * 1.5:
            return {
                "alert":      "Salary increased abnormally (> 50%)",
                "latest":     latest, "latest_month": lm,
                "prev":       prev,   "prev_month":   pm,
                "change_pct": round((latest - prev) / prev * 100, 2),
            }
        return {"message": "OK", "latest": latest, "prev": prev}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn: conn.close()

def update_payroll(salary_id, bonus, deductions, net_salary):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT SalaryID FROM salaries WHERE SalaryID = %s", (salary_id,)
        )
        if not cursor.fetchone():
            return {"error": "Salary record not found"}, 404

        cursor.execute("""
            UPDATE salaries
            SET Bonus = %s, Deductions = %s, NetSalary = %s
            WHERE SalaryID = %s
        """, (float(bonus), float(deductions), round(float(net_salary), 2), salary_id))
        conn.commit()

        return {"message": "Payroll updated successfully", "SalaryID": salary_id}, 200

    except Exception as e:
        if conn:
            try: conn.rollback()
            except: pass
        return {"error": str(e)}, 500
    finally:
        if conn: conn.close()