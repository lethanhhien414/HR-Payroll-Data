const API_URL = "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

// =============================
// GET ALL + SEARCH
// =============================
export const getPositions = async (name = "") => {
  try {
    const query =
      name && name.trim()
        ? `?name=${encodeURIComponent(name.trim())}`
        : "";

    const res = await fetch(`${API_URL}/api/positions${query}`, {
      headers: {
        Authorization: getToken() ? `Bearer ${getToken()}` : "",
      },
    });

    if (!res.ok) throw new Error("Fetch positions failed");

    return await res.json();
  } catch (err) {
    console.error("getPositions error:", err);
    return [];
  }
};

// =============================
// GET DETAIL
// =============================
export const getPositionDetail = async (id) => {
  try {
    const res = await fetch(`${API_URL}/api/positions/${id}`, {
      headers: {
        Authorization: getToken() ? `Bearer ${getToken()}` : "",
      },
    });

    if (!res.ok) throw new Error("Position not found");

    return await res.json();
  } catch (err) {
    console.error("getPositionDetail error:", err);
    return null;
  }
};

// =============================
// CREATE
// =============================
export const createPosition = async (data) => {
  try {
    const res = await fetch(`${API_URL}/api/positions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getToken() ? `Bearer ${getToken()}` : "",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Create failed");

    return await res.json();
  } catch (err) {
    console.error("createPosition error:", err);
    return { error: "Create failed" };
  }
};

// =============================
// UPDATE
// =============================
export const updatePosition = async (id, data) => {
  try {
    const res = await fetch(`${API_URL}/api/positions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: getToken() ? `Bearer ${getToken()}` : "",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Update failed");

    return await res.json();
  } catch (err) {
    console.error("updatePosition error:", err);
    return { error: "Update failed" };
  }
};

// =============================
// DELETE
// =============================
export const deletePosition = async (id) => {
  try {
    const res = await fetch(`${API_URL}/api/positions/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: getToken() ? `Bearer ${getToken()}` : "",
      },
    });

    if (!res.ok) throw new Error("Delete failed");

    return await res.json();
  } catch (err) {
    console.error("deletePosition error:", err);
    return { error: "Delete failed" };
  }
};