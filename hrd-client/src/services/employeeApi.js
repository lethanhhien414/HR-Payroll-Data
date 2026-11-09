const API_URL = "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

const authHeader = () => ({
  Authorization: getToken() ? `Bearer ${getToken()}` : "",
});

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text }; 
  }
};

// =============================
// GET ALL
// =============================
export const getEmployees = async ({ name, department, status } = {}) => {
  try {
    const params = new URLSearchParams();

    if (name?.trim())
      params.append("name", name.trim());

    if (department && !["", "all", "All Departments"].includes(department))
      params.append("department", department);

    if (status && !["", "all", "All Status"].includes(status))
      params.append("status", status);

    const url = `${API_URL}/api/employees${params.toString() ? `?${params}` : ""}`;

    const res  = await fetch(url, { headers: authHeader() });
    const data = await safeJson(res);

    if (!res.ok || data?.error) {
      console.error("getEmployees API error:", data);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("getEmployees error:", err);
    return [];
  }
};

// =============================
// GET DETAIL
// =============================
export const getEmployeeDetail = async (id) => {
  try {
    if (!id || isNaN(id)) return null;

    const res  = await fetch(`${API_URL}/api/employees/${Number(id)}`, {
      headers: authHeader(),
    });

    const data = await safeJson(res);

    if (!res.ok || data?.error) return null;

    return data;
  } catch (err) {
    console.error("getEmployeeDetail error:", err);
    return null;
  }
};

// =============================
// CREATE
// =============================
export const createEmployee = async (data) => {
  try {
    const res = await fetch(`${API_URL}/api/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify(data),
    });

    const result = await safeJson(res);

    if (!res.ok || result?.error) {
      console.error("createEmployee API error:", result);
      return { error: result?.error || "Create failed" };
    }

    return result;
  } catch (err) {
    console.error("createEmployee error:", err);
    return { error: "Server error" };
  }
};

// =============================
// UPDATE
// =============================
export const updateEmployee = async (id, data) => {
  try {
    if (!id || isNaN(id)) return { error: "Invalid ID" };

    const res = await fetch(`${API_URL}/api/employees/${Number(id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify(data),
    });

    const result = await safeJson(res);

    if (!res.ok || result?.error) {
      return { error: result?.error || "Update failed" };
    }

    return result;
  } catch (err) {
    console.error("updateEmployee error:", err);
    return { error: "Update failed" };
  }
};

// =============================
// DELETE
// =============================
export const deleteEmployee = async (id) => {
  try {
    if (!id || isNaN(id)) return { error: "Invalid ID" };

    const res = await fetch(`${API_URL}/api/employees/${Number(id)}`, {
      method: "DELETE",
      headers: authHeader(),
    });

    const result = await safeJson(res);

    if (!res.ok || result?.error) {
      return { error: result?.error || "Delete failed" };
    }

    return result;
  } catch (err) {
    console.error("deleteEmployee error:", err);
    return { error: "Delete failed" };
  }
};