const API_URL = "http://localhost:5000";

// =============================
// LOGIN
// =============================
export const loginApi = async (username, password, remember = true) => {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username?.trim(),
        password,
      }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      return { error: data.error || "Login failed" };
    }

    const storage = remember ? localStorage : sessionStorage;

    if (data.token)    storage.setItem("token",    data.token);
    if (data.role)     storage.setItem("role",     data.role);
    if (data.username) storage.setItem("username", data.username);

    return data;
  } catch (err) {
    console.error("loginApi error:", err);
    return { error: "Server error" };
  }
};

// =============================
// LOGOUT
// =============================
export const logoutApi = async () => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  if (token) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
    }
  }

  // Xóa cả 2 storage
  ["token", "role", "username"].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};