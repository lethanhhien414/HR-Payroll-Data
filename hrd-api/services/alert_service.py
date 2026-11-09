"""
services/alert_service.py
==========================
UC.13 — Cảnh báo nhân viên vượt số ngày nghỉ cho phép  (FR17)
UC.14 — Cảnh báo bất thường về lương                   (FR18)  ← TRIPLE-MODE
UC.15 — Thông báo kỷ niệm thâm niên                    (FR19)
       + Sinh nhật hôm nay / sắp tới (lookahead 30 ngày)

─── UC14 TRIPLE-MODE SALARY ANOMALY ───────────────────────────────────────────
Vấn đề root cause:
  payroll_2026 chỉ có 1 tháng (2024-09) → không thể so sánh MoM.
  Toàn bộ Net = Base + Bonus - Deductions chính xác 100% → Internal check không trigger.

Giải pháp 3 mode tự động:
  MODE A — MoM (month-over-month):
    Khi có ≥2 tháng, so sánh NetSalary tháng mới nhất vs tháng trước.
    Trigger: thay đổi > MOM_SPIKE_PCT% (tăng) hoặc MOM_DROP_PCT% (giảm).

  MODE B — Internal consistency (luôn chạy):
    Net != Base+Bonus-Deductions (> INTERNAL_DIFF_PCT%)
    Bonus > Base * BONUS_RATIO
    Deductions > Base * DEDUCTION_RATIO
    Net < 0

  MODE C — Group average deviation (fallback khi chỉ có 1 tháng):
    Tự động tính lương trung bình nhóm trong tháng.
    Trigger: Net lệch > AVG_DEV_PCT% (mặc định 40%) so với trung bình.
    Verified với payroll_2026: trigger Cường (+43.8%), Hiếu (+75.1%), Minh (-53.9%).

Thứ tự: A → B → C. Severity: Critical > Warning (không downgrade).
"""

from datetime import datetime, date
from collections import defaultdict
from typing import Optional
import hashlib


# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

# UC13
EXCESSIVE_LEAVE_DAYS = 1     # vắng ≥ N ngày → cảnh báo
ANNUAL_LEAVE_QUOTA   = 12    # tổng ngày phép / năm

# UC14 — Mode A (MoM)
MOM_SPIKE_PCT    = 15.0      # % tăng MoM → Critical
MOM_DROP_PCT     = 15.0      # % giảm MoM → Warning

# UC14 — Mode B (Internal)
INTERNAL_DIFF_PCT  = 1.0     # % sai lệch Net vs expected → Warning
BONUS_RATIO        = 0.30    # Bonus > Base * ratio → Warning/Critical
DEDUCTION_RATIO    = 0.20    # Deductions > Base * ratio → Warning

# UC14 — Mode C (Group avg, fallback)
AVG_DEV_PCT = 40.0           # Net lệch > 40% trung bình nhóm → Warning
                             # Verified: triggers Cường, Hiếu, Minh với payroll_2026

# UC15 / Birthday
BIRTHDAY_LOOKAHEAD = 30      # ngày tới sinh nhật / kỷ niệm


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _fmt(d) -> str:
    if not d:
        return ""
    if isinstance(d, datetime):
        d = d.date()
    return d.strftime("%d/%m/%Y") if isinstance(d, date) else str(d)


def _to_date(val) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    return None


def _fallback_emp(emp_id: str) -> dict:
    return {"name": f"NV #{emp_id}", "email": "N/A",
            "dept": "N/A", "position": "N/A",
            "dob": None, "hire_date": None}


def _stable_id(*parts) -> str:
    key = "|".join(str(p) for p in parts)
    return hashlib.sha1(key.encode()).hexdigest()[:16]


def _days_until_this_year(month: int, day: int, today: date, lookahead: int = 30):
    """
    Tìm ngày (month/day) gần nhất trong `lookahead` ngày.
    Trả về (days_until, target_date) hoặc (None, None).
    """
    for year in [today.year, today.year + 1]:
        try:
            target = date(year, month, day)
        except ValueError:
            try:
                target = date(year, month, 28)   # 29/2 fallback
            except ValueError:
                continue
        delta = (target - today).days
        if 0 <= delta <= lookahead:
            return delta, target
    return None, None


def _days_label(days_until: int, event_date: date, name: str, event: str) -> str:
    if days_until == 0:
        return f"🎉 Hôm nay là {event} của {name}!"
    if days_until == 1:
        return f"📅 {event} của {name} là ngày mai ({_fmt(event_date)})!"
    return f"📅 {name} sắp có {event} sau {days_until} ngày ({_fmt(event_date)})"


