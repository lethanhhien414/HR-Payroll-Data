
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdBusiness, MdAdd, MdEdit, MdDelete,
  MdSearch, MdRefresh, MdClose, MdCheckCircle, MdWarning,
} from "react-icons/md";
import { BsDownload } from "react-icons/bs";

import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  getDepartments, createDepartment,
  updateDepartment, deleteDepartment,
} from "../services/departmentApi";

const C = {
  navy:    "#1e3a8a", blue600:"#2563eb", blue500:"#3b82f6",
  blue200: "#bfdbfe", blue100:"#dbeafe", blue50:"#eff6ff",
  gray900: "#0f172a", gray800:"#1e293b", gray700:"#334155",
  gray500: "#64748b", gray400:"#94a3b8", gray300:"#cbd5e1",
  green:   "#16a34a", greenLt:"#dcfce7",
  amber:   "#d97706", amberLt:"#fef3c7",
  red:     "#dc2626", redLt:"#fee2e2",
  cyan:    "#0891b2", cyanLt:"#cffafe",
};

const AVATAR_COLORS = [
  ["#1e40af","#3b82f6"], ["#065f46","#10b981"], ["#92400e","#f59e0b"],
  ["#6b21a8","#a855f7"], ["#0e7490","#06b6d4"], ["#9d174d","#ec4899"],
  ["#991b1b","#ef4444"], ["#064e3b","#34d399"],
];

const getToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token") || "";

const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text }; }
};

function DeptAvatar({ name = "", idx = 0 }) {
  const initials = (name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
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
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 3, background: `linear-gradient(90deg,${color1},${color2})`,
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
      <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, letterSpacing: -.5 }}>{value ?? "—"}</div>
      <div style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function DeptRow({ dept, idx, canEdit, onEdit, onDel, navigate }) {
  const [hov, setHov] = useState(false);
  const id       = dept.DepartmentID ?? dept.id;
  const name     = dept.DepartmentName ?? dept.name ?? "—";
  const empCount = dept.employee_count ?? dept.employeeCount ?? 0;

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => canEdit && onEdit(dept)}
      style={{
        borderBottom: `1px solid ${C.blue50}`,
        background: hov ? "#f8fbff" : "#fff",
        cursor: canEdit ? "pointer" : "default",
        transition: "background .12s",
      }}
    >
      <td style={{ padding: "10px 14px" }}>
        <DeptAvatar name={name} idx={idx}/>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gray800 }}>{name}</div>
        <div style={{ fontSize: 10, color: C.gray400, fontFamily: "monospace", marginTop: 2 }}>
          #{String(id).padStart(3, "0")}
        </div>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: empCount > 0 ? C.blue100 : "#f1f5f9",
          color:      empCount > 0 ? C.navy    : C.gray400,
          display: "inline-block", whiteSpace: "nowrap",
        }}>
          {empCount} {empCount === 1 ? "employee" : "employees"}
        </span>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: C.greenLt, color: C.green, display: "inline-block",
        }}>
          Active
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
            <button onClick={e => { e.stopPropagation(); navigate(`/departments/${id}/edit`);}}
              style={{ width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer", background: C.blue50, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = C.blue100}
              onMouseLeave={e => e.currentTarget.style.background = C.blue50}
            ><MdEdit size={13}/></button>
            <button
              onClick={e => { e.stopPropagation(); onDel(dept); }}
              style={{ width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer", background: "#fef2f2", color: C.red, display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
              onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}
            ><MdDelete size={13}/></button>
          </div>
        </td>
      )}
    </tr>
  );
}

