"""
services/report_service.py  –  FULL VERSION
Gồm đầy đủ:
  - get_dashboard(month)
  - get_department_report(month)
  - get_salary_trend(emp_id)
  - get_top_employees(limit)
  - get_all_alerts()          ← UC.13 + UC.14
"""

import datetime
from config.mysql import get_connection
from config.mssql import get_sqlserver_connection


# ══════════════════════════════════════════════════════
# 1. GET /api/reports/dashboard
# ══════════════════════════════════════════════════════
def get_dashboard(month=None):
    mysql_conn = None
    mssql_conn = None
    try:
        mysql_conn = get_connection()
        mssql_conn = get_sqlserver_connection()
        mc = mysql_conn.cursor()
        sc = mssql_conn.cursor()

        # Tổng nhân viên từ HR (SQL Server)
        sc.execute("SELECT COUNT(*) FROM Employees")
        total_emp = sc.fetchone()[0] or 0

        # Tổng + AVG lương — dùng MAX(SalaryID) tránh duplicate
        if month:
            mc.execute("""
                SELECT
                    COALESCE(SUM(s.NetSalary), 0),
                    COALESCE(AVG(s.NetSalary), 0)
                FROM (
                    SELECT EmployeeID, MAX(SalaryID) AS max_id
                    FROM salaries
                    WHERE DATE_FORMAT(SalaryMonth, '%%Y-%%m') = %s
                    GROUP BY EmployeeID
                ) AS latest
                JOIN salaries s ON s.SalaryID = latest.max_id
            """, (month,))
        else:
            mc.execute("""
                SELECT
                    COALESCE(SUM(s.NetSalary), 0),
                    COALESCE(AVG(s.NetSalary), 0)
                FROM (
                    SELECT EmployeeID, MAX(SalaryID) AS max_id
                    FROM salaries
                    GROUP BY EmployeeID
                ) AS latest
                JOIN salaries s ON s.SalaryID = latest.max_id
            """)

        sal_row   = mc.fetchone() or (0, 0)
        total_sal = float(sal_row[0])
        avg_sal   = float(sal_row[1])

        # Chấm công — dùng MAX(AttendanceID) tránh duplicate
        if month:
            mc.execute("""
                SELECT
                    COALESCE(SUM(a.WorkDays),   0),
                    COALESCE(SUM(a.AbsentDays), 0),
                    COALESCE(SUM(a.LeaveDays),  0)
                FROM (
                    SELECT EmployeeID, MAX(AttendanceID) AS max_id
                    FROM attendance
                    WHERE DATE_FORMAT(AttendanceMonth, '%%Y-%%m') = %s
                    GROUP BY EmployeeID
                ) AS latest
                JOIN attendance a ON a.AttendanceID = latest.max_id
            """, (month,))
        else:
            mc.execute("""
                SELECT
                    COALESCE(SUM(a.WorkDays),   0),
                    COALESCE(SUM(a.AbsentDays), 0),
                    COALESCE(SUM(a.LeaveDays),  0)
                FROM (
                    SELECT EmployeeID, MAX(AttendanceID) AS max_id
                    FROM attendance
                    GROUP BY EmployeeID
                ) AS latest
                JOIN attendance a ON a.AttendanceID = latest.max_id
            """)

        att = mc.fetchone() or (0, 0, 0)

        # AlertCount — nhân viên vượt ngày nghỉ
        mc.execute("""
            SELECT COUNT(DISTINCT EmployeeID)
            FROM attendance
            WHERE LeaveDays > 3
        """)
        alert_count = mc.fetchone()[0] or 0

        return {
            "TotalEmployees":  total_emp,
            "TotalSalary":     total_sal,
            "AverageSalary":   round(avg_sal, 2),
            "TotalWorkDays":   int(att[0]),
            "TotalAbsentDays": int(att[1]),
            "TotalLeaveDays":  int(att[2]),
            "AlertCount":      alert_count,
        }, 200

    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        if mysql_conn: mysql_conn.close()
        if mssql_conn: mssql_conn.close()


