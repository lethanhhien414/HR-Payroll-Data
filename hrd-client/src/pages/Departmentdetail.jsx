
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdArrowBack, MdBusiness, MdPeople, MdEdit,
  MdSearch, MdClose, MdEmail, MdWork,
} from "react-icons/md";
import { getDepartmentDetail, getDepartmentEmployees } from "../services/departmentApi";

const C = {
  navy:    "#1e3a8a", blue600:"#2563eb", blue500:"#3b82f6",
  blue200: "#bfdbfe", blue100:"#dbeafe", blue50:"#eff6ff",
  gray900: "#0f172a", gray800:"#1e293b", gray700:"#334155",
  gray500: "#64748b", gray400:"#94a3b8",
  green:   "#16a34a", greenLt:"#dcfce7",
  amber:   "#d97706", amberLt:"#fef3c7",
  red:     "#dc2626", redLt:"#fee2e2",
};

const GRAD_COLORS = [
  ["#3b82f6","#60a5fa"], ["#22c55e","#4ade80"],
  ["#f59e0b","#fbbf24"], ["#06b6d4","#22d3ee"],
  ["#a855f7","#c084fc"], ["#ef4444","#f87171"],
  ["#14b8a6","#2dd4bf"], ["#ec4899","#f472b6"],
];

const DEPT_COLORS = [
  ["#1e40af","#3b82f6"], ["#065f46","#10b981"], ["#92400e","#f59e0b"],
  ["#6b21a8","#a855f7"], ["#0e7490","#06b6d4"], ["#9d174d","#ec4899"],
];

const STATUS_STYLE = {
  "Đang làm việc": { bg:"#dcfce7", text:"#16a34a" },
  "Nghỉ phép":     { bg:"#fef3c7", text:"#d97706" },
  "Thử việc":      { bg:"#dbeafe", text:"#1e3a8a" },
  "Thực tập":      { bg:"#f1f5f9", text:"#64748b" },
  "Inactive":      { bg:"#fee2e2", text:"#dc2626" },
};

function initials(name = "") {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0,2).toUpperCase() || "?";
}

function Avatar({ name = "", idx = 0, size = 32 }) {
  const [g1, g2] = GRAD_COLORS[idx % GRAD_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg,${g1},${g2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, color: "#fff",
    }}>
      {initials(name)}
    </div>
  );
}

