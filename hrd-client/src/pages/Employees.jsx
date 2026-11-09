
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdAdd, MdSearch, MdEdit, MdDelete,
  MdDownload, MdRefresh, MdClose, MdPeople,
} from "react-icons/md";
import { getEmployees, deleteEmployee } from "../services/employeeApi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const C = {
  navy:    "#1e3a8a",
  blue100: "#dbeafe",
  blue50:  "#eff6ff",
  gray900: "#0f172a",
  gray800: "#1e293b",
  gray500: "#64748b",
  gray400: "#94a3b8",
  red:     "#dc2626",
};

const AVATAR_COLORS = [
  ["#1e40af","#3b82f6"], ["#065f46","#10b981"], ["#92400e","#f59e0b"],
  ["#6b21a8","#a855f7"], ["#0e7490","#06b6d4"], ["#9d174d","#ec4899"],
  ["#991b1b","#ef4444"], ["#064e3b","#34d399"],
];

const STATUS_STYLE = {
  "Đang làm việc": { bg:"#dcfce7", text:"#16a34a" },
  "Nghỉ phép":     { bg:"#fef3c7", text:"#d97706" },
  "Thử việc":      { bg:"#dbeafe", text:"#1e3a8a" },
  "Thực tập":      { bg:"#f1f5f9", text:"#64748b" },
};

