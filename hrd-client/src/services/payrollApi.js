
const API_URL = "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

const authHeader = () => ({
  Authorization: getToken() ? `Bearer ${getToken()}` : "",
});

const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
};

// ─── GET LIST ─────────────────────────────────────────────────
export const getPayroll = async ({ month, department } = {}) => {
  try {
    const params = new URLSearchParams();
    if (month) params.append("month", month);
    if (department && !["", "all", "All Departments"].includes(department))
      params.append("department", department);

    const res  = await fetch(
      `${API_URL}/api/payroll${params.toString() ? `?${params}` : ""}`,
      { headers: authHeader() }
    );
    const data = await safeJson(res);
    if (!res.ok || !data) return [];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("getPayroll error:", err);
    return [];
  }
};

// ─── GET DETAIL ───────────────────────────────────────────────
export const getPayrollDetail = async (empId) => {
  try {
    if (!empId || isNaN(empId)) return null;
    const res  = await fetch(`${API_URL}/api/payroll/${Number(empId)}`, {
      headers: authHeader(),
    });
    const data = await safeJson(res);
    if (!res.ok || !data) return null;
    return data;
  } catch (err) {
    console.error("getPayrollDetail error:", err);
    return null;
  }
};

// ─── SALARY HISTORY (Salary Trend chart) ──────────────────────
export const getPayrollHistory = async (empId) => {
  try {
    if (!empId || isNaN(empId)) return [];
    const res  = await fetch(
      `${API_URL}/api/payroll/history/${Number(empId)}`,
      { headers: authHeader() }
    );
    const data = await safeJson(res);
    if (!res.ok || !data) return [];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("getPayrollHistory error:", err);
    return [];
  }
};

// ─── CALCULATE PAYROLL ────────────────────────────────────────
export const calculatePayroll = async (data) => {
  try {
    const res    = await fetch(`${API_URL}/api/payroll/calculate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body:    JSON.stringify(data),
    });
    const result = await safeJson(res);
    if (!res.ok) return { error: result?.error || "Calculate failed" };
    return result;
  } catch (err) {
    console.error("calculatePayroll error:", err);
    return { error: "Server error" };
  }
};

// ─── ANOMALY ALERT ────────────────────────────────────────────
export const getPayrollAlert = async (empId) => {
  try {
    if (!empId || isNaN(empId)) return null;
    const res  = await fetch(
      `${API_URL}/api/payroll/alert/${Number(empId)}`,
      { headers: authHeader() }
    );
    const data = await safeJson(res);
    if (!res.ok || !data) return null;
    return data;
  } catch (err) {
    console.error("getPayrollAlert error:", err);
    return null;
  }
};

// ─── UPDATE PAYROLL (Edit Modal) ─────────────────────────────
export const updatePayroll = async (salaryId, payload) => {
  try {
    const res    = await fetch(`${API_URL}/api/payroll/${Number(salaryId)}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body:    JSON.stringify(payload),
    });
    const result = await safeJson(res);
    if (!res.ok) return { error: result?.error || "Update failed" };
    return result;
  } catch (err) {
    console.error("updatePayroll error:", err);
    return { error: "Server error" };
  }
};