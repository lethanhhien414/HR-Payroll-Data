
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Chart, registerables } from "chart.js";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdPayments, MdRefresh, MdCalculate,
  MdHistory, MdClose, MdSearch, MdVisibility, MdDownload, MdEdit,
} from "react-icons/md";
import { getPayroll, calculatePayroll, getPayrollHistory, updatePayroll } from "../services/payrollApi";
import { getSalaryTrend } from "../services/reportApi";
import { getDepartments } from "../services/departmentApi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

Chart.register(...registerables);

const fmtVND = v => {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toLocaleString("vi-VN") + " ₫";
};

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function safeLabel(str = "") {
  const s  = String(str).slice(0, 7);
  const [y, m] = s.split("-");
  const mi = parseInt(m, 10);
  if (!y || isNaN(mi) || mi < 1 || mi > 12) return s || "—";
  return `${MON[mi - 1]} ${String(y).slice(2)}`;
}

const fmtMonth = s => {
  if (!s) return "—";
  const [y, m] = String(s).slice(0, 7).split("-");
  return m ? `${m}/${y}` : s;
};

const NAVY = "#1e3a8a";
const CYAN = "#06b6d4";

/* ─── Salary Trend Chart ─── */
function SalaryTrendChart({ data = [], mode = "total" }) {
  const ref  = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    inst.current?.destroy();
    if (!data || data.length === 0) return;

    const labels = data.map(d => safeLabel(d.month || d.SalaryMonth || ""));
    const ctx    = ref.current.getContext("2d");
    const grad   = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, "rgba(30,58,138,0.15)");
    grad.addColorStop(1, "rgba(30,58,138,0)");

    if (mode === "total") {
      inst.current = new Chart(ref.current, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Total Payroll",
            data: data.map(d => Number(d.total_salary || 0)),
            borderColor: NAVY, borderWidth: 2.5,
            backgroundColor: grad, fill: true, tension: 0.4,
            pointRadius: 4, pointBackgroundColor: NAVY,
            pointBorderColor: "#fff", pointBorderWidth: 2,
          }],
        },
        options: chartOpts("Total Payroll (VND)"),
      });
    } else {
      inst.current = new Chart(ref.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Net Salary", data: data.map(d => Number(d.NetSalary || 0)),
              borderColor: NAVY, borderWidth: 2,
              backgroundColor: grad, fill: true, tension: 0.4,
              pointRadius: 3, pointBackgroundColor: NAVY,
              pointBorderColor: "#fff", pointBorderWidth: 1.5,
            },
            {
              label: "Base Salary", data: data.map(d => Number(d.BaseSalary || 0)),
              borderColor: CYAN, borderWidth: 1.5,
              backgroundColor: "transparent", fill: false, tension: 0.4,
              pointRadius: 2, pointBackgroundColor: CYAN,
              borderDash: [4, 3],
            },
          ],
        },
        options: chartOpts("Salary (VND)"),
      });
    }
    return () => inst.current?.destroy();
  }, [data, mode]);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 8,
        color: "#94a3b8", fontSize: 12 }}>
        <MdPayments size={28} style={{ color: "#dbeafe" }}/>
        {mode === "total" ? "No payroll data" : "Click 👁 on any row to view trend"}
      </div>
    );
  }
  return <canvas ref={ref} style={{ width: "100%", height: "100%" }}/>;
}