# ══════════════════════════════════════════════════════
# 2. GET /api/reports/departments
# ══════════════════════════════════════════════════════
def get_department_report(month=None):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        if month:
            cursor.execute("""
                SELECT
                    d.DepartmentName,
                    COUNT(DISTINCT e.EmployeeID)   AS employee_count,
                    COALESCE(SUM(s.NetSalary), 0)  AS total_salary,
                    COALESCE(AVG(s.NetSalary), 0)  AS avg_salary
                FROM departments_payroll d
                LEFT JOIN employees_payroll e ON d.DepartmentID = e.DepartmentID
                LEFT JOIN (
                    SELECT EmployeeID, SalaryMonth, MAX(SalaryID) AS max_id
                    FROM salaries
                    WHERE DATE_FORMAT(SalaryMonth, '%%Y-%%m') = %s
                    GROUP BY EmployeeID, SalaryMonth
                ) AS latest ON latest.EmployeeID = e.EmployeeID
                LEFT JOIN salaries s ON s.SalaryID = latest.max_id
                GROUP BY d.DepartmentID, d.DepartmentName
                ORDER BY total_salary DESC
            """, (month,))
        else:
            cursor.execute("""
                SELECT
                    d.DepartmentName,
                    COUNT(DISTINCT e.EmployeeID)   AS employee_count,
                    COALESCE(SUM(s.NetSalary), 0)  AS total_salary,
                    COALESCE(AVG(s.NetSalary), 0)  AS avg_salary
                FROM departments_payroll d
                LEFT JOIN employees_payroll e ON d.DepartmentID = e.DepartmentID
                LEFT JOIN (
                    SELECT EmployeeID, SalaryMonth, MAX(SalaryID) AS max_id
                    FROM salaries
                    GROUP BY EmployeeID, SalaryMonth
                ) AS latest ON latest.EmployeeID = e.EmployeeID
                LEFT JOIN salaries s ON s.SalaryID = latest.max_id
                GROUP BY d.DepartmentID, d.DepartmentName
                ORDER BY total_salary DESC
            """)

        rows = cursor.fetchall()
        return [
            {
                "department":     r[0],
                "employee_count": r[1],
                "total_salary":   float(r[2]),
                "avg_salary":     round(float(r[3]), 2),
            }
            for r in rows
        ], 200

    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        if conn: conn.close()


# ══════════════════════════════════════════════════════
# 3. GET /api/reports/trend
# ══════════════════════════════════════════════════════
def get_salary_trend(emp_id=None):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # ── Employee Detail Trend ──
        if emp_id:
            cursor.execute("""
            SELECT
                SalaryMonth,
                BaseSalary,
                NetSalary
            FROM salaries
            WHERE EmployeeID = %s
            ORDER BY SalaryMonth ASC
        """, (emp_id,))

        # ── Dashboard Trend (NO month grouping) ──
        else:
            cursor.execute("""
                SELECT
                    e.FullName AS month,
                    SUM(s.NetSalary) AS total_salary
                FROM employees_payroll e
                JOIN salaries s
                    ON e.EmployeeID = s.EmployeeID
                GROUP BY e.EmployeeID, e.FullName
                ORDER BY total_salary ASC
            """)

        rows = cursor.fetchall()

        if emp_id:
            return [
                {
                    "SalaryMonth": str(r[0]),
                    "BaseSalary": float(r[1]) if r[1] else 0.0,
                    "NetSalary": float(r[2]) if r[2] else 0.0
                }
                for r in rows
            ], 200

        return [
            {
                "month": r[0],
                "total_salary": float(r[1]) if r[1] else 0.0
            }
            for r in rows
        ], 200

    except Exception as e:
        return {"error": str(e)}, 500

    finally:
        if conn:
            conn.close()

