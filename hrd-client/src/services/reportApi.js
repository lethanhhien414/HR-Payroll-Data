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

export const getDashboardReport = async (month) => {
  try {
    const q = month ? `?month=${encodeURIComponent(month)}` : "";
    const res = await fetch(`${API_URL}/api/reports/dashboard${q}`, { headers: authHeader() });
    const data = await safeJson(res);
    if (!res.ok || !data || data.error) return {};
    return data;
  } catch { return {}; }
};

export const getDepartmentReport = async (month) => {
  try {
    const q = month ? `?month=${encodeURIComponent(month)}` : "";
    const res = await fetch(`${API_URL}/api/reports/departments${q}`, { headers: authHeader() });
    const data = await safeJson(res);
    if (!res.ok || !data) return [];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

export const getSalaryTrend = async (employeeId) => {
  try {
    const q = employeeId && !isNaN(employeeId) ? `?employee=${Number(employeeId)}` : "";
    const res = await fetch(`${API_URL}/api/reports/trend${q}`, { headers: authHeader() });
    const data = await safeJson(res);
    if (!res.ok || !data) return [];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

export const getTopEmployees = async (limit = 5) => {
  try {
    const res = await fetch(`${API_URL}/api/reports/top?limit=${Number(limit) || 5}`, { headers: authHeader() });
    const data = await safeJson(res);
    if (!res.ok || !data) return [];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

export const getAlerts = async () => {
  try {
    const res = await fetch(`${API_URL}/api/alerts`, { headers: authHeader() });
    const data = await safeJson(res);
    if (!res.ok || !data) return [];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

export const getDividendReport = async () => {
  try {
    const res = await fetch(
      `${API_URL}/api/reports/dividends`,
      { headers: authHeader() }
    );

    const data = await safeJson(res);

    if (!res.ok || !data) return [];

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};