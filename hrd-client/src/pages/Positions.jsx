
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdWork, MdAdd, MdEdit, MdDelete,
  MdSearch, MdRefresh, MdClose,
  MdCheckCircle, MdWarning, MdPeople,
} from "react-icons/md";
import { BsDownload } from "react-icons/bs";

import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import { getPositions, deletePosition } from "../services/positionApi";

const C = {
  navy:    "#1e3a8a", blue600:"#2563eb", blue500:"#3b82f6",
  blue200: "#bfdbfe", blue100:"#dbeafe", blue50:"#eff6ff",
  gray900: "#0f172a", gray800:"#1e293b", gray700:"#334155",
  gray500: "#64748b", gray400:"#94a3b8", gray300:"#cbd5e1",
  green:   "#16a34a", greenLt:"#dcfce7",
  amber:   "#d97706", amberLt:"#fef3c7",
  red:     "#dc2626", redLt:"#fee2e2",
};

const AVATAR_COLORS = [
  ["#4c1d95","#7c3aed"], ["#0c4a6e","#0284c7"], ["#064e3b","#059669"],
  ["#7c2d12","#ea580c"], ["#1e1b4b","#4f46e5"], ["#701a75","#c026d3"],
  ["#991b1b","#ef4444"], ["#064e3b","#34d399"],
];

const getToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token") || "";

const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text }; }
};