function DeptAvatar({ name = "", idx = 0, size = 56 }) {
  const [dark, light] = DEPT_COLORS[idx % DEPT_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: 14, flexShrink: 0,
      background: `linear-gradient(135deg,${dark},${light})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color: "#fff",
    }}>
      {initials(name)}
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} style={{ color }}/>
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.gray400, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{value ?? "—"}</div>
      </div>
    </div>
  );
}

export default function DepartmentDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [dept,    setDept]    = useState(null);
  const [emps,    setEmps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [d, e] = await Promise.all([
        getDepartmentDetail(id),
        getDepartmentEmployees(id),
      ]);
      setDept(d);
      setEmps(Array.isArray(e) ? e : []);
      setLoading(false);
    })();
  }, [id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emps;
    return emps.filter(e =>
      (e.FullName     || "").toLowerCase().includes(q) ||
      (e.PositionName || "").toLowerCase().includes(q) ||
      (e.Email        || "").toLowerCase().includes(q)
    );
  }, [emps, search]);

  const deptIdx  = ((Number(id) - 1) % DEPT_COLORS.length);
  const deptName = dept?.DepartmentName || "Department";

  if (loading) return (
    <div style={{ display:"flex", width:"100%", height:"100vh",
      alignItems:"center", justifyContent:"center",
      background:"#f0f6ff", fontFamily:"'Inter',sans-serif",
      flexDirection:"column", gap:12, color:C.gray500 }}>
      <div style={{ width:30, height:30, border:`3px solid ${C.blue100}`,
        borderTopColor:C.navy, borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
      <span style={{ fontSize:13 }}>Loading department...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const cell = {
    padding: "10px 14px", fontSize: 13,
    borderBottom: `1px solid ${C.blue50}`,
    verticalAlign: "middle",
  };

  const active = emps.filter(e => e.Status === "Đang làm việc").length;

  return (
    <div style={{ display:"flex", width:"100%", height:"100vh", overflow:"hidden",
      fontFamily:"'Inter',sans-serif", background:"#f0f6ff" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <Sidebar/>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar/>

        <main style={{ flex:1, overflow:"hidden", padding:"14px 16px",
          display:"flex", flexDirection:"column", gap:12 }}>

          {/* ── Header ── */}
          <div style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={() => navigate("/departments")}
                style={{ width:34, height:34, borderRadius:8, background:"#fff",
                  border:`1.5px solid ${C.blue100}`, display:"flex", alignItems:"center",
                  justifyContent:"center", color:C.navy, cursor:"pointer" }}>
                <MdArrowBack size={17}/>
              </button>
              <DeptAvatar name={deptName} idx={deptIdx} size={38}/>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:C.gray900, letterSpacing:-.3 }}>
                  {deptName}
                </div>
                <div style={{ fontSize:11, color:C.gray400, marginTop:2, fontWeight:500 }}>
                  Department #{String(id).padStart(3,"0")} · Employee Directory
                </div>
              </div>
            </div>

            <button onClick={() => navigate(`/departments/${id}/edit`)}
              style={{ display:"inline-flex", alignItems:"center", gap:5,
                padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                background:C.navy, color:"#fff", border:"none",
                cursor:"pointer", fontFamily:"inherit" }}>
              <MdEdit size={13}/> Edit Department
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, flexShrink:0 }}>
            <StatCard label="Total Employees" value={emps.length}  color="#3b82f6" icon={MdPeople}/>
            <StatCard label="Active"          value={active}        color="#16a34a" icon={MdPeople}/>
            <StatCard label="Positions"
              value={[...new Set(emps.map(e => e.PositionName).filter(Boolean))].length}
              color="#7c3aed" icon={MdWork}/>
          </div>

          <div style={{ background:"#fff", borderRadius:14,
            boxShadow:"0 2px 8px rgba(0,0,0,.06)",
            display:"flex", flexDirection:"column", flex:1, minHeight:0, overflow:"hidden" }}>

            <div style={{ display:"flex", alignItems:"center", gap:10,
              padding:"11px 16px", borderBottom:`1px solid ${C.blue50}`, flexShrink:0 }}>
              <div style={{ position:"relative", flex:1, maxWidth:280 }}>
                <MdSearch size={13} style={{ position:"absolute", left:10, top:"50%",
                  transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }}/>
                <input type="text" placeholder="Search by name, position, email..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%", height:34, paddingLeft:30, paddingRight:10,
                    borderRadius:7, border:`1.5px solid ${C.blue100}`, background:"#f8fbff",
                    fontFamily:"inherit", fontSize:12, color:C.gray800, outline:"none",
                    boxSizing:"border-box" }}/>
              </div>

              {search && (
                <button onClick={() => setSearch("")}
                  style={{ height:34, padding:"0 12px", borderRadius:7,
                    border:"1.5px solid #fca5a5", background:"#fef2f2",
                    color:C.red, fontSize:12, fontWeight:600, cursor:"pointer",
                    fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                  <MdClose size={13}/> Clear
                </button>
              )}

              <span style={{ marginLeft:"auto", fontSize:11, color:C.gray400 }}>
                {search
                  ? <><b style={{ color:C.gray800 }}>{filtered.length}</b> of {emps.length} employees</>
                  : <><b style={{ color:C.gray800 }}>{emps.length}</b> employee{emps.length !== 1 ? "s" : ""}</>
                }
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowY:"auto", flex:1, minHeight:0,
              scrollbarWidth:"thin", scrollbarColor:"#dbeafe transparent" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    {["ID","Employee","Position","Email","Status"].map(h => (
                      <th key={h} style={{
                        fontSize:11, fontWeight:700, color:C.navy,
                        textTransform:"uppercase", letterSpacing:.5,
                        background:C.blue50, borderBottom:`1.5px solid ${C.blue100}`,
                        padding:"9px 14px", textAlign:"left",
                        position:"sticky", top:0, zIndex:10, whiteSpace:"nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>

                  {emps.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign:"center", padding:60 }}>
                        <MdPeople size={42} style={{ color:"#dbeafe", marginBottom:12 }}/>
                        <div style={{ fontSize:14, fontWeight:600, color:C.gray500, marginBottom:6 }}>
                          No employees in this department
                        </div>
                        <div style={{ fontSize:12, color:C.gray400 }}>
                          Assign employees to this department from Employee Management
                        </div>
                      </td>
                    </tr>
                  )}

                  {emps.length > 0 && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign:"center", padding:40,
                        fontSize:12, color:C.gray400 }}>
                        No employees match "<b>{search}</b>"
                        <br/>
                        <span style={{ color:C.navy, cursor:"pointer",
                          textDecoration:"underline", marginTop:6, display:"inline-block" }}
                          onClick={() => setSearch("")}>Clear search</span>
                      </td>
                    </tr>
                  )}

                  {filtered.map((emp, i) => {
                    const sc = STATUS_STYLE[emp.Status] || { bg:"#f1f5f9", text:"#64748b" };
                    return (
                      <EmpRow key={emp.EmployeeID ?? i} emp={emp} idx={i} sc={sc} cell={cell}
                        onClick={() => navigate(`/employees/${emp.EmployeeID}/edit`)}/>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {emps.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"9px 16px", borderTop:`1px solid ${C.blue50}`,
                background:"#fafbff", flexShrink:0 }}>
                <span style={{ fontSize:11, color:C.gray400 }}>
                  Showing <b style={{ color:C.gray800 }}>{filtered.length}</b> of{" "}
                  <b style={{ color:C.gray800 }}>{emps.length}</b> records
                </span>
                <span style={{ fontSize:11, color:C.gray400 }}>
                  {active} active · {emps.length - active} other
                </span>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function EmpRow({ emp, idx, sc, cell, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{ cursor:"pointer", background: hov ? C.blue50 : "#fff", transition:"background .12s" }}>

      <td style={{ ...cell, color:"#94a3b8", fontSize:12 }}>
        <span style={{ fontFamily:"monospace", background:"#f1f5f9",
          padding:"2px 7px", borderRadius:6 }}>
          #{String(emp.EmployeeID).padStart(3,"0")}
        </span>
      </td>

      <td style={cell}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{
            width:30, height:30, borderRadius:"50%", flexShrink:0,
            background:`linear-gradient(135deg,${GRAD_COLORS[idx%GRAD_COLORS.length][0]},${GRAD_COLORS[idx%GRAD_COLORS.length][1]})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:700, color:"#fff",
          }}>
            {initials(emp.FullName)}
          </div>
          <div>
            <div style={{ fontSize:12.5, fontWeight:600, color:C.gray800 }}>{emp.FullName}</div>
          </div>
        </div>
      </td>

      <td style={{ ...cell, color:C.gray500, fontSize:12 }}>{emp.PositionName}</td>

      <td style={cell}>
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:C.gray500 }}>
          <MdEmail size={13} style={{ color:C.gray400, flexShrink:0 }}/>
          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>
            {emp.Email}
          </span>
        </div>
      </td>

      <td style={cell}>
        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
          background:sc.bg, color:sc.text, whiteSpace:"nowrap" }}>
          {emp.Status}
        </span>
      </td>
    </tr>
  );
}