function EmpRow({ id, name, dept, pos, stat, email, sc, initials, dark, light, onEdit, onDelete, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onEdit}
      style={{
        borderBottom:"1px solid #eff6ff",
        background: hov ? "#f8fbff" : "#fff",
        cursor:"pointer", transition:"background .12s",
        animation:`fadeIn 0.18s ease ${delay}ms both`,
      }}
    >
      <td style={{ padding:"10px 14px", verticalAlign:"middle" }}>
        <span style={{ fontSize:12, color:C.gray400, fontFamily:"monospace",
          background:"#f1f5f9", padding:"2px 7px", borderRadius:6 }}>
          #{String(id).padStart(3,"0")}
        </span>
      </td>

      <td style={{ padding:"10px 14px", verticalAlign:"middle" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{
            width:30, height:30, borderRadius:"50%", flexShrink:0,
            background:`linear-gradient(135deg,${dark},${light})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:700, color:"#fff",
          }}>{initials}</div>
          <div>
            <div style={{ fontSize:12.5, fontWeight:600, color:C.gray800 }}>{name}</div>
            {email && <div style={{ fontSize:10, color:C.gray400 }}>{email}</div>}
          </div>
        </div>
      </td>

      <td style={{ padding:"10px 14px", verticalAlign:"middle" }}>
        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
          background:C.blue100, color:C.navy, whiteSpace:"nowrap" }}>{dept}</span>
      </td>

      <td style={{ padding:"10px 14px", verticalAlign:"middle",
        fontSize:13, color:C.gray500 }}>{pos}</td>

      <td style={{ padding:"10px 14px", verticalAlign:"middle" }}>
        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
          background:sc.bg, color:sc.text, whiteSpace:"nowrap" }}>{stat || "—"}</span>
      </td>

      <td style={{ padding:"10px 14px", verticalAlign:"middle" }}
          onClick={e => e.stopPropagation()}>
        <div style={{
          display:"flex", gap:4,
          opacity: hov ? 1 : 0,
          transform: hov ? "scale(1)" : "scale(0.85)",
          transition:"opacity .15s, transform .15s",
        }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ width:28, height:28, borderRadius:7, border:"none",
              cursor:"pointer", background:C.blue50, color:C.navy,
              display:"flex", alignItems:"center", justifyContent:"center" }}
            onMouseEnter={e => e.currentTarget.style.background = C.blue100}
            onMouseLeave={e => e.currentTarget.style.background = C.blue50}>
            <MdEdit size={14}/>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ width:28, height:28, borderRadius:7, border:"none",
              cursor:"pointer", background:"#fef2f2", color:C.red,
              display:"flex", alignItems:"center", justifyContent:"center" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
            onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
            <MdDelete size={14}/>
          </button>
        </div>
      </td>
    </tr>
  );
}

function ConfirmModal({ emp, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:50,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      background:"rgba(15,23,42,0.55)", backdropFilter:"blur(4px)",
    }}>
      <div style={{ background:"#fff", borderRadius:16,
        boxShadow:"0 20px 60px rgba(0,0,0,.2)",
        width:"100%", maxWidth:380, overflow:"hidden" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,#ef4444,#f97316)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.gray900, marginBottom:6 }}>
            Xóa nhân viên
          </div>
          <div style={{ fontSize:12, color:C.gray400, marginBottom:16 }}>
            Hành động này không thể hoàn tác
          </div>

          <div style={{ background:"#f8fafc", borderRadius:10,
            padding:"12px 14px", marginBottom:14, border:"1px solid #f1f5f9" }}>
            <div style={{ fontSize:10, color:C.gray400,
              textTransform:"uppercase", letterSpacing:1, fontWeight:700, marginBottom:4 }}>
              Nhân viên
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:C.gray900 }}>{emp?.FullName}</div>
            <div style={{ fontSize:12, color:C.gray400, marginTop:2 }}>ID #{emp?.EmployeeID}</div>
          </div>

          <div style={{ background:"#fffbeb", borderRadius:10,
            padding:"10px 14px", marginBottom:22, border:"1px solid #fef3c7",
            display:"flex", gap:8 }}>
            <span style={{ color:"#d97706", flexShrink:0 }}>⚠</span>
            <p style={{ fontSize:12, color:"#92400e", margin:0, lineHeight:1.6 }}>
              Xóa sẽ bị <strong>chặn</strong> nếu nhân viên còn dữ liệu lương hoặc chấm công.
            </p>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel} style={{
              flex:1, padding:"10px 0", borderRadius:10,
              border:"1.5px solid #e2e8f0", background:"#fff",
              fontSize:13, fontWeight:600, color:C.gray800,
              cursor:"pointer", fontFamily:"inherit" }}>Hủy</button>
            <button onClick={onConfirm} disabled={loading} style={{
              flex:1, padding:"10px 0", borderRadius:10, border:"none",
              background:"linear-gradient(135deg,#dc2626,#ef4444)",
              fontSize:13, fontWeight:700, color:"#fff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? .6 : 1, fontFamily:"inherit" }}>
              {loading ? "Đang xóa..." : "Xóa nhân viên"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Toast ── */
function Toast({ msg, type = "success" }) {
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:100,
      display:"flex", alignItems:"center", gap:12,
      padding:"12px 18px", borderRadius:12,
      background:"#0f172a", minWidth:280,
      borderLeft:`4px solid ${type==="success" ? "#22c55e" : "#ef4444"}`,
      boxShadow:"0 8px 30px rgba(0,0,0,.25)",
      animation:"slideUp 0.25s ease",
    }}>
      <span style={{ fontSize:16 }}>{type==="success" ? "✓" : "✕"}</span>
      <span style={{ fontSize:13, color:"#fff", fontWeight:500 }}>{msg}</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function Employees() {
  const navigate = useNavigate();

  const [rawData,    setRawData]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [selDept,    setSelDept]    = useState("");
  const [selStatus,  setSelStatus]  = useState("");
  const [delEmp,     setDelEmp]     = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [toast,      setToast]      = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployees({ name: search || undefined });
      setRawData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setRawData([]);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const depts = useMemo(() => [
    ...new Set(rawData.map(e => e.Department||e.DepartmentName||e.department||"").filter(Boolean)),
  ].sort(), [rawData]);

  const employees = useMemo(() =>
    rawData.filter(e => {
      const dept   = e.Department||e.DepartmentName||e.department||"";
      const status = e.Status||e.status||"";
      return (!selDept||dept===selDept) && (!selStatus||status===selStatus);
    }),
  [rawData, selDept, selStatus]);

  const stats = useMemo(() => ({
    total:     rawData.length,
    active:    rawData.filter(e=>(e.Status||e.status)==="Đang làm việc").length,
    onLeave:   rawData.filter(e=>(e.Status||e.status)==="Nghỉ phép").length,
    probation: rawData.filter(e=>(e.Status||e.status)==="Thử việc").length,
  }), [rawData]);

  const handleDelete = async () => {
    if (!delEmp) return;
    setDelLoading(true);
    const res = await deleteEmployee(delEmp.EmployeeID ?? delEmp.id);
    setDelLoading(false);
    setDelEmp(null);
    if (res?.error) showToast(res.error, "error");
    else { showToast("Employee removed successfully", "success"); fetchData(); }
  };

  const handleExportExcel = () => {

  const data = employees.map(emp => ({
    ID: emp.EmployeeID ?? emp.id,
    FullName: emp.FullName ?? emp.name,
    Department: emp.Department ?? emp.DepartmentName,
    Position: emp.Position ?? emp.PositionName,
    Status: emp.Status ?? emp.status,
    Email: emp.Email ?? emp.email,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook, worksheet, "Employees"
  );

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob(
    [excelBuffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    }
  );

  saveAs(blob, "employees_report.xlsx");
};
  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const clearFilters = () => { setSearch(""); setSelDept(""); setSelStatus(""); };
  const hasFilter    = search || selDept || selStatus;

  return (
    <div style={{ display:"flex", width:"100%", height:"100vh",
      overflow:"hidden", fontFamily:"'Inter',sans-serif", background:"#f0f6ff" }}>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      <Sidebar/>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar/>

        <main style={{ flex:1, overflow:"hidden", padding:"14px 16px",
          display:"flex", flexDirection:"column", gap:10 }}>

          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:C.navy,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <MdPeople size={17} color="#fff"/>
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:C.gray900, letterSpacing:-.3 }}>
                  Employee Management
                </div>
              </div>
              <div style={{ fontSize:11, color:C.gray400, marginLeft:42, fontWeight:500 }}>
                Manage company employees and HR records
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={fetchData} style={{
                display:"inline-flex", alignItems:"center", gap:5,
                padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                background:"#fff", color:C.navy, border:`1.5px solid ${C.blue100}`,
                cursor:"pointer", fontFamily:"inherit" }}>
                <MdRefresh size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/> Refresh
              </button>
              <button onClick={handleExportExcel} style={{
                  display:"inline-flex",
                  alignItems:"center",
                  gap:5,
                  padding:"6px 14px",
                  borderRadius:7,
                  fontSize:12,
                  fontWeight:600,
                  background:"#fff",
                  color:C.navy,
                  border:`1.5px solid ${C.blue100}`,
                  cursor:"pointer",
                  fontFamily:"inherit"
                }}
              >
  <MdDownload size={14}/>
  Export
</button>
              <button onClick={() => navigate("/employees/add")} style={{
                display:"inline-flex", alignItems:"center", gap:5,
                padding:"6px 16px", borderRadius:7, fontSize:12, fontWeight:700,
                background:C.navy, color:"#fff", border:"none",
                cursor:"pointer", fontFamily:"inherit" }}>
                <MdAdd size={15}/> Add Employee
              </button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {[
              { label:"Total Employees", sub:"All registered staff",    value:stats.total,     badge:`${stats.total} staff`,  badgeType:"up", c1:"#3b82f6", c2:"#93c5fd", icon:"👥" },
              { label:"Active",          sub:"Currently working",       value:stats.active,    badge:`${stats.active} active`,badgeType:"up", c1:"#16a34a", c2:"#4ade80", icon:"✅" },
              { label:"On Leave",        sub:"Away from office",        value:stats.onLeave,   badge:stats.onLeave>0?"Away":"None", badgeType:stats.onLeave>0?"dn":"nt", c1:"#d97706", c2:"#fbbf24", icon:"🏖" },
              { label:"Probation",       sub:"Trial & intern period",   value:stats.probation, badge:stats.probation>0?"In trial":"None", badgeType:"nt", c1:"#7c3aed", c2:"#a78bfa", icon:"🔵" },
            ].map(s => {
              const bc = { up:{bg:"#dcfce7",text:"#16a34a"}, dn:{bg:"#fee2e2",text:"#dc2626"}, nt:{bg:"#dbeafe",text:"#1e3a8a"} }[s.badgeType];
              return (
                <div key={s.label} style={{
                  background:"#fff", borderRadius:14, padding:"14px 18px",
                  position:"relative", overflow:"hidden",
                  boxShadow:"0 2px 8px rgba(0,0,0,.06)",
                }}>
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3,
                    background:`linear-gradient(90deg,${s.c1},${s.c2})`,
                    borderRadius:"0 0 14px 14px" }}/>

                  <span style={{ position:"absolute", top:12, right:12,
                    fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20,
                    background:bc.bg, color:bc.text }}>
                    {s.badge}
                  </span>

                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <div style={{ width:30, height:30, borderRadius:8,
                      background:`${s.c1}18`, display:"flex",
                      alignItems:"center", justifyContent:"center", fontSize:15 }}>
                      {s.icon}
                    </div>
                    <div style={{ fontSize:12, color:C.gray500, fontWeight:500 }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize:22, fontWeight:800, color:C.navy,
                    lineHeight:1, letterSpacing:-.5 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:C.gray400, marginTop:5 }}>{s.sub}</div>
                </div>
              );
            })}
          </div>

          <div style={{ background:"#fff", borderRadius:14,
            boxShadow:"0 2px 8px rgba(0,0,0,.06)", overflow:"hidden",
            display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>

            <div style={{ display:"flex", alignItems:"center", gap:10,
              padding:"11px 16px", borderBottom:`1px solid ${C.blue50}`,
              flexWrap:"wrap", flexShrink:0 }}>

              <div style={{ position:"relative", flex:1, minWidth:200, maxWidth:260 }}>
                <MdSearch size={14} style={{ position:"absolute", left:10, top:"50%",
                  transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }}/>
                <input type="text" placeholder="Search by name..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%", height:34, paddingLeft:30, paddingRight:10,
                    borderRadius:7, border:`1.5px solid ${C.blue100}`,
                    background:"#f8fbff", fontFamily:"inherit", fontSize:12,
                    color:"#334155", outline:"none", boxSizing:"border-box" }}/>
              </div>

              <select value={selDept} onChange={e => setSelDept(e.target.value)}
                style={{ height:34, padding:"0 10px", borderRadius:7,
                  border:`1.5px solid ${C.blue100}`, background:"#fff",
                  fontFamily:"inherit", fontSize:12, color:"#334155",
                  cursor:"pointer", outline:"none", minWidth:150 }}>
                <option value="">All Departments</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select value={selStatus} onChange={e => setSelStatus(e.target.value)}
                style={{ height:34, padding:"0 10px", borderRadius:7,
                  border:`1.5px solid ${C.blue100}`, background:"#fff",
                  fontFamily:"inherit", fontSize:12, color:"#334155",
                  cursor:"pointer", outline:"none" }}>
                <option value="">All Status</option>
                <option value="Đang làm việc">Đang làm việc</option>
                <option value="Nghỉ phép">Nghỉ phép</option>
                <option value="Thử việc">Thử việc</option>
                <option value="Thực tập">Thực tập</option>
              </select>

              {hasFilter && (
                <button onClick={clearFilters} style={{
                  height:34, padding:"0 12px", borderRadius:7,
                  border:"1.5px solid #fca5a5", background:"#fef2f2",
                  color:C.red, fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:5 }}>
                  <MdClose size={13}/> Clear
                </button>
              )}

              <span style={{ marginLeft:"auto", fontSize:11, color:C.gray400 }}>
                {hasFilter
                  ? <><b style={{ color:"#334155" }}>{employees.length}</b> of {rawData.length} employees</>
                  : <><b style={{ color:"#334155" }}>{rawData.length}</b> employee{rawData.length!==1?"s":""}</>
                }
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX:"auto", overflowY:"auto", flex:1, minHeight:0,
              scrollbarWidth:"thin", scrollbarColor:"#dbeafe transparent" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    {["ID","Employee","Department","Position","Status","Actions"].map(h => (
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

                  {loading && Array.from({length:8}).map((_,i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #eff6ff" }}>
                      {[50,200,140,110,90,80].map((w,j) => (
                        <td key={j} style={{ padding:"11px 14px" }}>
                          <div style={{ height:13, borderRadius:6, background:"#f1f5f9",
                            width:w, animation:"pulse 1.5s ease infinite" }}/>
                        </td>
                      ))}
                    </tr>
                  ))}

                  {!loading && employees.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign:"center", padding:52 }}>
                      <div style={{ fontSize:32, marginBottom:10, opacity:.3 }}>👥</div>
                      <div style={{ fontWeight:600, color:"#64748b", marginBottom:6, fontSize:13 }}>
                        {hasFilter ? "No employees match your filters" : "No employees found"}
                      </div>
                      {hasFilter
                        ? <span style={{ color:C.navy, cursor:"pointer",
                            textDecoration:"underline", fontSize:12 }}
                            onClick={clearFilters}>Clear filters</span>
                        : <button onClick={() => navigate("/employees/add")}
                            style={{ marginTop:8, padding:"6px 16px", borderRadius:7,
                              background:C.navy, color:"#fff", border:"none",
                              fontSize:12, fontWeight:600, cursor:"pointer",
                              fontFamily:"inherit" }}>Add Employee</button>
                      }
                    </td></tr>
                  )}

                  {!loading && employees.map((emp, i) => {
                    const id       = emp.EmployeeID ?? emp.id;
                    const name     = emp.FullName   ?? emp.name ?? "";
                    const dept     = emp.Department ?? emp.DepartmentName ?? emp.department ?? "—";
                    const pos      = emp.Position   ?? emp.PositionName   ?? emp.position   ?? "—";
                    const stat     = emp.Status     ?? emp.status ?? "";
                    const email    = emp.Email      ?? emp.email ?? "";
                    const [dk,lt]  = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    const initials = (name||"?").split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase();
                    const sc       = STATUS_STYLE[stat] || { bg:"#f1f5f9", text:"#64748b" };
                    return (
                      <EmpRow key={id ?? i}
                        id={id} name={name} dept={dept} pos={pos}
                        stat={stat} email={email} sc={sc}
                        initials={initials} dark={dk} light={lt}
                        onEdit={() => navigate(`/employees/${id}/edit`)}
                        onDelete={() => setDelEmp(emp)}
                        delay={Math.min(i*25,200)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {!loading && rawData.length > 0 && (
              <div style={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", padding:"10px 16px",
                borderTop:`1px solid ${C.blue50}`, background:"#fafbff", flexShrink:0 }}>
                <span style={{ fontSize:11, color:C.gray400 }}>
                  Showing <b style={{ color:"#334155" }}>{employees.length}</b> of{" "}
                  <b style={{ color:"#334155" }}>{rawData.length}</b> records
                </span>
                <button style={{ width:30, height:30, borderRadius:7, background:C.navy,
                  color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  1
                </button>
              </div>
            )}
          </div>

        </main>
      </div>

      {delEmp && (
        <ConfirmModal emp={delEmp} onConfirm={handleDelete}
          onCancel={() => setDelEmp(null)} loading={delLoading}/>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}