function PosAvatar({ name = "", idx = 0 }) {
  const initials = (name || "?")
    .split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const [dark, light] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      background: `linear-gradient(135deg,${dark},${light})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 800, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

function KpiCard({ label, sub, value, color1, color2, icon: Icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "14px 18px",
      boxShadow: "0 2px 8px rgba(0,0,0,.06)", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg,${color1},${color2})`,
        borderRadius: "0 0 14px 14px",
      }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: `${color1}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} style={{ color: color1 }}/>
        </div>
        <span style={{ fontSize: 12, color: C.gray500, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, letterSpacing: -.5 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function PosRow({ pos, idx, canEdit, onEdit, onDel, navigate }) {
  const [hov, setHov] = useState(false);
  const id       = pos.PositionID ?? pos.id;
  const name     = pos.PositionName ?? pos.name ?? "—";
  const empCount = pos.employee_count ?? pos.employeeCount ?? 0;
  const isActive = empCount > 0;

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}

      onClick={() => navigate(`/positions/${id}`)}
      style={{
        borderBottom: `1px solid ${C.blue50}`,
        background: hov ? "#f8fbff" : "#fff",
        cursor: "pointer",
        transition: "background .12s",
      }}
    >

      <td style={{ padding: "10px 14px" }}>
        <PosAvatar name={name} idx={idx}/>
      </td>

      <td style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gray800 }}>{name}</div>
        <div style={{ fontSize: 10, color: C.gray400, fontFamily: "monospace", marginTop: 2 }}>
          #{String(id).padStart(3, "0")}
        </div>
      </td>

      <td style={{ padding: "10px 14px" }}>
        <span
          onClick={e => { e.stopPropagation(); navigate(`/positions/${id}`); }}
          style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: empCount > 0 ? C.blue100 : "#f1f5f9",
            color:      empCount > 0 ? C.navy    : C.gray400,
            display: "inline-flex", alignItems: "center", gap: 4,
            whiteSpace: "nowrap", cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.background = empCount > 0 ? C.blue200 : "#e2e8f0"}
          onMouseLeave={e => e.currentTarget.style.background = empCount > 0 ? C.blue100 : "#f1f5f9"}
        >
          <MdPeople size={11}/>
          {empCount} {empCount === 1 ? "employee" : "employees"}
        </span>
      </td>

      <td style={{ padding: "10px 14px" }}>
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: isActive ? C.greenLt : "#f1f5f9",
          color:      isActive ? C.green   : C.gray400,
        }}>
          {isActive ? "Active" : "Inactive"}
        </span>
      </td>

      {canEdit && (
        <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
          <div style={{
            display: "flex", gap: 4,
            opacity:   hov ? 1 : 0,
            transform: hov ? "scale(1)" : "scale(0.85)",
            transition: "opacity .15s, transform .15s",
          }}>

            <button
              title="Edit"
              onClick={e => { e.stopPropagation(); onEdit(pos); }}
              style={{
                width: 28, height: 28, borderRadius: 7, border: "none",
                cursor: "pointer", background: C.blue50, color: C.navy,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.blue100}
              onMouseLeave={e => e.currentTarget.style.background = C.blue50}
            >
              <MdEdit size={13}/>
            </button>

            <button
              title="Delete"
              onClick={e => { e.stopPropagation(); onDel(pos); }}
              style={{
                width: 28, height: 28, borderRadius: 7, border: "none",
                cursor: "pointer", background: "#fef2f2", color: C.red,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
              onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}
            >
              <MdDelete size={13}/>
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

function DeleteModal({ pos, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const name = pos?.PositionName ?? pos?.name ?? "";
  const id   = pos?.PositionID   ?? pos?.id   ?? "";

  const handle = async () => {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`http://localhost:5000/api/positions/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const res = await safeJson(r);
      if (!r.ok) return setErr(res?.error || `HTTP ${r.status}`);
      onDeleted();
    } catch (e) {
      setErr("Lỗi kết nối server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, overflow: "hidden",
        width: 380, boxShadow: "0 12px 40px rgba(0,0,0,.18)",
      }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#dc2626,#f97316)" }}/>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: C.redLt,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <MdDelete size={18} color={C.red}/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.gray900 }}>Delete Position?</div>
              <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>This action cannot be undone</div>
            </div>
          </div>

          <div style={{
            background: "#f8fafc", borderRadius: 10,
            padding: "10px 14px", marginBottom: 12, border: `1px solid ${C.blue50}`,
          }}>
            <div style={{ fontSize: 10, color: C.gray400, textTransform: "uppercase",
              letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>Position</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gray800 }}>{name}</div>
            <div style={{ fontSize: 10, color: C.gray400, marginTop: 2 }}>
              ID #{String(id).padStart(3, "0")}
            </div>
          </div>

          <div style={{
            background: "#fffbeb", borderRadius: 10, padding: "10px 14px",
            marginBottom: err ? 12 : 20, border: "1px solid #fef3c7",
            display: "flex", gap: 8,
          }}>
            <span style={{ color: C.amber, flexShrink: 0 }}>⚠</span>
            <p style={{ fontSize: 12, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
              Deletion is <strong>blocked</strong> if employees are currently assigned to this position.
            </p>
          </div>

          {err && (
            <div style={{
              background: C.redLt, border: "1px solid #fca5a5", borderRadius: 7,
              padding: "7px 12px", fontSize: 11, color: C.red,
              marginBottom: 16, display: "flex", gap: 6, alignItems: "center",
            }}>
              <MdWarning size={13}/> {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${C.blue100}`, background: "#fff",
              color: C.navy, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={handle} disabled={loading} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? .7 : 1, fontFamily: "inherit",
            }}>
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 2000,
      background: type === "success" ? C.green : C.red,
      color: "#fff", padding: "10px 18px", borderRadius: 10,
      fontSize: 12, fontWeight: 600,
      display: "flex", gap: 8, alignItems: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,.2)",
      animation: "slideIn .2s ease",
    }}>
      {type === "success" ? <MdCheckCircle size={15}/> : <MdWarning size={15}/>}
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════ */
export default function Positions() {
  const navigate = useNavigate();

  const [rawData,   setRawData]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [delTarget, setDelTarget] = useState(null);
  const [toast,     setToast]     = useState(null);

  useEffect(() => {
    const role = sessionStorage.getItem("role") || localStorage.getItem("role");
    if (!role) { navigate("/"); return; }
    fetchData();
  }, []);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const data = await getPositions();
    setRawData(Array.isArray(data) ? data : []);
    if (!quiet) setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? rawData.filter(p => (p.PositionName ?? p.name ?? "").toLowerCase().includes(q))
      : rawData;
  }, [search, rawData]);

  const totalEmp = rawData.reduce((s, p) => s + (p.employee_count ?? 0), 0);
  const staffed  = rawData.filter(p => (p.employee_count ?? 0) > 0).length;

  const role    = sessionStorage.getItem("role") || localStorage.getItem("role");
  const canEdit = ["admin", "hr_manager", "Admin", "HR Manager"].includes(role);
  const hasFilter = !!search;

  const exportCSV = () => {
    const hdr  = "PositionID,PositionName,EmployeeCount,Status";
    const rows = filtered.map(p => {
      const cnt = p.employee_count ?? 0;
      return `${p.PositionID ?? p.id},"${p.PositionName ?? p.name ?? ""}",${cnt},${cnt > 0 ? "Active" : "Inactive"}`;
    });
    const blob = new Blob([[hdr, ...rows].join("\n")], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "positions.csv";
    a.click();
  };

  return (
    <div style={{
      display: "flex", width: "100%", height: "100vh",
      overflow: "hidden", fontFamily: "'Inter',sans-serif", background: "#f0f6ff",
    }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes slideIn { from { opacity:0;transform:translateY(-8px) } to { opacity:1;transform:none } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#dbeafe; border-radius:4px; }
      `}</style>

      <Sidebar/>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar search={search} onSearch={v => setSearch(v)}/>

        {toast && <Toast msg={toast.msg} type={toast.type}/>}

        <main style={{
          flex: 1, overflowY: "auto", padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: C.navy,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <MdWork size={17} color="#fff"/>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.gray900, letterSpacing: -.3 }}>
                  Position Management
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.gray400, marginLeft: 42, fontWeight: 500 }}>
                Manage job positions · click any row to view employees
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={exportCSV} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: "#fff", color: C.navy, border: `1.5px solid ${C.blue100}`,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <BsDownload size={12}/> Export
              </button>
              <button onClick={() => fetchData(true)} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: "#fff", color: C.navy, border: `1.5px solid ${C.blue100}`,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <MdRefresh size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/>
                Refresh
              </button>
              {canEdit && (

                <button onClick={() => navigate("/positions/add")} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: C.navy, color: "#fff", border: "none",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  <MdAdd size={13}/> Add Position
                </button>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            <KpiCard
              label="Total Positions" sub="All registered"
              value={rawData.length} color1="#3b82f6" color2="#93c5fd" icon={MdWork}
            />
            <KpiCard
              label="Total Employees" sub="Across all positions"
              value={totalEmp} color1="#16a34a" color2="#4ade80" icon={MdPeople}
            />
            <KpiCard
              label="Active Positions" sub="Have ≥1 employee"
              value={staffed} color1="#7c3aed" color2="#a78bfa" icon={MdCheckCircle}
            />
          </div>

          <div style={{
            background: "#fff", borderRadius: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,.06)", overflow: "hidden",
            display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
          }}>

            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 16px", borderBottom: `1px solid ${C.blue50}`, flexShrink: 0,
            }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 260 }}>
                <MdSearch size={14} style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none",
                }}/>
                <input
                  type="text"
                  placeholder="Search position..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", height: 34, paddingLeft: 30, paddingRight: 10,
                    borderRadius: 7, border: `1.5px solid ${C.blue100}`,
                    background: "#f8fbff", fontFamily: "inherit", fontSize: 12,
                    color: C.gray800, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {hasFilter && (
                <button onClick={() => setSearch("")} style={{
                  height: 34, padding: "0 12px", borderRadius: 7,
                  border: "1.5px solid #fca5a5", background: "#fef2f2",
                  color: C.red, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <MdClose size={13}/> Clear
                </button>
              )}

              <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray400 }}>
                {hasFilter
                  ? <><b style={{ color: C.gray800 }}>{filtered.length}</b> of {rawData.length} positions</>
                  : <><b style={{ color: C.gray800 }}>{rawData.length}</b> position{rawData.length !== 1 ? "s" : ""}</>
                }
              </span>
            </div>

            <div style={{
              overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0,
              scrollbarWidth: "thin", scrollbarColor: "#dbeafe transparent",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Icon","Position","Employees","Status", ...(canEdit ? ["Actions"] : [])].map(h => (
                      <th key={h} style={{
                        padding: "9px 14px", textAlign: "left",
                        fontSize: 11, fontWeight: 700, color: C.navy,
                        textTransform: "uppercase", letterSpacing: .5,
                        background: C.blue50, borderBottom: `1.5px solid ${C.blue100}`,
                        position: "sticky", top: 0, zIndex: 10, whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>

                  {loading && Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.blue50}` }}>
                      {[34, 200, 120, 80, 70].map((w, j) => (
                        <td key={j} style={{ padding: "11px 14px" }}>
                          <div style={{
                            height: 13, borderRadius: 6, background: "#f1f5f9",
                            width: w, animation: "pulse 1.5s ease infinite",
                          }}/>
                        </td>
                      ))}
                    </tr>
                  ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 5 : 4} style={{ textAlign: "center", padding: 52 }}>
                        <div style={{ fontSize: 32, marginBottom: 10, opacity: .3 }}>💼</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.gray500, marginBottom: 8 }}>
                          {hasFilter ? "No positions match your search" : "No positions found"}
                        </div>
                        {hasFilter
                          ? <button onClick={() => setSearch("")} style={{
                              fontSize: 12, color: C.navy, background: "none",
                              border: "none", cursor: "pointer",
                              textDecoration: "underline", fontFamily: "inherit",
                            }}>Clear search</button>
                          : canEdit && (
                            <button onClick={() => navigate("/positions/add")} style={{
                              padding: "6px 16px", borderRadius: 7, background: C.navy,
                              color: "#fff", border: "none", fontSize: 12,
                              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                            }}>Add Position</button>
                          )
                        }
                      </td>
                    </tr>
                  )}

                  {!loading && filtered.map((pos, i) => (
                    <PosRow
                      key={pos.PositionID ?? pos.id ?? i}
                      pos={pos}
                      idx={i}
                      canEdit={canEdit}
                      navigate={navigate}
                      onEdit={p => navigate(`/positions/${p.PositionID ?? p.id}/edit`)}
                      onDel={p => setDelTarget(p)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && rawData.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderTop: `1px solid ${C.blue50}`,
                background: "#fafbff", flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, color: C.gray400 }}>
                  Showing <b style={{ color: C.gray800 }}>{filtered.length}</b> of{" "}
                  <b style={{ color: C.gray800 }}>{rawData.length}</b> records
                </span>
                <span style={{ fontSize: 11, color: C.gray400 }}>
                  Last updated: {new Date().toLocaleDateString("vi-VN")}
                </span>
              </div>
            )}
          </div>
        </main>
      </div>

      {delTarget && (
        <DeleteModal
          pos={delTarget}
          onClose={() => setDelTarget(null)}
          onDeleted={() => {
            setDelTarget(null);
            fetchData(true);
            showToast("Position deleted.", "error");
          }}
        />
      )}
    </div>
  );
}