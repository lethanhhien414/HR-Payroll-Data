
const API_URL = "http://localhost:5000";

const getToken = () =>
  sessionStorage.getItem("token") ||
  localStorage.getItem("token")   || "";

const makeHeaders = (withBody = false) => {
  const token = getToken();
  const h = {};
  if (withBody) h["Content-Type"] = "application/json";
  if (token)    h["Authorization"] = `Bearer ${token}`;
  return h;
};

const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text || `HTTP ${res.status}` }; }
};

const handleUnauthorized = (body) => {
  const msg = body?.error || body?.message || "";
  if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  }
};

// GET ALL
export const getDepartments = async (name = "") => {
  try {
    const query = name && name.trim() ? `?name=${encodeURIComponent(name.trim())}` : "";
    const res  = await fetch(`${API_URL}/api/departments${query}`, { headers: makeHeaders() });
    const data = await safeJson(res);
    if (!res.ok) { if (res.status === 401) handleUnauthorized(data); return []; }
    return Array.isArray(data) ? data : [];
  } catch (err) { return []; }
};

// GET DETAIL
export const getDepartmentDetail = async (id) => {
  try {
    if (!id || isNaN(id)) return null;
    const res  = await fetch(`${API_URL}/api/departments/${Number(id)}`, { headers: makeHeaders() });
    if (res.status === 401) { handleUnauthorized(await safeJson(res)); return null; }
    if (!res.ok) return null;
    return await safeJson(res);
  } catch { return null; }
};

export const getDepartmentEmployees = async (id) => {
  try {
    if (!id || isNaN(id)) return [];
    const res  = await fetch(`${API_URL}/api/departments/${Number(id)}/employees`, { headers: makeHeaders() });
    const data = await safeJson(res);
    if (!res.ok) { if (res.status === 401) handleUnauthorized(data); return []; }
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

// CREATE
export const createDepartment = async (data) => {
  try {
    const res    = await fetch(`${API_URL}/api/departments`, {
      method: "POST", headers: makeHeaders(true), body: JSON.stringify(data),
    });
    const result = await safeJson(res);
    if (res.status === 401) { handleUnauthorized(result); return { error: "Session expired" }; }
    if (!res.ok) return { error: result?.error || `HTTP ${res.status}` };
    return result;
  } catch (err) { return { error: err.message }; }
};

// UPDATE
export const updateDepartment = async (id, data) => {
  try {
    if (!id || isNaN(id)) return { error: "Invalid ID" };
    const res    = await fetch(`${API_URL}/api/departments/${Number(id)}`, {
      method: "PUT", headers: makeHeaders(true), body: JSON.stringify(data),
    });
    const result = await safeJson(res);
    if (res.status === 401) { handleUnauthorized(result); return { error: "Session expired" }; }
    if (!res.ok) return { error: result?.error || `HTTP ${res.status}` };
    return result;
  } catch (err) { return { error: err.message }; }
};

// DELETE
export const deleteDepartment = async (id) => {
  try {
    if (!id || isNaN(id)) return { error: "Invalid ID" };
    const res    = await fetch(`${API_URL}/api/departments/${Number(id)}`, {
      method: "DELETE", headers: makeHeaders(),
    });
    const result = await safeJson(res);
    if (res.status === 401) { handleUnauthorized(result); return { error: "Session expired" }; }
    if (!res.ok) return { error: result?.error || `HTTP ${res.status}` };
    return result;
  } catch (err) { return { error: err.message }; }
};