// src/components/Table.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MdEdit, MdDelete } from "react-icons/md";
import { deleteEmployee } from "../services/employeeApi";

const C = {
  navy:    "#1e3a8a",
  blue100: "#dbeafe",
  blue50:  "#eff6ff",
  gray800: "#1e293b",
  gray700: "#334155",
  gray500: "#64748b",
  gray400: "#94a3b8",
  red:     "#dc2626",
};

const GRAD_COLORS = [
  ["#3b82f6","#60a5fa"], ["#22c55e","#4ade80"],
  ["#f59e0b","#fbbf24"], ["#06b6d4","#22d3ee"],
  ["#a855f7","#c084fc"], ["#ef4444","#f87171"],
  ["#14b8a6","#2dd4bf"], ["#ec4899","#f472b6"],
];

const STATUS_STYLE = {
  "Đang làm việc": { bg: "#dcfce7", text: "#16a34a" },
  "Nghỉ phép":     { bg: "#fef3c7", text: "#d97706" },
  "Thử việc":      { bg: "#dbeafe", text: "#1e3a8a" },
  "Thực tập":      { bg: "#f1f5f9", text: "#64748b" },
  "Inactive":      { bg: "#fee2e2", text: "#dc2626" },
};

function initials(name = "") {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/* ─── Confirm Delete Modal ─── */
function ConfirmModal({ emp, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,.2)",
        width: "100%", maxWidth: 360, overflow: "hidden",
      }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#ef4444,#f97316)" }}/>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: "#fef2f2",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <MdDelete size={18} style={{ color: C.red }}/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Remove Employee</div>
              <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>This action cannot be undone</div>
            </div>
          </div>

          <div style={{
            background: "#f8fafc", borderRadius: 10, padding: "10px 14px",
            marginBottom: 12, border: "1px solid #f1f5f9",
          }}>
            <div style={{ fontSize: 10, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>Employee</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{emp?.FullName}</div>
            <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>ID #{emp?.EmployeeID}</div>
          </div>

          <div style={{
            background: "#fffbeb", borderRadius: 10, padding: "9px 12px",
            marginBottom: 20, border: "1px solid #fef3c7",
            display: "flex", gap: 8,
          }}>
            <span style={{ color: "#d97706", flexShrink: 0 }}>⚠</span>
            <p style={{ fontSize: 11, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
              Deletion is <strong>blocked</strong> if this employee has existing salary or dividend records.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 9,
                border: "1.5px solid #e2e8f0", background: "#fff",
                fontSize: 12, fontWeight: 600, color: "#334155",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >Cancel</button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                background: "linear-gradient(135deg,#dc2626,#ef4444)",
                fontSize: 12, fontWeight: 700, color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? .6 : 1, fontFamily: "inherit",
              }}
            >{loading ? "Removing..." : "Delete"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Employee Row — actions hidden, show on hover ─── */
function EmpRow({ emp, colorIdx, onDeleted }) {
  const navigate   = useNavigate();
  const [hov, setHov]           = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const name   = emp.FullName    ?? emp.name          ?? "—";
  const id     = emp.EmployeeID  ?? emp.id             ?? "";
  const dept   = emp.Department  ?? emp.DepartmentName ?? emp.department ?? "—";
  const pos    = emp.Position    ?? emp.PositionName   ?? emp.position   ?? "—";
  const status = emp.Status      ?? emp.status         ?? "—";
  const email  = emp.Email       ?? emp.email          ?? "";

  const [g1, g2] = GRAD_COLORS[colorIdx % GRAD_COLORS.length];
  const sc = STATUS_STYLE[status] || { bg: "#f1f5f9", text: "#64748b" };

  const cell = {
    padding: "9px 12px",
    borderBottom: `1px solid ${C.blue50}`,
    background: hov ? C.blue50 : "#fff",
    verticalAlign: "middle",
    fontSize: 13,
    transition: "background .12s",
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteEmployee(id);
    setDeleting(false);
    setConfirm(false);
    if (res?.error) alert(res.error);
    else onDeleted?.();
  };

  return (
    <>
      <tr
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={() => navigate(`/employees/${id}/edit`)}
        style={{ cursor: "pointer" }}
      >
        {/* ID */}
        <td style={cell}>
          <span style={{
            fontSize: 12, color: "#94a3b8", fontFamily: "monospace",
            background: "#f1f5f9", padding: "2px 7px", borderRadius: 6,
          }}>
            #{String(id).padStart(3, "0")}
          </span>
        </td>

        {/* Name + avatar */}
        <td style={cell}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg,${g1},${g2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff",
            }}>{initials(name)}</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.gray800 }}>{name}</div>
              <div style={{ fontSize: 10, color: C.gray400 }}>{email || `#${String(id).padStart(3,"0")}`}</div>
            </div>
          </div>
        </td>

        {/* Dept */}
        <td style={cell}>
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: C.blue100, color: C.navy, whiteSpace: "nowrap",
          }}>{dept}</span>
        </td>

        {/* Position */}
        <td style={{ ...cell, color: C.gray500 }}>{pos}</td>

        {/* Status */}
        <td style={cell}>
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: sc.bg, color: sc.text, whiteSpace: "nowrap",
          }}>{status}</span>
        </td>

        {/* Actions — hidden, fade in on row hover */}
        <td style={{ ...cell, width: 96 }} onClick={e => e.stopPropagation()}>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            opacity: hov ? 1 : 0,
            transform: hov ? "scale(1)" : "scale(0.8)",
            transition: "opacity .15s, transform .15s",
          }}>
            <button
              title="Edit"
              onClick={() => navigate(`/employees/${id}/edit`)}
              style={{ width:28, height:28, borderRadius:7, border:"none", cursor:"pointer", background:C.blue50, color:C.navy, display:"flex", alignItems:"center", justifyContent:"center" }}
              onMouseEnter={e => e.currentTarget.style.background=C.blue100}
              onMouseLeave={e => e.currentTarget.style.background=C.blue50}
            ><MdEdit size={14}/></button>

            <button
              title="Delete"
              onClick={() => setConfirm(true)}
              style={{ width:28, height:28, borderRadius:7, border:"none", cursor:"pointer", background:"#fef2f2", color:C.red, display:"flex", alignItems:"center", justifyContent:"center" }}
              onMouseEnter={e => e.currentTarget.style.background="#fee2e2"}
              onMouseLeave={e => e.currentTarget.style.background="#fef2f2"}
            ><MdDelete size={14}/></button>
          </div>
        </td>
      </tr>

      {confirm && (
        <ConfirmModal
          emp={emp}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
          loading={deleting}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   Main Table Component
═══════════════════════════════════════════ */
export default function EmployeeTable({
  employees = [],
  deptFilter,    setDeptFilter,
  roleFilter,    setRoleFilter,
  onClearFilters,
  onRefresh,
}) {
  const deptOpts = useMemo(() => [
    ...new Set(employees.map(e => e.Department ?? e.DepartmentName ?? e.department ?? "").filter(Boolean))
  ].sort(), [employees]);

  const posOpts = useMemo(() => [
    ...new Set(employees.map(e => e.Position ?? e.PositionName ?? e.position ?? "").filter(Boolean))
  ].sort(), [employees]);

  const filtered = useMemo(() => employees.filter(e => {
    const dept = e.Department  ?? e.DepartmentName ?? e.department ?? "";
    const pos  = e.Position    ?? e.PositionName   ?? e.position   ?? "";
    return (!deptFilter || dept === deptFilter) && (!roleFilter || pos === roleFilter);
  }), [employees, deptFilter, roleFilter]);

  const hasFilter = deptFilter || roleFilter;

  const sel = {
    padding: "6px 11px", borderRadius: 7,
    border: `1.5px solid ${C.blue100}`, background: "#fff",
    fontFamily: "inherit", fontSize: 12, color: C.gray700,
    cursor: "pointer", outline: "none",
  };

  return (
    <div style={{ background:"#fff", borderRadius:14,
      boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:14 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center",
        justifyContent:"space-between", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:13.5, fontWeight:700, color:C.gray800 }}>
            Employee Overview
          </div>
          <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>
            {hasFilter
              ? <span><b style={{ color: C.navy }}>{filtered.length}</b> of {employees.length} employees shown</span>
              : <span><b style={{ color: C.gray700 }}>{employees.length}</b> employee{employees.length !== 1 ? "s" : ""} total</span>
            }
          </div>
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select value={deptFilter || ""} onChange={e => setDeptFilter(e.target.value)} style={sel}>
            <option value="">All Departments</option>
            {deptOpts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={roleFilter || ""} onChange={e => setRoleFilter(e.target.value)} style={sel}>
            <option value="">All Positions</option>
            {posOpts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {hasFilter && (
            <button
              onClick={() => { setDeptFilter(""); setRoleFilter(""); onClearFilters?.(); }}
              style={{
                padding: "6px 11px", borderRadius: 7,
                border: "1.5px solid #fca5a5", background: "#fef2f2",
                color: C.red, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >✕ Clear</button>
          )}

          <a href="/employees" style={{ fontSize:12, fontWeight:600, color:C.navy, textDecoration:"none" }}>
            View all →
          </a>
        </div>
      </div>

      {/* Table */}
      <div style={{ maxHeight:260, overflowY:"auto", borderRadius:8, border:`1px solid ${C.blue100}` }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              {["ID","Name","Department","Position","Status","Actions"].map(h => (
                <th key={h} style={{
                  fontSize:11, fontWeight:700, color:C.navy,
                  textTransform:"uppercase", letterSpacing:.5,
                  background:C.blue50, borderBottom:`1.5px solid ${C.blue100}`,
                  padding:"8px 12px", textAlign:"left",
                  position:"sticky", top:0, zIndex:1, whiteSpace:"nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:"center", padding:32, fontSize:12, color:C.gray400 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>👥</div>
                No employees loaded
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:"center", padding:24, fontSize:12, color:C.gray400 }}>
                No employees match current filters.{" "}
                <span
                  style={{ color:C.navy, cursor:"pointer", textDecoration:"underline" }}
                  onClick={() => { setDeptFilter(""); setRoleFilter(""); onClearFilters?.(); }}
                >Clear filters</span>
              </td></tr>
            ) : (
              filtered.map((e, i) => (
                <EmpRow key={e.EmployeeID ?? i} emp={e} colorIdx={i} onDeleted={onRefresh}/>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop:8, fontSize:11, color:C.gray400, textAlign:"right" }}>
          {hasFilter
            ? `Showing ${filtered.length} of ${employees.length} employees`
            : `${employees.length} employee${employees.length !== 1 ? "s" : ""} total`
          }
        </div>
      )}
    </div>
  );
}