function chartOpts(yLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true, position: "top", align: "end",
        labels: { boxWidth: 16, boxHeight: 2, font: { size: 10 },
          color: "#64748b", padding: 12, usePointStyle: true, pointStyle: "line" },
      },
      tooltip: {
        backgroundColor: "#1e293b", cornerRadius: 8, padding: 8,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString("vi-VN")} ₫`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false },
           ticks: { font: { size: 10 }, color: "#94a3b8" } },
      y: { beginAtZero: true, min: 0, grid: { color: "rgba(219,234,254,.4)" },
           border: { display: false }, ticks: { stepSize: 1000000, font: { size: 10 },
             color: "#94a3b8", callback: v => v === 0 ? "0M" : `${v / 1000000}M` } },
    },
  };
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 12, minWidth: 280,
      background: "#0f172a",
      borderLeft: `4px solid ${type === "ok" ? "#22c55e" : "#ef4444"}`,
      boxShadow: "0 8px 30px rgba(0,0,0,.25)",
    }}>
      <span style={{ fontSize: 15 }}>{type === "ok" ? "✓" : "✕"}</span>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{msg}</span>
    </div>
  );
}

const MODAL_OVERLAY = {
  position: "fixed", inset: 0, zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)",
};
const MODAL_BOX = {
  background: "#fff", borderRadius: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,.2)",
  width: "100%", maxWidth: 460, overflow: "hidden",
};
const INP_STYLE = {
  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
  border: "1.5px solid #dbeafe", background: "#f8fbff",
  outline: "none", color: "#1e293b", fontFamily: "inherit", boxSizing: "border-box",
};

function CalcModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ EmployeeID: "", SalaryMonth: "", Bonus: "0", Deductions: "0" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCalc = async () => {
    if (!form.EmployeeID || !form.SalaryMonth) { setErr("Employee ID and Salary Month are required."); return; }
    setLoading(true); setErr("");
    try {
      const res = await calculatePayroll({
        EmployeeID:  Number(form.EmployeeID),
        SalaryMonth: form.SalaryMonth + "-01",
        Bonus:       Number(form.Bonus || 0),
        Deductions:  Number(form.Deductions || 0),
      });
      if (res?.error) setErr(res.error);
      else { onSuccess(); onClose(); }
    } catch { setErr("Server connection error."); }
    setLoading(false);
  };

  return (
    <div style={MODAL_OVERLAY}>
      <div style={MODAL_BOX}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#1e3a8a,#3b82f6)" }}/>
        <div style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#eff6ff",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdCalculate size={20} style={{ color: "#1e3a8a" }}/>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Calculate Payroll</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Compute net salary for an employee</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8,
              border: "none", background: "#f1f5f9", color: "#64748b",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <MdClose size={15}/>
            </button>
          </div>

          <div style={{ background: "#fffbeb", border: "1px solid #fef3c7",
            borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
            <p style={{ fontSize: 11.5, color: "#92400e", margin: 0, lineHeight: 1.7 }}>
              ⚠️ Employee must have an <strong>Attendance</strong> record for the selected month.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[
              ["Employee ID",       "EmployeeID",  "number", "e.g. 1"],
              ["Salary Month",      "SalaryMonth", "month",  ""],
              ["Bonus (VND)",       "Bonus",       "number", "0"],
              ["Deductions (VND)",  "Deductions",  "number", "0"],
            ].map(([label, key, type, ph]) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  {label} {(key === "EmployeeID" || key === "SalaryMonth") && <span style={{ color: "#ef4444" }}>*</span>}
                </label>
                <input type={type} placeholder={ph} value={form[key]}
                  onChange={e => set(key, e.target.value)} style={INP_STYLE}/>
              </div>
            ))}
          </div>

          {err && (
            <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 9,
              background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#dc2626" }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9,
              border: "1.5px solid #dbeafe", background: "#fff", fontSize: 13, fontWeight: 600,
              color: "#1e3a8a", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleCalc} disabled={loading}
              style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
                background: "#1e3a8a", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .7 : 1,
                fontFamily: "inherit", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 6 }}>
              <MdCalculate size={15}/>
              {loading ? "Calculating..." : "Calculate & Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ row, onClose, onSuccess }) {
  const [form, setForm] = useState({
    Bonus:      String(row.Bonus      ?? 0),
    Deductions: String(row.Deductions ?? 0),
  });
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const net = (Number(row.BaseSalary ?? 0))
            + (Number(form.Bonus)      || 0)
            - (Number(form.Deductions) || 0);

  const handleSave = async () => {
    const bonus = Number(form.Bonus);
    const ded   = Number(form.Deductions);
    if (isNaN(bonus) || isNaN(ded)) { setErr("Bonus and Deductions must be numbers."); return; }
    if (ded < 0 || bonus < 0)       { setErr("Values cannot be negative."); return; }

    setLoading(true); setErr("");
    try {
      const res = await updatePayroll(row.SalaryID, {
        Bonus:      bonus,
        Deductions: ded,
        NetSalary:  net,
      });
      if (res?.error) setErr(res.error);
      else { onSuccess(); onClose(); }
    } catch { setErr("Server connection error."); }
    setLoading(false);
  };

  return (
    <div style={MODAL_OVERLAY}>
      <div style={MODAL_BOX}>

        <div style={{ height: 3, background: "linear-gradient(90deg,#d97706,#fbbf24)" }}/>
        <div style={{ padding: 28 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fffbeb",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdEdit size={20} style={{ color: "#d97706" }}/>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Edit Payroll</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  Adjust bonus &amp; deductions
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8,
              border: "none", background: "#f1f5f9", color: "#64748b",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <MdClose size={15}/>
            </button>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Employee</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                {row.FullName} &nbsp;<span style={{ color: "#94a3b8", fontWeight: 400 }}>#{String(row.EmployeeID).padStart(3,"0")}</span>
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Salary Month</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                {fmtMonth(row.SalaryMonth)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Base Salary</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1e3a8a" }}>
                {fmtVND(row.BaseSalary)}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600,
                color: "#334155", marginBottom: 6 }}>Bonus (VND)</label>
              <input
                type="number" min="0" value={form.Bonus}
                onChange={e => set("Bonus", e.target.value)}
                style={{ ...INP_STYLE, borderColor: "#bbf7d0" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600,
                color: "#334155", marginBottom: 6 }}>Deductions (VND)</label>
              <input
                type="number" min="0" value={form.Deductions}
                onChange={e => set("Deductions", e.target.value)}
                style={{ ...INP_STYLE, borderColor: "#fca5a5" }}
              />
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: net >= 0 ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${net >= 0 ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: 10, padding: "10px 14px", marginBottom: 18,
          }}>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Net Salary (Preview)</span>
            <span style={{ fontSize: 16, fontWeight: 800,
              color: net >= 0 ? "#16a34a" : "#dc2626" }}>
              {net.toLocaleString("vi-VN")} ₫
            </span>
          </div>

          {err && (
            <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 9,
              background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#dc2626" }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: "10px 0", borderRadius: 9,
                border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600,
                color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
                background: "#d97706", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .7 : 1,
                fontFamily: "inherit", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 6 }}>
              <MdEdit size={15}/>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Payroll() {
  const navigate     = useNavigate();
  const role         = sessionStorage.getItem("role") || localStorage.getItem("role") || "";
  const canCalculate = ["Admin","Payroll Manager"].includes(role);
  const canEdit      = ["Admin","Payroll Manager","HR"].includes(role);

  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [depts,     setDepts]     = useState([]);
  const [showCalc,  setShowCalc]  = useState(false);
  const [toast,     setToast]     = useState(null);

  const [trendMode, setTrendMode]    = useState("total");
  const [trendEmp,  setTrendEmp]     = useState(null);
  const [trendData, setTrendData]    = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const [month,     setMonth]     = useState("");
  const [dept,      setDept]      = useState("");
  const [empSearch, setEmpSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayroll({ month: month || undefined, department: dept || undefined });
      setRows(Array.isArray(data) ? data : []);
    } catch { setRows([]); }
    setLoading(false);
  }, [month, dept]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const loadTotal = async () => {
      setTrendLoading(true);
      try {
        const data = await getSalaryTrend();
        setTrendData(Array.isArray(data) ? data : []);
        setTrendMode("total"); setTrendEmp(null);
      } catch { setTrendData([]); }
      setTrendLoading(false);
    };
    loadTotal();
    getDepartments().then(d => setDepts(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const filtered = rows.filter(r => {
    const matchSearch = empSearch.trim()
      ? (r.FullName || "").toLowerCase().includes(empSearch.trim().toLowerCase()) ||
        String(r.EmployeeID || "").includes(empSearch.trim())
      : true;
    const matchDept = !dept || dept === "" || dept === "All Departments"
      ? true
      : (r.DepartmentName || r.Department || "") === dept;
    return matchSearch && matchDept;
  });

  const loadEmpTrend = async (empId, empName) => {
    setTrendEmp(empName); setTrendMode("emp");
    setTrendData([]); setTrendLoading(true);
    try {
      const data = await getPayrollHistory(empId);
      if (Array.isArray(data) && data.length > 0) {
        const salary = Number(data[0].NetSalary || 0);
        setTrendData([
          { SalaryMonth: "Start", NetSalary: 0, BaseSalary: 0 },
          { ...data[0], NetSalary: salary, BaseSalary: Number(data[0].BaseSalary || 0) },
        ]);
      } else { setTrendData([]); }
    } catch { setTrendData([]); }
    setTrendLoading(false);
  };

  const loadTotalTrend = async () => {
    setTrendEmp(null); setTrendMode("total");
    setTrendData([]); setTrendLoading(true);
    try {
      const data = await getSalaryTrend();
      setTrendData(Array.isArray(data) ? data : []);
    } catch { setTrendData([]); }
    setTrendLoading(false);
  };

  const handleExportExcel = () => {
    const data = filtered.map(r => ({
      Employee:    r.FullName,
      Department:  r.Department,
      SalaryMonth: r.SalaryMonth,
      BaseSalary:  r.BaseSalary,
      Bonus:       r.Bonus,
      Deductions:  r.Deductions,
      NetSalary:   r.NetSalary,
    }));
    const ws  = XLSX.utils.json_to_sheet(data);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      "payroll_report.xlsx"
    );
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const clearFilters = () => { setMonth(""); setDept(""); setEmpSearch(""); };
  const hasFilter    = month || dept || empSearch;

  const totalNet   = filtered.reduce((s,r) => s + (Number(r.NetSalary  ?? 0) || 0), 0);
  const totalBonus = filtered.reduce((s,r) => s + (Number(r.Bonus      ?? 0) || 0), 0);
  const totalDed   = filtered.reduce((s,r) => s + (Number(r.Deductions ?? 0) || 0), 0);
  const avgNet     = filtered.length ? totalNet / filtered.length : 0;

  const C = {
    navy:"#1e3a8a", blue100:"#dbeafe", blue50:"#eff6ff",
    gray900:"#0f172a", gray800:"#1e293b", gray500:"#64748b", gray400:"#94a3b8",
  };
  const inp = {
    height: 34, padding: "0 10px", borderRadius: 7,
    border: `1.5px solid ${C.blue100}`, background: "#f8fbff",
    fontFamily: "inherit", fontSize: 12, color: "#334155",
    outline: "none", boxSizing: "border-box",
  };
  const statCard = (label, value, color, sub) => (
    <div style={{ background:"#fff", borderRadius:14,
      boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:"14px 18px" }}>
      <div style={{ fontSize:11, color:C.gray400, fontWeight:500, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.gray400, marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display:"flex", width:"100%", height:"100vh", overflow:"hidden",
      fontFamily:"'Inter',sans-serif", background:"#f0f6ff" }}>
      <Sidebar/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar/>
        <main style={{ flex:1, overflow:"hidden", padding:"14px 16px",
          display:"flex", flexDirection:"column", gap:10 }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"flex-start",
            justifyContent:"space-between", flexShrink:0 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:C.navy,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <MdPayments size={17} color="#fff"/>
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:C.gray900, letterSpacing:-.3 }}>
                  Payroll Management
                </div>
              </div>
              <div style={{ fontSize:11, color:C.gray400, marginLeft:42, fontWeight:500 }}>
                View and manage employee salary records
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={load}
                style={{ display:"inline-flex", alignItems:"center", gap:5,
                  padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                  background:"#fff", color:C.navy, border:`1.5px solid ${C.blue100}`,
                  cursor:"pointer", fontFamily:"inherit" }}>
                <MdRefresh size={14}/> Refresh
              </button>
              <button onClick={handleExportExcel}
                style={{ display:"inline-flex", alignItems:"center", gap:5,
                  padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                  background:"#fff", color:"#16a34a", border:"1.5px solid #bbf7d0",
                  cursor:"pointer", fontFamily:"inherit" }}>
                <MdDownload size={14}/> Export Excel
              </button>
              {canCalculate && (
                <button onClick={() => setShowCalc(true)}
                  style={{ display:"inline-flex", alignItems:"center", gap:5,
                    padding:"6px 16px", borderRadius:7, fontSize:12, fontWeight:700,
                    background:C.navy, color:"#fff", border:"none",
                    cursor:"pointer", fontFamily:"inherit" }}>
                  <MdCalculate size={14}/> Calculate Payroll
                </button>
              )}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, flexShrink:0 }}>
            {statCard("Total Net Salary", fmtVND(totalNet),   C.navy,    `${filtered.length} records`)}
            {statCard("Avg Net Salary",   fmtVND(avgNet),     "#7c3aed")}
            {statCard("Total Bonus",      fmtVND(totalBonus), "#16a34a")}
            {statCard("Total Deductions", fmtVND(totalDed),   "#dc2626")}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 320px",
            gap:12, flex:1, minHeight:0 }}>

            {/* Table */}
            <div style={{ background:"#fff", borderRadius:14,
              boxShadow:"0 2px 8px rgba(0,0,0,.06)",
              display:"flex", flexDirection:"column", overflow:"hidden" }}>

              <div style={{ display:"flex", alignItems:"flex-end", gap:10, padding:"12px 16px",
                borderBottom:`1px solid ${C.blue50}`, flexWrap:"wrap", flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:10, color:C.gray400, fontWeight:600,
                    textTransform:"uppercase", letterSpacing:.5, marginBottom:5 }}>Salary Month</div>
                  <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    style={{ ...inp, width:150 }}/>
                </div>
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontSize:10, color:C.gray400, fontWeight:600,
                    textTransform:"uppercase", letterSpacing:.5, marginBottom:5 }}>Select Employee</div>
                  <div style={{ position:"relative" }}>
                    <MdSearch size={13} style={{ position:"absolute", left:9, top:"50%",
                      transform:"translateY(-50%)", color:C.gray400, pointerEvents:"none" }}/>
                    <input type="text" placeholder="Search name or ID..."
                      value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                      style={{ ...inp, width:"100%", paddingLeft:28 }}/>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.gray400, fontWeight:600,
                    textTransform:"uppercase", letterSpacing:.5, marginBottom:5 }}>Select Department</div>
                  <select value={dept} onChange={e => setDept(e.target.value)}
                    style={{ ...inp, width:160, cursor:"pointer" }}>
                    <option value="">All Departments</option>
                    {depts.map(d => (
                      <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>
                    ))}
                  </select>
                </div>
                {hasFilter && (
                  <button onClick={clearFilters}
                    style={{ height:34, padding:"0 12px", borderRadius:7,
                      border:"1.5px solid #fca5a5", background:"#fef2f2",
                      color:"#dc2626", fontSize:12, fontWeight:600, cursor:"pointer",
                      fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                    <MdClose size={13}/> Clear
                  </button>
                )}
                <span style={{ marginLeft:"auto", fontSize:11, color:C.gray400,
                  alignSelf:"flex-end", paddingBottom:2 }}>
                  <b style={{ color:"#334155" }}>{filtered.length}</b> records
                </span>
              </div>

              <div style={{ overflowY:"auto", flex:1,
                scrollbarWidth:"thin", scrollbarColor:"#dbeafe transparent" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {["#","Employee","Dept","Salary Month","Base Salary",
                        "Bonus","Deductions","Net Salary","Actions"].map(h => (
                        <th key={h} style={{
                          fontSize:11, fontWeight:700, color:C.navy,
                          textTransform:"uppercase", letterSpacing:.5,
                          background:C.blue50, borderBottom:`1.5px solid ${C.blue100}`,
                          padding:"9px 12px", textAlign:"left",
                          position:"sticky", top:0, zIndex:10, whiteSpace:"nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && Array.from({length:6}).map((_,i) => (
                      <tr key={i}>
                        {Array.from({length:9}).map((_,j) => (
                          <td key={j} style={{ padding:"11px 12px" }}>
                            <div style={{ height:12, borderRadius:6, background:"#f1f5f9",
                              width:j===1?120:j===7?80:60, animation:"pulse 1.5s ease infinite" }}/>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {!loading && filtered.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign:"center", padding:52,
                        fontSize:12, color:C.gray400 }}>
                        <MdPayments size={36} style={{ color:"#dbeafe", marginBottom:10 }}/>
                        <div style={{ fontWeight:600, color:"#64748b" }}>
                          {hasFilter ? "No records match filters" : "No payroll data yet"}
                        </div>
                      </td></tr>
                    )}
                    {!loading && filtered.map((row, i) => (
                      <RowItem
                        key={row.SalaryID ?? i}
                        idx={i} row={row}
                        empId={row.EmployeeID ?? i}
                        name={row.FullName ?? "—"}
                        dept={row.DepartmentName || row.Department || "—"}
                        canEdit={canEdit}
                        onViewTrend={() => loadEmpTrend(row.EmployeeID, row.FullName)}
                        onHistory={() => navigate(`/payroll/history/${row.EmployeeID}`)}
                        onEdit={() => navigate(`/payroll/edit/${row.EmployeeID}`)}     
                        isActive={trendMode === "emp" && trendEmp === row.FullName}
                        blue50={C.blue50} blue100={C.blue100} navy={C.navy}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {!loading && rows.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"9px 16px", borderTop:`1px solid ${C.blue50}`,
                  background:"#fafbff", flexShrink:0 }}>
                  <span style={{ fontSize:11, color:C.gray400 }}>
                    Showing <b style={{ color:"#334155" }}>{filtered.length}</b> of{" "}
                    <b style={{ color:"#334155" }}>{rows.length}</b> records
                  </span>
                </div>
              )}
            </div>

            <div style={{ background:"#fff", borderRadius:14,
              boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:16,
              display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start", marginBottom:4 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:C.gray800 }}>Salary Trend</div>
                {trendMode === "emp" && (
                  <button onClick={loadTotalTrend}
                    style={{ fontSize:10, padding:"2px 8px", borderRadius:5,
                      border:`1px solid ${C.blue100}`, background:C.blue50,
                      color:C.navy, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                    ← Total
                  </button>
                )}
              </div>
              <div style={{ fontSize:11, color:C.gray400, marginBottom:12 }}>
                {trendMode === "total"
                  ? "Company-wide total payroll"
                  : trendEmp ? `Employee: ${trendEmp}` : ""}
                {trendMode === "total" && (
                  <span style={{ marginLeft:6, color:"#94a3b8" }}>· Click 👁 to view individual</span>
                )}
              </div>
              <div style={{ flex:1, minHeight:0, position:"relative" }}>
                {trendLoading ? (
                  <div style={{ height:"100%", display:"flex", alignItems:"center",
                    justifyContent:"center", color:C.gray400, fontSize:12 }}>Loading...</div>
                ) : (
                  <SalaryTrendChart data={trendData} mode={trendMode}/>
                )}
              </div>
              {trendMode === "emp" && trendData.length > 0 && (
                <div style={{ marginTop:12, borderTop:`1px solid ${C.blue50}`, paddingTop:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.gray800, marginBottom:8 }}>
                    Recent Records
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6,
                    overflowY:"auto", maxHeight:160 }}>
                    {[...trendData].reverse().slice(0,5).map((d,i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", padding:"6px 8px", borderRadius:8, background:C.blue50 }}>
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:C.gray800 }}>
                            {fmtMonth(d.SalaryMonth || d.month)}
                          </div>
                          <div style={{ fontSize:10, color:C.gray400 }}>
                            Base: {Number(d.BaseSalary||0).toLocaleString("vi-VN")} ₫
                          </div>
                        </div>
                        <div style={{ fontSize:12, fontWeight:800, color:C.navy }}>
                          {Number(d.NetSalary||0).toLocaleString("vi-VN")} ₫
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showCalc && (
        <CalcModal
          onClose={() => setShowCalc(false)}
          onSuccess={() => { showToast("ok","Payroll calculated successfully"); load(); }}
        />
      )}
      {toast && <Toast msg={toast.text} type={toast.type}/>}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

function RowItem({ idx, row, empId, name, dept, canEdit, onViewTrend, onHistory, onEdit, isActive,
                   blue50, blue100, navy }) {
  const [hov, setHov] = useState(false);
  const fmtV = v => v !== null && v !== undefined
    ? Number(v).toLocaleString("vi-VN") + " ₫" : "—";
  const fmtM = s => {
    if (!s) return "—";
    const [y,m] = String(s).slice(0,7).split("-");
    return m ? `${m}/${y}` : s;
  };
  const cell = {
    padding:"10px 12px", borderBottom:`1px solid ${blue50}`,
    background: isActive ? "#eff6ff" : hov ? blue50 : "#fff",
    verticalAlign:"middle", fontSize:13, transition:"background .12s",
  };
  const showActions = hov || isActive;

  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <td style={{ ...cell, color:"#94a3b8", fontSize:12 }}>{idx+1}</td>
      <td style={cell}>
        <div style={{ fontWeight:600, color:"#1e293b", fontSize:12.5 }}>{name}</div>
        <div style={{ fontSize:10, color:"#94a3b8" }}>#{String(empId).padStart(3,"0")}</div>
      </td>
      <td style={{ ...cell, color:"#64748b", fontSize:12 }}>{dept}</td>
      <td style={{ ...cell, color:"#64748b", fontSize:12, whiteSpace:"nowrap" }}>
        {fmtM(row.SalaryMonth)}
      </td>
      <td style={{ ...cell, fontWeight:500, color:"#334155", fontSize:12, whiteSpace:"nowrap" }}>
        {fmtV(row.BaseSalary)}
      </td>
      <td style={cell}>
        <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600,
          background:"#dcfce7", color:"#16a34a", whiteSpace:"nowrap" }}>
          +{Number(row.Bonus??0).toLocaleString("vi-VN")} ₫
        </span>
      </td>
      <td style={cell}>
        <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600,
          background:"#fee2e2", color:"#dc2626", whiteSpace:"nowrap" }}>
          -{Number(row.Deductions??0).toLocaleString("vi-VN")} ₫
        </span>
      </td>
      <td style={cell}>
        <span style={{ fontSize:14, fontWeight:800, color:navy, whiteSpace:"nowrap" }}>
          {fmtV(row.NetSalary)}
        </span>
      </td>

      <td style={cell} onClick={e => e.stopPropagation()}>
        <div style={{
          display:"flex", gap:4,
          opacity: showActions ? 1 : 0,
          transform: showActions ? "scale(1)" : "scale(0.85)",
          transition:"opacity .15s, transform .15s",
        }}>

          <button title="Salary Trend" onClick={onViewTrend}
            style={{ width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
              background: isActive ? "#dcfce7" : "#f0fdf4", color:"#16a34a",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            <MdVisibility size={14}/>
          </button>

          <button title="Salary History" onClick={onHistory}
            style={{ width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
              background:blue50, color:navy,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            <MdHistory size={14}/>
          </button>
          {/* Edit — chỉ hiện khi có quyền */}
          {canEdit && (
            <button title="Edit Payroll" onClick={onEdit}
              style={{ width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
                background:"#fffbeb", color:"#1e3a8a",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              <MdEdit size={14}/>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}