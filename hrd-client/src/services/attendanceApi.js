
const API_URL = "http://localhost:5000";

const getToken = () =>
  sessionStorage.getItem("token") ||
  localStorage.getItem("token")   ||
  sessionStorage.getItem("access_token") ||
  localStorage.getItem("access_token")   ||
  "";

const makeHeaders = (withBody = false) => {
  const token = getToken();
  const h = {};
  if (withBody) h["Content-Type"] = "application/json";
  if (token)    h["Authorization"] = `Bearer ${token}`;
  return h;
};

const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { error: text || `HTTP ${res.status}` }; }
};


const handleUnauthorized = (body) => {
  const msg = body?.error || body?.message || "";
  if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
    console.warn("[attendanceApi] Token expired — redirecting to login");
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    // Redirect về trang login
    window.location.href = "/";
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────────────────────────────
export const getAttendance = async () => {
  try {
    const res = await fetch(`${API_URL}/api/attendance`, {
      method: "GET",
      headers: makeHeaders(),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      console.error("[getAttendance] HTTP", res.status, data);
      if (res.status === 401) handleUnauthorized(data);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[getAttendance] Network error:", err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET DETAIL
// ─────────────────────────────────────────────────────────────────────
export const getAttendanceDetail = async (id) => {
  try {
    if (!id || isNaN(id)) return null;
    const res = await fetch(`${API_URL}/api/attendance/${Number(id)}`, {
      headers: makeHeaders(),
    });
    if (res.status === 401) { handleUnauthorized(await safeJson(res)); return null; }
    if (!res.ok) return null;
    return await safeJson(res);
  } catch (err) {
    console.error("[getAttendanceDetail]", err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────
export const createAttendance = async (data) => {
  try {
    const res = await fetch(`${API_URL}/api/attendance`, {
      method: "POST",
      headers: makeHeaders(true),
      body: JSON.stringify(data),
    });
    const result = await safeJson(res);
    if (res.status === 401) { handleUnauthorized(result); return { error: "Session expired" }; }
    if (!res.ok) return { error: result?.error || `HTTP ${res.status}` };
    return result;
  } catch (err) {
    return { error: err.message };
  }
};

// ─────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────
export const updateAttendance = async (id, data) => {
  try {
    if (!id || isNaN(id)) return { error: "Invalid ID" };
    const res = await fetch(`${API_URL}/api/attendance/${Number(id)}`, {
      method: "PUT",
      headers: makeHeaders(true),
      body: JSON.stringify(data),
    });
    const result = await safeJson(res);
    if (res.status === 401) { handleUnauthorized(result); return { error: "Session expired" }; }
    if (!res.ok) return { error: result?.error || `HTTP ${res.status}` };
    return result;
  } catch (err) {
    return { error: err.message };
  }
};

// ─────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────
export const deleteAttendance = async (id) => {
  try {
    if (!id || isNaN(id)) return { error: "Invalid ID" };
    const res = await fetch(`${API_URL}/api/attendance/${Number(id)}`, {
      method: "DELETE",
      headers: makeHeaders(),
    });
    const result = await safeJson(res);
    if (res.status === 401) { handleUnauthorized(result); return { error: "Session expired" }; }
    if (!res.ok) return { error: result?.error || `HTTP ${res.status}` };
    return result;
  } catch (err) {
    return { error: err.message };
  }
};