function DeptModal({ mode, initial, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [name,   setName]   = useState(initial?.DepartmentName ?? initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const handleSave = async () => {
    setErr("");
    if (!name.trim()) return setErr("Department name is required.");
    setSaving(true);
    const body = { DepartmentName: name.trim() };
    let ok, resData;
    if (isEdit) {
      const id = initial.DepartmentID ?? initial.id;
      const r  = await fetch(`http://localhost:5000/api/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      resData = await safeJson(r); ok = r.ok;
    } else {
      const r = await fetch(`http://localhost:5000/api/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      resData = await safeJson(r); ok = r.ok;
    }
    setSaving(false);
    if (!ok) return setErr(resData?.error || "Something went wrong");
    onSaved();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", width: 380, boxShadow: "0 12px 40px rgba(0,0,0,.18)" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${C.navy},${C.blue500})` }}/>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>
              {isEdit ? "Edit Department" : "Add Department"}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <MdClose size={18} color={C.gray400}/>
            </button>
          </div>

          {err && (
            <div style={{ background: C.redLt, border: "1px solid #fca5a5", borderRadius: 7, padding: "7px 12px", fontSize: 11, color: C.red, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
              <MdWarning size={13}/> {err}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.gray500, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Department Name
            </label>
            <input
              type="text" value={name} autoFocus
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="e.g. Phòng Kỹ thuật"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, fontSize: 12, border: `1.5px solid ${C.blue200}`, outline: "none", fontFamily: "inherit", color: C.gray800, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 12, fontWeight: 600, border: `1.5px solid ${C.blue200}`, background: "#fff", color: C.navy, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 12, fontWeight: 700, background: C.navy, color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1, fontFamily: "inherit" }}>
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ dept, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const name = dept?.DepartmentName ?? dept?.name ?? "";
  const id   = dept?.DepartmentID   ?? dept?.id   ?? "";

  const handle = async () => {
    setLoading(true); setErr("");
    const r = await fetch(`http://localhost:5000/api/departments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const res = await safeJson(r);
    setLoading(false);
    if (!r.ok) return setErr(res?.error || `HTTP ${r.status}`);
    onDeleted();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", width: 380, boxShadow: "0 12px 40px rgba(0,0,0,.18)" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#dc2626,#f97316)" }}/>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.redLt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MdDelete size={18} color={C.red}/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.gray900 }}>Delete Department?</div>
              <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>This action cannot be undone</div>
            </div>
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 12, border: `1px solid ${C.blue50}` }}>
            <div style={{ fontSize: 10, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>Department</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gray800 }}>{name}</div>
            <div style={{ fontSize: 10, color: C.gray400, marginTop: 2 }}>ID #{String(id).padStart(3, "0")}</div>
          </div>

          <div style={{ background: "#fffbeb", borderRadius: 10, padding: "10px 14px", marginBottom: err ? 12 : 20, border: "1px solid #fef3c7", display: "flex", gap: 8 }}>
            <span style={{ color: C.amber, flexShrink: 0 }}>⚠</span>
            <p style={{ fontSize: 12, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
              Deletion is <strong>blocked</strong> if employees are assigned to this department.
            </p>
          </div>

          {err && (
            <div style={{ background: C.redLt, border: "1px solid #fca5a5", borderRadius: 7, padding: "7px 12px", fontSize: 11, color: C.red, marginBottom: 16, display: "flex", gap: 6, alignItems: "center" }}>
              <MdWarning size={13}/> {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1.5px solid ${C.blue100}`, background: "#fff", color: C.navy, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handle} disabled={loading} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .7 : 1, fontFamily: "inherit" }}>
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Departments() {
  const navigate = useNavigate();

  const [rawData,   setRawData]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [modal,     setModal]     = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [toast,     setToast]     = useState(null);

  useEffect(() => {
    const role = sessionStorage.getItem("role") || localStorage.getItem("role");
    if (!role) { navigate("/"); return; }
    fetchData();
  }, []);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const data = await getDepartments();
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
      ? rawData.filter(d => (d.DepartmentName ?? d.name ?? "").toLowerCase().includes(q))
      : rawData;
  }, [search, rawData]);

  const totalEmp = rawData.reduce((s, d) => s + (d.employee_count ?? 0), 0);
  const staffed  = rawData.filter(d => (d.employee_count ?? 0) > 0).length;

  const role    = sessionStorage.getItem("role") || localStorage.getItem("role");
  const canEdit = ["admin", "hr_manager"].includes(role?.toLowerCase());
  const hasFilter = !!search;

  const exportCSV = () => {
    const hdr  = "DepartmentID,DepartmentName,EmployeeCount";
    const rows = filtered.map(d =>
      `${d.DepartmentID ?? d.id},"${d.DepartmentName ?? d.name ?? ""}",${d.employee_count ?? 0}`
    );
    const blob = new Blob([[hdr, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "departments.csv"; a.click();
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden", fontFamily: "'Inter',sans-serif", background: "#f0f6ff" }}>
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

        {toast && (
          <div style={{ position: "fixed", top: 16, right: 16, zIndex: 2000, background: toast.type === "success" ? C.green : C.red, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", boxShadow: "0 4px 16px rgba(0,0,0,.2)", animation: "slideIn .2s ease" }}>
            {toast.type === "success" ? <MdCheckCircle size={15}/> : <MdWarning size={15}/>}
            {toast.msg}
          </div>
        )}

        <main style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MdBusiness size={17} color="#fff"/>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.gray900, letterSpacing: -.3 }}>
                  Department Management
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.gray400, marginLeft: 42, fontWeight: 500 }}>
                Manage company departments and organizational structure
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={exportCSV} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "#fff", color: C.navy, border: `1.5px solid ${C.blue100}`, cursor: "pointer", fontFamily: "inherit" }}>
                <BsDownload size={12}/> Export
              </button>
              <button onClick={() => fetchData(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "#fff", color: C.navy, border: `1.5px solid ${C.blue100}`, cursor: "pointer", fontFamily: "inherit" }}>
                <MdRefresh size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/> Refresh
              </button>
              {canEdit && (
                <button onClick={() => navigate("/departments/add")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: C.navy, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <MdAdd size={13}/> Add Department
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            <KpiCard label="Total Departments" sub="All registered"    value={rawData.length} color1="#3b82f6" color2="#93c5fd" icon={MdBusiness}/>
            <KpiCard label="Total Employees"   sub="Across all depts" value={totalEmp}        color1="#16a34a" color2="#4ade80" icon={MdCheckCircle}/>
            <KpiCard label="Active Depts"      sub="Have ≥1 employee" value={staffed}         color1="#7c3aed" color2="#a78bfa" icon={MdBusiness}/>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,.06)", overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${C.blue50}`, flexShrink: 0 }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 260 }}>
                <MdSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }}/>
                <input
                  type="text" placeholder="Search department..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", height: 34, paddingLeft: 30, paddingRight: 10, borderRadius: 7, border: `1.5px solid ${C.blue100}`, background: "#f8fbff", fontFamily: "inherit", fontSize: 12, color: C.gray800, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {hasFilter && (
                <button onClick={() => setSearch("")} style={{ height: 34, padding: "0 12px", borderRadius: 7, border: "1.5px solid #fca5a5", background: "#fef2f2", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  <MdClose size={13}/> Clear
                </button>
              )}

              <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray400 }}>
                {hasFilter
                  ? <><b style={{ color: C.gray800 }}>{filtered.length}</b> of {rawData.length} departments</>
                  : <><b style={{ color: C.gray800 }}>{rawData.length}</b> department{rawData.length !== 1 ? "s" : ""}</>
                }
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0, scrollbarWidth: "thin", scrollbarColor: "#dbeafe transparent" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Icon", "Department", "Employees", "Status", ...(canEdit ? ["Actions"] : [])].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: .5, background: C.blue50, borderBottom: `1.5px solid ${C.blue100}`, position: "sticky", top: 0, zIndex: 10, whiteSpace: "nowrap" }}>
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
                          <div style={{ height: 13, borderRadius: 6, background: "#f1f5f9", width: w, animation: "pulse 1.5s ease infinite" }}/>
                        </td>
                      ))}
                    </tr>
                  ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 5 : 4} style={{ textAlign: "center", padding: 52 }}>
                        <div style={{ fontSize: 32, marginBottom: 10, opacity: .3 }}>🏢</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.gray500, marginBottom: 8 }}>
                          {hasFilter ? "No departments match your search" : "No departments found"}
                        </div>
                        {hasFilter
                          ? <button onClick={() => setSearch("")} style={{ fontSize: 12, color: C.navy, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>Clear search</button>
                          : canEdit && <button onClick={() => navigate("/departments/add")} style={{ padding: "6px 16px", borderRadius: 7, background: C.navy, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add Department</button>
                        }
                      </td>
                    </tr>
                  )}

                  {!loading && filtered.map((dept, i) => (
                    <DeptRow
                      key={dept.DepartmentID ?? dept.id ?? i}
                      dept={dept}
                      idx={i}
                      canEdit={canEdit}
                      navigate={navigate}
                      onEdit={d => navigate(`/departments/${d.DepartmentID ?? d.id}`)}
                      onDel={d => setDelTarget(d)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {!loading && rawData.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: `1px solid ${C.blue50}`, background: "#fafbff", flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: C.gray400 }}>
                  Showing <b style={{ color: C.gray800 }}>{filtered.length}</b> of <b style={{ color: C.gray800 }}>{rawData.length}</b> records
                </span>
                <span style={{ fontSize: 11, color: C.gray400 }}>
                  Last updated: {new Date().toLocaleDateString("vi-VN")}
                </span>
              </div>
            )}
          </div>

        </main>
      </div>

      {modal?.mode === "add" && (
        <DeptModal mode="add" onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchData(true); showToast("Department added successfully!"); }}/>
      )}
      {modal?.mode === "edit" && (
        <DeptModal mode="edit" initial={modal.dept} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchData(true); showToast("Department updated successfully!"); }}/>
      )}
      {delTarget && (
        <DeleteModal dept={delTarget} onClose={() => setDelTarget(null)}
          onDeleted={() => { setDelTarget(null); fetchData(true); showToast("Department deleted.", "error"); }}/>
      )}
    </div>
  );
}