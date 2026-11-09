

const BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:5000";
const API_BASE = `${BASE_URL}/api/alerts`;

const getToken = () =>
  sessionStorage.getItem("token") ||
  localStorage.getItem("token")   ||
  "";

const getRole = () =>
  sessionStorage.getItem("role") ||
  localStorage.getItem("role")   ||
  "admin";

const makeHeaders = (withBody = false) => {
  const token = getToken();
  const role  = getRole();
  const h = {
    "X-User-Role": role,
  };
  if (withBody) h["Content-Type"] = "application/json";
  if (token)    h["Authorization"] = `Bearer ${token}`;
  return h;
};

const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { error: text || `HTTP ${res.status}` }; }
};

// ── Auto-logout khi token expired ────────────────────────────────────
const handleUnauthorized = (body) => {
  const msg = (body?.error || body?.message || "").toLowerCase();
  if (msg.includes("expired") || msg.includes("invalid token")) {
    console.warn("[alertApi] Token expired — redirecting to login");
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  }
};


const AlertApi = {

  /**
   *
   * @param {Object} params
   * @param {string}  [params.month]           - "YYYY-MM"
   * @param {string}  [params.type]            - loại alert
   * @param {string}  [params.severity]        - Critical | Warning | Info
   * @param {boolean} [params.includeResolved] - default false
   * @returns {Promise<{ alerts: Alert[], total: number, warnings?: Object }>}
   */
  async scanAlerts({ month, type, severity, includeResolved = false } = {}) {
    try {
      const params = new URLSearchParams();
      if (month)           params.append("month",            month);
      if (type)            params.append("type",             type);
      if (severity)        params.append("severity",         severity);
      if (includeResolved) params.append("include_resolved", "true");

      const query = params.toString();
      const url   = `${API_BASE}/system-scan${query ? `?${query}` : ""}`;

      const res  = await fetch(url, { headers: makeHeaders() });
      const data = await safeJson(res);

      if (!res.ok) {
        if (res.status === 401) handleUnauthorized(data);
        console.error("[alertApi.scanAlerts]", res.status, data);
        return { alerts: [], total: 0 };
      }

      return data; // { alerts, total, warnings? }
    } catch (err) {
      console.error("[alertApi.scanAlerts] Network error:", err.message);
      return { alerts: [], total: 0 };
    }
  },


  /**
   * Lấy lịch sử các lần scan.
   * @param {number} [limit=50]
   * @returns {Promise<{ history: Object[], total: number }>}
   */
  async getHistory(limit = 50) {
    try {
      const res  = await fetch(`${API_BASE}/history?limit=${limit}`, { headers: makeHeaders() });
      const data = await safeJson(res);
      if (!res.ok) { if (res.status === 401) handleUnauthorized(data); return { history: [], total: 0 }; }
      return data;
    } catch (err) {
      console.error("[alertApi.getHistory]", err.message);
      return { history: [], total: 0 };
    }
  },


  /**
   * Đánh dấu một alert đã xử lý.
   * @param {string} alertId
   * @param {string} resolvedBy
   * @param {string} [note]
   * @returns {Promise<{ success: boolean, alertId: string, resolvedAt: string, message: string }>}
   */
  async resolveAlert(alertId, resolvedBy, note = "") {
    try {
      const res  = await fetch(`${API_BASE}/${alertId}/resolve`, {
        method:  "POST",
        headers: makeHeaders(true),
        body:    JSON.stringify({ resolvedBy, note }),
      });
      const data = await safeJson(res);
      if (!res.ok) { if (res.status === 401) handleUnauthorized(data); return { error: data?.error || `HTTP ${res.status}` }; }
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },


  /**
   * Xử lý hàng loạt nhiều alert.
   * @param {string[]} alertIds
   * @param {string}   resolvedBy
   * @param {string}   [note]
   * @returns {Promise<{ success: boolean, results: Object, message: string }>}
   */
  async resolveBulk(alertIds, resolvedBy, note = "") {
    try {
      const res  = await fetch(`${API_BASE}/resolve-bulk`, {
        method:  "POST",
        headers: makeHeaders(true),
        body:    JSON.stringify({ alertIds, resolvedBy, note }),
      });
      const data = await safeJson(res);
      if (!res.ok) { if (res.status === 401) handleUnauthorized(data); return { error: data?.error || `HTTP ${res.status}` }; }
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },


  /**
   * Thống kê tổng quan alert.
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const res  = await fetch(`${API_BASE}/stats`, { headers: makeHeaders() });
      const data = await safeJson(res);
      if (!res.ok) { if (res.status === 401) handleUnauthorized(data); return {}; }
      return data;
    } catch (err) {
      console.error("[alertApi.getStats]", err.message);
      return {};
    }
  },


  countViolations(alerts, empId) {
    const INFO_TYPES = ["Birthday", "Work Anniversary"];
    return alerts.filter(a => a.employeeId === empId && !INFO_TYPES.includes(a.type)).length;
  },

  buildEmailContent(alert) {
    const { type, employeeName, message, meta } = alert;
    switch (type) {
      case "Birthday":
        return {
          subject: `🎂 Chúc mừng sinh nhật ${employeeName}!`,
          body:
            `Chào ${employeeName},\n\n` +
            `Thay mặt Ban lãnh đạo và toàn thể công ty, chúng tôi xin gửi lời chúc mừng sinh nhật ` +
            `lần thứ ${meta?.age || ""} đến bạn! 🥳\n\n` +
            `Chúc bạn một ngày sinh nhật thật vui vẻ, sức khoẻ và hạnh phúc. ` +
            `Cảm ơn bạn đã đồng hành cùng công ty! ✨`,
        };

      case "Work Anniversary":
        return {
          subject: `🏅 Chúc mừng ${meta?.yearsServed} năm thâm niên, ${employeeName}!`,
          body:
            `Chào ${employeeName},\n\n` +
            `Nhân dịp kỷ niệm ${meta?.yearsServed} năm gắn bó với công ty (từ ${meta?.hireDate}), ` +
            `chúng tôi xin gửi lời tri ân chân thành đến bạn.\n\n` +
            `Cảm ơn bạn vì những đóng góp không ngừng nghỉ. Chặng đường phía trước còn nhiều điều thú vị! 🌟`,
        };

      case "Excessive leave":
        return {
          subject: `[Thông báo] Tình trạng nghỉ phép – ${employeeName}`,
          body:
            `Chào ${employeeName},\n\n` +
            `Hệ thống ghi nhận: ${message}.\n\n` +
            `Vui lòng liên hệ phòng Nhân sự để xác nhận lý do và cập nhật thông tin chấm công ` +
            `trong thời gian sớm nhất.\n\n` +
            `Trân trọng,\nPhòng Nhân sự`,
        };

      case "Salary anomaly":
        return {
          subject: `[Thông báo] Biến động lương – ${employeeName}`,
          body:
            `Chào ${employeeName},\n\n` +
            `Hệ thống phát hiện: ${message}.\n` +
            `Lý do: ${meta?.reasons?.join("; ") || meta?.reason || "Cần xác minh thêm"}.\n\n` +
            `Nếu bạn có thắc mắc về bảng lương, vui lòng liên hệ phòng Kế toán để được hỗ trợ.\n\n` +
            `Trân trọng,\nPhòng Kế toán`,
        };

      default:
        return {
          subject: `[Hệ thống] Cảnh báo: ${type} – ${employeeName}`,
          body:
            `Chào ${employeeName},\n\n` +
            `Hệ thống ghi nhận cảnh báo: ${message}.\n` +
            `Vui lòng phản hồi thông tin này sớm nhất có thể.\n\n` +
            `Trân trọng`,
        };
    }
  },

  openMailto(alert) {
    const { subject, body } = this.buildEmailContent(alert);
    const href =
      `mailto:${encodeURIComponent(alert.email)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  },

  getSeverityColors(severity) {
    const map = {
      Critical: { bg: "#fee2e2", text: "#ef4444", border: "#fca5a5" },
      Warning:  { bg: "#fef3c7", text: "#f59e0b", border: "#fcd34d" },
      Info:     { bg: "#e0f2fe", text: "#0ea5e9", border: "#7dd3fc" },
    };
    return map[severity] || map["Info"];
  },

  getTypeEmoji(type) {
    const map = {
      "Birthday":        "🎂",
      "Work Anniversary":"🏅",
      "Salary anomaly":  "💰",
      "Excessive leave": "📅",
    };
    return map[type] || "🔔";
  },
};

export default AlertApi;


// ── Named exports — tương thích với Dashboard.jsx và Reports.jsx ─────

/** Dùng trong Dashboard.jsx: const alerts = await getAlerts() */
export const getAlerts = async (params = {}) => {
  const data = await AlertApi.scanAlerts(params);
  return data.alerts || [];
};

/** Dùng trong Reports.jsx */
export const getLeaveWarnings = async () => {
  const data = await AlertApi.scanAlerts({ type: "Excessive leave" });
  return {
    data: (data.alerts || []).map(a => ({
      EmployeeID:  a.employeeId,
      FullName:    a.employeeName,
      message:     a.message,
      severity:    "warning",
      type:        "leave_exceeded",
      month:       a.meta?.attendanceMonth || "",
      absent_days: a.meta?.absentDays  ?? 0,
      leave_days:  a.meta?.leaveDays   ?? 0,
    })),
  };
};

export const getSalaryWarnings = async () => {
  const data = await AlertApi.scanAlerts({ type: "Salary anomaly" });
  return {
    data: (data.alerts || []).map(a => ({
      EmployeeID:  a.employeeId,
      FullName:    a.employeeName,
      message:     a.message,
      severity:    a.severity === "Critical" ? "critical" : "warning",
      type:        "salary_anomaly",
      curMonth:    a.meta?.currMonth    || a.meta?.salaryMonth || "",
      prevMonth:   a.meta?.prevMonth    || "",
      curSalary:   a.meta?.currNetSalary ?? a.meta?.netSalary ?? 0,
      prevSalary:  a.meta?.prevNetSalary ?? a.meta?.baseline  ?? 0,
      changePct:   a.meta?.changePct    ?? a.meta?.devPct     ?? 0,
    })),
  };
};

export const getTenureNotifications = async () => {
  const [annRes, bdRes] = await Promise.all([
    AlertApi.scanAlerts({ type: "Work Anniversary" }),
    AlertApi.scanAlerts({ type: "Birthday" }),
  ]);
  const toRow = (a) => ({
    EmployeeID:      a.employeeId,
    FullName:        a.employeeName,
    message:         a.message,
    severity:        "info",
    type:            "work_anniversary",
    curMonth:        a.date || "",
    yearsServed:     a.meta?.yearsServed ?? a.meta?.age ?? 0,
    anniversaryDate: a.meta?.anniversaryDate || a.date || "",
    daysUntil:       a.meta?.daysUntil ?? 0,
  });
  return {
    data: [
      ...(annRes.alerts || []).map(toRow),
      ...(bdRes.alerts  || []).map(toRow),
    ],
  };
};