# ══════════════════════════════════════════════════════
# 4. GET /api/reports/top
# ══════════════════════════════════════════════════════
def get_top_employees(limit=5):
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                e.EmployeeID,
                e.FullName,
                COALESCE(SUM(s.NetSalary), 0) AS total_salary
            FROM employees_payroll e
            LEFT JOIN (
                SELECT EmployeeID, SalaryMonth, MAX(SalaryID) AS max_id
                FROM salaries
                GROUP BY EmployeeID, SalaryMonth
            ) AS latest ON latest.EmployeeID = e.EmployeeID
            LEFT JOIN salaries s ON s.SalaryID = latest.max_id
            GROUP BY e.EmployeeID, e.FullName
            ORDER BY total_salary DESC
            LIMIT %s
        """, (int(limit),))

        rows = cursor.fetchall()
        return [
            {
                "EmployeeID":   r[0],
                "full_name":    r[1],
                "total_salary": float(r[2]),
            }
            for r in rows
        ], 200

    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        if conn: conn.close()


# ══════════════════════════════════════════════════════
# 5. GET /api/alerts
#    UC.13 — Vượt ngày nghỉ phép  (FR17)
#    UC.14 — Lương bất thường     (FR18)
#    FR19  — Kỷ niệm công tác
# ══════════════════════════════════════════════════════
def get_all_alerts():
    alerts     = []
    mysql_conn = None
    mssql_conn = None

    try:
        mysql_conn = get_connection()
        mssql_conn = get_sqlserver_connection()
        mc = mysql_conn.cursor()
        sc = mssql_conn.cursor()

        today = datetime.date.today()

        # ── UC.13 FR17: Vượt ngày nghỉ phép > 3 ngày ──────────────
        mc.execute("""
            SELECT a.EmployeeID, e.FullName, a.LeaveDays,
                   DATE_FORMAT(a.AttendanceMonth, '%%Y-%%m')
            FROM attendance a
            JOIN employees_payroll e ON a.EmployeeID = e.EmployeeID
            WHERE a.LeaveDays > 3
            GROUP BY a.EmployeeID, e.FullName, a.LeaveDays, a.AttendanceMonth
            ORDER BY a.LeaveDays DESC
        """)
        for row in mc.fetchall():
            alerts.append({
                "type":       "leave_exceeded",
                "severity":   "warning",
                "EmployeeID": row[0],
                "FullName":   row[1],
                "LeaveDays":  row[2],
                "month":      row[3],
                "message": (
                    f"{row[1]} đã nghỉ {row[2]} ngày "
                    f"trong tháng {row[3]} (vượt ngưỡng 3 ngày)"
                ),
            })

        # ── UC.14 FR18: Lương bất thường > 20% so tháng trước ─────
        THRESHOLD = 0.20

        mc.execute("""
            SELECT
                e.EmployeeID,
                e.FullName,
                DATE_FORMAT(cur.SalaryMonth,  '%%Y-%%m') AS cur_month,
                cur.NetSalary                            AS cur_salary,
                DATE_FORMAT(prev.SalaryMonth, '%%Y-%%m') AS prev_month,
                prev.NetSalary                           AS prev_salary
            FROM employees_payroll e

            /* Tháng mới nhất */
            JOIN (
                SELECT s1.EmployeeID, s1.SalaryMonth, s1.NetSalary
                FROM salaries s1
                JOIN (
                    SELECT EmployeeID, MAX(SalaryMonth) AS max_month
                    FROM salaries GROUP BY EmployeeID
                ) lm ON s1.EmployeeID = lm.EmployeeID
                     AND s1.SalaryMonth = lm.max_month
                JOIN (
                    SELECT EmployeeID, SalaryMonth, MAX(SalaryID) AS max_id
                    FROM salaries GROUP BY EmployeeID, SalaryMonth
                ) dd ON s1.SalaryID = dd.max_id
            ) cur ON cur.EmployeeID = e.EmployeeID

            /* Tháng liền trước */
            JOIN (
                SELECT s2.EmployeeID, s2.SalaryMonth, s2.NetSalary
                FROM salaries s2
                JOIN (
                    SELECT EmployeeID, MAX(SalaryMonth) AS max_month
                    FROM salaries GROUP BY EmployeeID
                ) lm2 ON s2.EmployeeID = lm2.EmployeeID
                      AND s2.SalaryMonth = DATE_FORMAT(
                              DATE_SUB(lm2.max_month, INTERVAL 1 MONTH),
                              '%%Y-%%m-01')
                JOIN (
                    SELECT EmployeeID, SalaryMonth, MAX(SalaryID) AS max_id
                    FROM salaries GROUP BY EmployeeID, SalaryMonth
                ) dd2 ON s2.SalaryID = dd2.max_id
            ) prev ON prev.EmployeeID = e.EmployeeID

            WHERE prev.NetSalary > 0
              AND ABS(cur.NetSalary - prev.NetSalary) / prev.NetSalary > %s
        """, (THRESHOLD,))

        for row in mc.fetchall():
            emp_id      = row[0]
            full_name   = row[1]
            cur_month   = row[2]
            cur_salary  = float(row[3])
            prev_month  = row[4]
            prev_salary = float(row[5])

            change_pct = (cur_salary - prev_salary) / prev_salary * 100
            direction  = "tăng" if change_pct > 0 else "giảm"
            severity   = "critical" if abs(change_pct) > 40 else "warning"

            alerts.append({
                "type":       "salary_anomaly",
                "severity":   severity,
                "EmployeeID": emp_id,
                "FullName":   full_name,
                "curMonth":   cur_month,
                "curSalary":  cur_salary,
                "prevMonth":  prev_month,
                "prevSalary": prev_salary,
                "changePct":  round(change_pct, 1),
                "message": (
                    f"{full_name}: lương {direction} "
                    f"{abs(change_pct):.1f}% "
                    f"({prev_month}: {int(prev_salary):,} → "
                    f"{cur_month}: {int(cur_salary):,} VND)"
                ),
            })

        # ── FR19: Kỷ niệm công tác (1, 3, 5, 10 năm) ──────────────
        sc.execute("""
            SELECT EmployeeID, FullName, HireDate
            FROM Employees
            WHERE Status = N'Đang làm việc'
        """)
        milestones = {1, 3, 5, 10}
        for row in sc.fetchall():
            hire_date = row[2]
            if not hire_date:
                continue
            if isinstance(hire_date, str):
                try:
                    hire_date = datetime.datetime.strptime(
                        hire_date, "%Y-%m-%d"
                    ).date()
                except Exception:
                    continue

            years = (today - hire_date).days // 365
            try:
                anniversary = hire_date.replace(year=today.year)
            except ValueError:
                continue
            days_until = (anniversary - today).days

            if years in milestones and -7 <= days_until <= 7:
                alerts.append({
                    "type":       "work_anniversary",
                    "severity":   "info",
                    "EmployeeID": row[0],
                    "FullName":   row[1],
                    "years":      years,
                    "message": (
                        f"{row[1]} tròn {years} năm công tác "
                        f"vào {anniversary.strftime('%d/%m/%Y')}"
                    ),
                })

        return alerts, 200

    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        if mysql_conn: mysql_conn.close()
        if mssql_conn: mssql_conn.close()
def get_dividend_report():
    conn = None
    try:
        conn = get_sqlserver_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                d.EmployeeID,
                e.FullName,
                d.DividendAmount,
                d.DividendDate
            FROM Dividends d
            JOIN Employees e
            ON d.EmployeeID = e.EmployeeID
            ORDER BY d.DividendAmount DESC
        """)

        rows = cursor.fetchall()

        return [
            {
                "EmployeeID": row[0],
                "FullName": row[1],
                "DividendAmount": float(row[2]),
                "DividendDate": str(row[3]),
            }
            for row in rows
        ], 200

    except Exception as e:
        return {"error": str(e)}, 500

    finally:
        if conn:
            conn.close()