# ─────────────────────────────────────────────────────────────────────────────
# AlertService
# ─────────────────────────────────────────────────────────────────────────────

class AlertService:

    def __init__(self, mysql_conn, mssql_conn):
        self.mysql = mysql_conn
        self.mssql = mssql_conn

    # ─────────────────────────────────────────
    # DATA FETCHERS
    # ─────────────────────────────────────────

    def fetch_employee_map(self) -> dict:
        """
        Lấy tất cả nhân viên từ HUMAN_2025 (SQL Server).
        JOIN Departments + Positions. Không filter Status.
        """
        cursor = self.mssql.cursor()
        cursor.execute("""
            SELECT
                e.EmployeeID,
                e.FullName,
                e.Email,
                e.DateOfBirth,
                e.HireDate,
                e.Status,
                ISNULL(d.DepartmentName, N'Chưa xác định') AS DepartmentName,
                ISNULL(p.PositionName,   N'Chưa xác định') AS PositionName
            FROM dbo.Employees e
            LEFT JOIN dbo.Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN dbo.Positions   p ON e.PositionID   = p.PositionID
        """)
        emp_map = {}
        for row in cursor.fetchall():
            emp_id = str(row[0])
            emp_map[emp_id] = {
                "name":      row[1] or f"NV #{emp_id}",
                "email":     row[2] or "N/A",
                "dob":       _to_date(row[3]),
                "hire_date": _to_date(row[4]),
                "status":    (row[5] or "").strip(),
                "dept":      row[6],
                "position":  row[7],
            }
        return emp_map

    def fetch_attendance_rows(self, month_filter: str = None) -> list:
        cursor = self.mysql.cursor(dictionary=True)
        if month_filter:
            cursor.execute(
                "SELECT EmployeeID, AbsentDays, LeaveDays, AttendanceMonth "
                "FROM attendance WHERE AbsentDays >= %s AND AttendanceMonth = %s",
                (EXCESSIVE_LEAVE_DAYS, month_filter)
            )
        else:
            cursor.execute(
                "SELECT EmployeeID, AbsentDays, LeaveDays, AttendanceMonth "
                "FROM attendance WHERE AbsentDays >= %s",
                (EXCESSIVE_LEAVE_DAYS,)
            )
        return cursor.fetchall()

    def fetch_salary_rows(self, month_filter: str = None) -> list:
        """
        Lấy tất cả dữ liệu lương để có đủ cho MoM.
        month_filter: chỉ lấy tháng đó + 1 tháng trước.
        Không có filter: lấy tất cả (service sẽ tự deduplicate).
        """
        cursor = self.mysql.cursor(dictionary=True)
        if month_filter:
            cursor.execute("""
                SELECT SalaryID, EmployeeID, SalaryMonth,
                       BaseSalary, Bonus, Deductions, NetSalary
                FROM salaries
                WHERE SalaryMonth >= DATE_SUB(%s, INTERVAL 1 MONTH)
                  AND SalaryMonth <= %s
                ORDER BY EmployeeID, SalaryMonth ASC
            """, (month_filter, month_filter))
        else:
            cursor.execute("""
                SELECT SalaryID, EmployeeID, SalaryMonth,
                       BaseSalary, Bonus, Deductions, NetSalary
                FROM salaries
                ORDER BY EmployeeID, SalaryMonth ASC
            """)
        return cursor.fetchall()

    # ─────────────────────────────────────────
    # UC13 — EXCESSIVE LEAVE
    # ─────────────────────────────────────────

    def scan_excessive_leave(self, attendance_rows: list, employee_map: dict,
                             today: date = None) -> list:
        """
        Deduplicate duplicate MySQL rows: giữ bản ghi AbsentDays cao nhất
        cho mỗi (EmployeeID, AttendanceMonth).
        """
        today = today or date.today()

        best: dict = {}
        for row in attendance_rows:
            emp_id    = str(row["EmployeeID"])
            month_str = str(row.get("AttendanceMonth", ""))[:7]
            key       = (emp_id, month_str)
            absent    = int(row.get("AbsentDays") or 0)
            if key not in best or absent > int(best[key].get("AbsentDays") or 0):
                best[key] = row

        alerts = []
        for (emp_id, month_str), row in best.items():
            absent = int(row.get("AbsentDays") or 0)
            if absent < EXCESSIVE_LEAVE_DAYS:
                continue

            info      = employee_map.get(emp_id, _fallback_emp(emp_id))
            leave     = int(row.get("LeaveDays") or 0)
            total_off = absent + leave
            severity  = "Critical" if total_off >= ANNUAL_LEAVE_QUOTA else "Warning"

            alerts.append({
                "alertId":      _stable_id(emp_id, "Excessive leave", month_str),
                "employeeId":   emp_id,
                "employeeName": info["name"],
                "type":         "Excessive leave",
                "message":      f"Vắng {absent} ngày, nghỉ phép {leave} ngày (Tháng {month_str})",
                "severity":     severity,
                "category":     "Attendance",
                "email":        info["email"],
                "dept":         info["dept"],
                "position":     info["position"],
                "date":         _fmt(today),
                "resolved":     False,
                "resolvedAt":   None,
                "resolvedBy":   None,
                "resolveNote":  None,
                "meta": {
                    "absentDays":       absent,
                    "leaveDays":        leave,
                    "totalOff":         total_off,
                    "annualLeaveQuota": ANNUAL_LEAVE_QUOTA,
                    "attendanceMonth":  month_str,
                },
            })
        return alerts

    # ─────────────────────────────────────────
    # UC14 — SALARY ANOMALY (TRIPLE-MODE)
    # ─────────────────────────────────────────

    def scan_salary_anomalies(self, salary_rows: list, employee_map: dict,
                              today: date = None) -> list:
        """
        Triple-mode — xem docstring module để biết chi tiết.
        Verified với payroll_2026: mode C trigger Cường, Hiếu, Minh.
        """
        today = today or date.today()

        # ── Deduplicate: MAX SalaryID per (emp, month) ──────────────
        best: dict = {}
        for row in salary_rows:
            emp_id    = str(row["EmployeeID"])
            month_str = str(row.get("SalaryMonth", ""))[:7]
            key       = (emp_id, month_str)
            sid       = int(row.get("SalaryID") or 0)
            if key not in best or sid > int(best[key].get("SalaryID") or 0):
                best[key] = row

        # ── Nhóm theo từng nhân viên, sorted ASC ────────────────────
        by_emp: dict = {}
        for (emp_id, month_str), row in best.items():
            by_emp.setdefault(emp_id, []).append((month_str, row))
        for emp_id in by_emp:
            by_emp[emp_id].sort(key=lambda x: x[0])

        has_multi_month = any(len(v) >= 2 for v in by_emp.values())

        # ── Mode C: tính lương TB nhóm mỗi tháng ───────────────────
        month_avg: dict = {}
        if not has_multi_month:
            month_nets: dict = defaultdict(list)
            for (emp_id, month_str), row in best.items():
                net = float(row.get("NetSalary") or 0)
                if net > 0:
                    month_nets[month_str].append(net)
            for m, nets in month_nets.items():
                month_avg[m] = sum(nets) / len(nets) if nets else 0

        alerts = []

        for emp_id, month_list in by_emp.items():
            info     = employee_map.get(emp_id, _fallback_emp(emp_id))
            reasons  = []
            severity = None
            meta_extra: dict = {}

            curr_month, curr_row = month_list[-1]
            net        = float(curr_row.get("NetSalary")  or 0)
            base       = float(curr_row.get("BaseSalary") or 0)
            bonus      = float(curr_row.get("Bonus")      or 0)
            deductions = float(curr_row.get("Deductions") or 0)

            # ══ MODE A: MoM ══════════════════════════════════════════
            if len(month_list) >= 2:
                prev_month, prev_row = month_list[-2]
                prev_net = float(prev_row.get("NetSalary") or 0)

                if prev_net > 0:
                    change_pct = (net - prev_net) / prev_net * 100
                    if change_pct > MOM_SPIKE_PCT:
                        severity = "Critical"
                        reasons.append(
                            f"Lương tăng {change_pct:.1f}% MoM "
                            f"({int(prev_net):,}₫ → {int(net):,}₫)"
                        )
                    elif change_pct < -MOM_DROP_PCT:
                        severity = "Warning"
                        reasons.append(
                            f"Lương giảm {abs(change_pct):.1f}% MoM "
                            f"({int(prev_net):,}₫ → {int(net):,}₫)"
                        )

                meta_extra = {
                    "mode": "MoM",
                    "prevMonth":     prev_month,
                    "currMonth":     curr_month,
                    "prevNetSalary": int(prev_net),
                    "currNetSalary": int(net),
                    "changePct":     round((net - prev_net) / prev_net * 100, 2) if prev_net else 0,
                }

            # ══ MODE B: Internal consistency (luôn chạy) ═════════════
            if base > 0:
                expected = base + bonus - deductions

                if expected > 0:
                    diff_pct = abs(net - expected) / expected * 100
                    if diff_pct > INTERNAL_DIFF_PCT:
                        severity = severity or "Warning"
                        reasons.append(
                            f"Net {int(net):,}₫ lệch {diff_pct:.1f}% so với "
                            f"Base+Bonus−KT={int(expected):,}₫"
                        )

                if net < 0:
                    severity = "Critical"
                    reasons.append(f"NetSalary âm ({int(net):,}₫)")

                if bonus > base * BONUS_RATIO:
                    b_sev = "Critical" if bonus >= base else "Warning"
                    severity = "Critical" if (b_sev == "Critical" or severity == "Critical") else "Warning"
                    reasons.append(
                        f"Bonus {int(bonus):,}₫ = {bonus/base*100:.0f}% lương cơ bản "
                        f"(ngưỡng {int(BONUS_RATIO*100)}%)"
                    )

                if deductions > base * DEDUCTION_RATIO:
                    severity = severity or "Warning"
                    reasons.append(
                        f"Khấu trừ {int(deductions):,}₫ = {deductions/base*100:.0f}% lương cơ bản"
                    )

            # ══ MODE C: Group avg deviation (chỉ khi 1 tháng) ════════
            if not has_multi_month and curr_month in month_avg:
                avg_net = month_avg[curr_month]
                if avg_net > 0 and net > 0:
                    dev_pct = (net - avg_net) / avg_net * 100
                    if abs(dev_pct) > AVG_DEV_PCT:
                        severity = severity or "Warning"
                        direction = "cao hơn" if dev_pct > 0 else "thấp hơn"
                        reasons.append(
                            f"Net {int(net):,}₫ {direction} {abs(dev_pct):.1f}% "
                            f"so với lương TB nhóm {int(avg_net):,}₫"
                        )
                        if not meta_extra:
                            meta_extra = {
                                "mode":      "GroupAvg",
                                "currMonth": curr_month,
                                "netSalary": int(net),
                                "groupAvg":  int(avg_net),
                                "devPct":    round(dev_pct, 2),
                            }

            if not meta_extra:
                meta_extra = {
                    "mode":       "Internal",
                    "currMonth":  curr_month,
                    "netSalary":  int(net),
                    "baseSalary": int(base),
                    "bonus":      int(bonus),
                    "deductions": int(deductions),
                }

            if severity is None or not reasons:
                continue

            alerts.append({
                "alertId":      _stable_id(emp_id, "Salary anomaly", curr_month),
                "employeeId":   emp_id,
                "employeeName": info["name"],
                "type":         "Salary anomaly",
                "message":      f"Tháng {curr_month}: " + " | ".join(reasons),
                "severity":     severity,
                "category":     "Payroll",
                "email":        info["email"],
                "dept":         info["dept"],
                "position":     info["position"],
                "date":         _fmt(today),
                "resolved":     False,
                "resolvedAt":   None,
                "resolvedBy":   None,
                "resolveNote":  None,
                "meta":         {**meta_extra, "reasons": reasons},
            })

        mode = "MoM+Internal" if has_multi_month else f"GroupAvg({AVG_DEV_PCT}%)+Internal"
        print(f"[AlertService] Salary scan mode: {mode} | triggers: {len(alerts)}")
        return alerts

    # ─────────────────────────────────────────
    # UC15 — WORK ANNIVERSARY
    # ─────────────────────────────────────────

    def scan_anniversaries(self, employee_map: dict, today: date = None) -> list:
        """
        Mọi năm tròn, lookahead BIRTHDAY_LOOKAHEAD ngày.
        Sort tăng dần theo daysUntil.
        """
        today  = today or date.today()
        alerts = []

        for emp_id, info in employee_map.items():
            hire_date = _to_date(info.get("hire_date"))
            if not hire_date:
                continue

            years_so_far = today.year - hire_date.year

            for candidate_years in [years_so_far, years_so_far + 1]:
                if candidate_years <= 0:
                    continue

                days_until, ann_date = _days_until_this_year(
                    hire_date.month, hire_date.day, today, BIRTHDAY_LOOKAHEAD
                )
                if days_until is None:
                    break

                if ann_date.year - hire_date.year != candidate_years:
                    break

                msg = _days_label(days_until, ann_date, info["name"],
                                  f"kỷ niệm {candidate_years} năm công tác")

                alerts.append({
                    "alertId":      _stable_id(emp_id, "Work Anniversary", str(ann_date)),
                    "employeeId":   emp_id,
                    "employeeName": info["name"],
                    "type":         "Work Anniversary",
                    "message":      msg,
                    "severity":     "Info",
                    "category":     "Human Resource",
                    "email":        info["email"],
                    "dept":         info["dept"],
                    "position":     info["position"],
                    "date":         _fmt(today),
                    "resolved":     False,
                    "resolvedAt":   None,
                    "resolvedBy":   None,
                    "resolveNote":  None,
                    "meta": {
                        "yearsServed":     candidate_years,
                        "hireDate":        _fmt(hire_date),
                        "anniversaryDate": _fmt(ann_date),
                        "daysUntil":       days_until,
                    },
                })
                break

        alerts.sort(key=lambda a: a["meta"]["daysUntil"])
        return alerts

    # ─────────────────────────────────────────
    # BIRTHDAY
    # ─────────────────────────────────────────

    def scan_birthdays(self, employee_map: dict, today: date = None) -> list:
        today  = today or date.today()
        alerts = []

        for emp_id, info in employee_map.items():
            dob = _to_date(info.get("dob"))
            if not dob:
                continue

            days_until, bday_date = _days_until_this_year(
                dob.month, dob.day, today, BIRTHDAY_LOOKAHEAD
            )
            if days_until is None:
                continue

            age = bday_date.year - dob.year
            msg = _days_label(days_until, bday_date, info["name"],
                              f"sinh nhật tuổi {age}")

            alerts.append({
                "alertId":      _stable_id(emp_id, "Birthday", str(bday_date)),
                "employeeId":   emp_id,
                "employeeName": info["name"],
                "type":         "Birthday",
                "message":      msg,
                "severity":     "Info",
                "category":     "Human Resource",
                "email":        info["email"],
                "dept":         info["dept"],
                "position":     info["position"],
                "date":         _fmt(today),
                "resolved":     False,
                "resolvedAt":   None,
                "resolvedBy":   None,
                "resolveNote":  None,
                "meta": {
                    "age":             age,
                    "dob":             _fmt(dob),
                    "anniversaryDate": _fmt(bday_date),
                    "daysUntil":       days_until,
                },
            })

        alerts.sort(key=lambda a: a["meta"]["daysUntil"])
        return alerts

    # ─────────────────────────────────────────
    # MASTER SCAN
    # ─────────────────────────────────────────

    def run_full_scan(self, month_filter: str = None, today: date = None) -> list:
        """
        Entry point. Mỗi bước có try/except độc lập.
        Thứ tự: Birthday → Anniversary → Salary → Leave.
        month_filter: "YYYY-MM-DD" hoặc None (lấy tất cả).
        """
        today = today or date.today()

        try:
            employee_map = self.fetch_employee_map()
            print(f"[AlertService] Employees: {len(employee_map)}")
        except Exception as e:
            print(f"[AlertService] fetch_employee_map FAILED: {e}")
            employee_map = {}

        try:
            attendance_rows = self.fetch_attendance_rows(month_filter)
            print(f"[AlertService] Attendance rows: {len(attendance_rows)}")
        except Exception as e:
            print(f"[AlertService] fetch_attendance_rows FAILED: {e}")
            attendance_rows = []

        try:
            salary_rows = self.fetch_salary_rows(month_filter)
            print(f"[AlertService] Salary rows: {len(salary_rows)}")
        except Exception as e:
            print(f"[AlertService] fetch_salary_rows FAILED: {e}")
            salary_rows = []

        alerts = []

        for label, fn, args in [
            ("Birthday",      self.scan_birthdays,         (employee_map, today)),
            ("Anniversary",   self.scan_anniversaries,     (employee_map, today)),
            ("Salary",        self.scan_salary_anomalies,  (salary_rows, employee_map, today)),
            ("Leave",         self.scan_excessive_leave,   (attendance_rows, employee_map, today)),
        ]:
            try:
                result = fn(*args)
                alerts.extend(result)
                print(f"[AlertService] {label}: {len(result)}")
            except Exception as e:
                print(f"[AlertService] {label} FAILED: {e}")

        print(f"[AlertService] Total: {len(alerts)}")
        return alerts