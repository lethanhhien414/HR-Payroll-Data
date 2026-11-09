import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsEye, BsEyeSlash, BsCheckCircleFill } from "react-icons/bs";
import { loginApi } from "../services/authApi";

function getStored(key) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

export default function Login() {
  const navigate = useNavigate();

  // Nếu đã login rồi → redirect thẳng về dashboard
  // Tránh vòng lặp: /users → AdminGuard → "/" → Login → lặp lại
  useEffect(() => {
    const token = getStored("token");
    const role  = getStored("role");
    if (token && role) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [remember, setRemember] = useState(false);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState(null);

  const clearErr = () => setError(null);

  const doLogin = async () => {
    if (!username.trim() || !password) {
      setError("empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await loginApi(username.trim(), password, remember);

      if (data && !data.error) {

        const token = getStored("token");
        const role  = getStored("role");

        if (!token || !role) {

          try {
            const storage = remember ? localStorage : sessionStorage;
            if (data.token)  storage.setItem("token",    data.token);
            if (data.role)   storage.setItem("role",     data.role);
            if (data.username) storage.setItem("username", data.username);
          } catch (e) {
            console.warn("Storage blocked, using sessionStorage fallback:", e);
          }
        }

        navigate("/dashboard", { replace: true });
      } else {
        setError("invalid");
      }
    } catch (err) {
      setError("server");
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter") doLogin(); };

  const page = {
    fontFamily:     "'Inter', sans-serif",
    background:     "#eaf3ff",
    minHeight:      "100vh",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    margin:         0,
    padding:        "20px",
    boxSizing:      "border-box",
  };

  const card = {
    width:        900,
    maxWidth:     "100%",
    display:      "flex",
    borderRadius: 20,
    overflow:     "hidden",
    boxShadow:    "0 20px 60px rgba(30,58,138,.14)",
    background:   "#fff",
    minHeight:    460,
  };

  const formSide = {
    width:          "50%",
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "48px",
    background:     "#fff",
  };

  const formBox = { width: "100%", maxWidth: 320 };

  const formTitle = {
    fontSize:   24,
    fontWeight: 800,
    color:      "#0f172a",
    margin:     0,
    lineHeight: 1.2,
  };

  const formSub = {
    fontSize:     12,
    color:        "#94a3b8",
    marginTop:    5,
    marginBottom: 10,
    lineHeight:   1.4,
  };

  const alertBase = {
    borderRadius: 10,
    padding:      "10px 12px",
    fontSize:     12,
    marginTop:    10,
    marginBottom: 0,
  };

  const fLabel = {
    fontSize:     12,
    fontWeight:   600,
    color:        "#334155",
    marginBottom: 5,
    display:      "block",
  };

  const fInpBase = {
    width:        "100%",
    padding:      "11px 12px",
    borderRadius: 10,
    border:       "1.5px solid #bfdbfe",
    background:   "#eff6ff",
    fontSize:     13,
    fontFamily:   "'Inter', sans-serif",
    outline:      "none",
    boxSizing:    "border-box",
    color:        "#0f172a",
    transition:   "border-color .15s, box-shadow .15s, background .15s",
    display:      "block",
  };

  const fInpFocus = {
    borderColor: "#2563eb",
    background:  "#fff",
    boxShadow:   "0 0 0 3px rgba(37,99,235,.1)",
  };

  const inp = (name, extra = {}) => ({
    ...fInpBase,
    ...(focused === name ? fInpFocus : {}),
    ...extra,
  });

  const pwdWrap = { position: "relative" };

  const pwdEye = {
    position:   "absolute",
    right:      10,
    top:        "50%",
    transform:  "translateY(-50%)",
    cursor:     "pointer",
    color:      "#93c5fd",
    background: "none",
    border:     "none",
    padding:    0,
    display:    "flex",
    alignItems: "center",
    lineHeight: 1,
  };

  const btnLogin = {
    width:         "100%",
    padding:       "12px",
    border:        "none",
    borderRadius:  10,
    background:    "#1e3a8a",
    color:         "#fff",
    fontWeight:    700,
    fontSize:      14,
    marginTop:     10,
    cursor:        "pointer",
    fontFamily:    "'Inter', sans-serif",
    letterSpacing: 0.2,
    transition:    "background .2s",
    ...(loading ? { opacity: 0.7, cursor: "not-allowed" } : {}),
  };

  const formNote = {
    marginTop: 20,
    textAlign: "center",
    fontSize:  11,
    color:     "#94a3b8",
  };

  const heroSide = {
    width:          "50%",
    flexShrink:     0,
    background:     "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
    color:          "#fff",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    textAlign:      "center",
    padding:        40,
    position:       "relative",
    overflow:       "hidden",
  };

  const circle1 = {
    position:      "absolute",
    width:         280,
    height:        280,
    background:    "rgba(255,255,255,.06)",
    borderRadius:  "50%",
    top:           -80,
    left:          -80,
    pointerEvents: "none",
  };

  const circle2 = {
    position:      "absolute",
    width:         200,
    height:        200,
    background:    "rgba(255,255,255,.06)",
    borderRadius:  "50%",
    bottom:        -60,
    right:         -60,
    pointerEvents: "none",
  };

  const wContent = { position: "relative", zIndex: 1 };

  const wTitle = {
    fontSize:     30,
    fontWeight:   800,
    marginBottom: 10,
    color:        "#fff",
    lineHeight:   1.2,
  };

  const wSub = {
    fontSize:     13,
    opacity:      0.85,
    marginBottom: 20,
    lineHeight:   1.65,
  };

  const wItem = {
    fontSize:       13,
    margin:         "6px 0",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            7,
    opacity:        0.92,
  };

  return (
    <div style={page}>
      <div style={card}>

        <div style={formSide}>
          <div style={formBox}>

            <div style={formTitle}>Sign In</div>
            <div style={formSub}>Only authorized users can access the system.</div>

            {error === "invalid" && (
              <div style={{ ...alertBase, background: "#fef2f2", border: "1px solid #fee2e2", color: "#dc2626" }}>
                Invalid username or password
              </div>
            )}
            {error === "empty" && (
              <div style={{ ...alertBase, background: "#fff7ed", border: "1px solid #fdba74", color: "#c2410c" }}>
                Please enter all fields
              </div>
            )}
            {error === "server" && (
              <div style={{ ...alertBase, background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569" }}>
                Server error. Please try again.
              </div>
            )}

            {/* Username */}
            <div style={{ marginTop: 16, marginBottom: 12 }}>
              <label style={fLabel}>Username</label>
              <input
                style={inp("username")}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearErr(); }}
                onFocus={() => setFocused("username")}
                onBlur={() => setFocused(null)}
                onKeyDown={onKey}
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <label style={fLabel}>Password</label>
              <div style={pwdWrap}>
                <input
                  style={inp("password", { paddingRight: 38 })}
                  type={showPwd ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearErr(); }}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  onKeyDown={onKey}
                  autoComplete="new-password"
                />
                <button
                  style={pwdEye}
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <BsEyeSlash size={15} /> : <BsEye size={15} />}
                </button>
              </div>
            </div>

            <div style={{
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              marginTop:      8,
              marginBottom:   12,
            }}>
              <label style={{
                fontSize:   12,
                display:    "flex",
                alignItems: "center",
                gap:        6,
                cursor:     "pointer",
                color:      "#334155",
              }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: "#1e3a8a" }}
                />
                Remember me
              </label>
              <a href="#" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>
                Forgot?
              </a>
            </div>

            <button
              style={btnLogin}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#1e40af"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#1e3a8a"; }}
              onClick={doLogin}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
            </button>

            <div style={formNote}>Secured by JWT · RBAC</div>
          </div>
        </div>

        <div style={heroSide}>
          <div style={circle1} />
          <div style={circle2} />
          <div style={wContent}>
            <h2 style={wTitle}>Hello, Friend!</h2>
            <p style={wSub}>
              Welcome to HR Data Dashboard.<br />
              Manage employees, payroll and reports easily.
            </p>
            <div style={wItem}><BsCheckCircleFill size={14} /> Welcome back to your workspace</div>
            <div style={wItem}><BsCheckCircleFill size={14} /> Manage your tasks efficiently</div>
            <div style={wItem}><BsCheckCircleFill size={14} /> Stay productive and organized</div>
          </div>
        </div>

      </div>
    </div>
  );
}