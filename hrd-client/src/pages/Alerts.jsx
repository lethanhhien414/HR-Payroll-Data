// src/pages/Alerts.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BsDownload, BsArrowRepeat } from "react-icons/bs";
import {
  MdNotificationsActive, MdEventBusy, MdAttachMoney,
  MdCheckCircle, MdWarning, MdError, MdCelebration,
} from "react-icons/md";
import Sidebar  from "../components/Sidebar";
import Navbar   from "../components/Navbar";
import AlertApi from "../services/AlertApi";

/* ═══════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════ */
const C = {
  navy:    "#1e3a8a", blue600:"#2563eb", blue500:"#3b82f6",
  blue200: "#bfdbfe", blue100:"#dbeafe", blue50:"#eff6ff",
  gray900: "#0f172a", gray800:"#1e293b", gray700:"#334155",
  gray600: "#475569",
  gray500: "#64748b", gray400:"#94a3b8", gray300:"#cbd5e1",
  green:   "#16a34a", greenLt:"#dcfce7",
  amber:   "#d97706", amberLt:"#fef3c7",
  red:     "#dc2626", redLt:"#fee2e2",
  cyan:    "#0891b2", cyanLt:"#ecfeff",
};

/* ═══════════════════════════════════════
   KEY + GROUP
═══════════════════════════════════════ */
function makeKey(alert, gi) {
  const m    = alert.meta || {};
  const time = m.salaryMonth || m.attendanceMonth || m.anniversaryDate || m.dob || alert.date || "";
  const base = alert.alertId ? alert.alertId : `${alert.employeeId}_${alert.type}_${time}`;
  return `${base}__${gi}`;
}

function groupAlerts(alerts = []) {
  const leave = [], salary = [], tenure = [];
  let gi = 0;
  for (const a of alerts) {
    if (a.resolved) continue;
    const _id = makeKey(a, gi++);
    switch (a.type) {
      case "Excessive leave":   leave.push({ ...a, _id });  break;
      case "Salary anomaly":    salary.push({ ...a, _id }); break;
      case "Work Anniversary":
      case "Birthday":          tenure.push({ ...a, _id }); break;
      default: gi--; break;
    }
  }
  return { leave, salary, tenure };
}

/* ═══════════════════════════════════════
   SHARED TABLE STYLES
═══════════════════════════════════════ */
const TH = {
  padding: "9px 14px", fontSize: 11, fontWeight: 700, color: C.navy,
  textTransform: "uppercase", letterSpacing: .5,
  background: C.blue50, borderBottom: `1.5px solid ${C.blue100}`,
  position: "sticky", top: 0, zIndex: 10, whiteSpace: "nowrap",
  textAlign: "left",
};
const TD = {
  padding: "10px 14px", fontSize: 12, color: C.gray700,
  borderBottom: `1px solid ${C.blue50}`, verticalAlign: "middle",
};

/* ═══════════════════════════════════════
   KPI CARD
═══════════════════════════════════════ */
const KPI_CONF = [
  { label:"Total Alerts",        sub:"Requiring attention", Icon:MdNotificationsActive, grad:["#3b82f6","#93c5fd"] },
  { label:"Leave Alerts",        sub:"Policy violations",   Icon:MdEventBusy,           grad:["#d97706","#fbbf24"] },
  { label:"Salary Alerts",       sub:"Abnormal changes",    Icon:MdAttachMoney,         grad:["#7c3aed","#a78bfa"] },
  { label:"Anniversary & B-day", sub:"Within 30 days",      Icon:MdCelebration,         grad:["#0891b2","#67e8f9"] },
  { label:"Resolved",            sub:"This session",        Icon:MdCheckCircle,         grad:["#16a34a","#4ade80"] },
];

function KpiCard({ idx, value, badge, badgeType, onClick }) {
  const [hov, setHov] = useState(false);
  const { label, sub, Icon, grad } = KPI_CONF[idx];
  const [c1, c2] = grad;
  const bc = {
    up: { bg: C.greenLt, text: C.green },
    dn: { bg: C.redLt,   text: C.red   },
    wn: { bg: C.amberLt, text: C.amber },
    nt: { bg: C.blue100, text: C.navy  },
  }[badgeType] || { bg: C.blue100, text: C.navy };

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 14, padding: "14px 18px",
        position: "relative", overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        boxShadow: hov ? "0 8px 24px rgba(30,58,138,.18)" : "0 2px 8px rgba(0,0,0,.06)",
        transform: hov ? "translateY(-3px)" : "none",
        transition: "all .18s",
      }}
    >
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg,${c1},${c2})`, borderRadius: "0 0 14px 14px",
      }}/>
      <span style={{
        position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700,
        padding: "2px 7px", borderRadius: 20, background: bc.bg, color: bc.text,
      }}>{badge}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: `${c1}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} style={{ color: c1 }}/>
        </div>
        <div style={{ fontSize: 12, color: C.gray500, fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, lineHeight: 1, letterSpacing: -.5 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 11, color: C.gray400, marginTop: 5 }}>{sub}</div>
      {hov && onClick && (
        <div style={{ position:"absolute", bottom:10, right:12, fontSize:10, color:c1, fontWeight:700, opacity:.7 }}>→</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION HEADER
═══════════════════════════════════════ */
function SectionHead({ icon: Icon, title, sub, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: C.navy,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={16} color="#fff"/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.gray900 }}>
          {title}
          {count != null && (
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 700,
              background: count > 0 ? C.redLt : C.greenLt,
              color: count > 0 ? C.red : C.green,
              padding: "1px 8px", borderRadius: 20,
            }}>{count}</span>
          )}
        </div>
        {sub && <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SCROLL TABLE
═══════════════════════════════════════ */
function ScrollTable({ children }) {
  return (
    <div style={{
      maxHeight: 420, overflowY: "auto", overflowX: "auto",
      scrollbarWidth: "thin", scrollbarColor: "#dbeafe transparent",
      borderRadius: 10, border: `1px solid ${C.blue100}`,
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
    </div>
  );
}

function EmptyState({ icon: Icon, msg }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"48px 0", gap:12 }}>
      <Icon size={36} style={{ color: C.blue100 }}/>
      <div style={{ fontSize: 13, color: C.gray400, fontWeight: 500 }}>{msg}</div>
    </div>
  );
}

/* ═══════════════════════════════════════
   RESOLVE BUTTON
═══════════════════════════════════════ */
function ResolveBtn({ alertId, name, busy, onResolve }) {
  const loading = busy === alertId;
  return (
    <button onClick={() => onResolve(alertId, name)} disabled={loading} style={{
      padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: loading ? C.gray300 : C.navy, color: "#fff", border: "none",
      cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
      transition: "background .15s", whiteSpace: "nowrap",
    }}>
      {loading ? "..." : "Resolve"}
    </button>
  );
}

/* ═══════════════════════════════════════
   PANEL: LEAVE ALERTS
═══════════════════════════════════════ */
function LeavePanel({ items, onResolve, busyId }) {
  if (!items.length) return <EmptyState icon={MdEventBusy} msg="No leave alerts — all clear ✓"/>;
  return (
    <ScrollTable>
      <thead>
        <tr>{["ID","Employee","Month","Leave Days","Absent Days","Exceeded","Action"].map(h =>
          <th key={h} style={TH}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {items.map(item => <LeaveRow key={item._id} item={item} onResolve={onResolve} busyId={busyId}/>)}
      </tbody>
    </ScrollTable>
  );
}

function LeaveRow({ item, onResolve, busyId }) {
  const [hov, setHov] = useState(false);
  const m = item.meta || {};
  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.blue50 : "#fff", transition: "background .12s" }}>
      <td style={{ ...TD, color: C.gray400, fontSize: 11, fontFamily: "monospace" }}>
        #{String(item.employeeId).padStart(3,"0")}
      </td>
      <td style={TD}>
        <div style={{ fontWeight: 600, color: C.gray800 }}>{item.employeeName}</div>
        <div style={{ fontSize: 11, color: C.gray400 }}>{item.dept}</div>
      </td>
      <td style={{ ...TD, color: C.gray500 }}>{m.attendanceMonth || item.date || "—"}</td>
      <td style={{ ...TD, textAlign: "center" }}>
        <span style={{ fontWeight: 700, color: C.amber }}>{m.leaveDays ?? 0}</span>
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <span style={{ fontWeight: 700, color: C.red }}>{m.absentDays ?? 0}</span>
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <span style={{
          fontWeight: 800, color: C.red, background: C.redLt,
          padding: "2px 8px", borderRadius: 20, fontSize: 11,
        }}>
          +{m.absentDays ?? 0} days
        </span>
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <ResolveBtn alertId={item._id} name={item.employeeName} busy={busyId} onResolve={onResolve}/>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════
   PANEL: SALARY ALERTS
═══════════════════════════════════════ */
function SalaryPanel({ items, onResolve, busyId }) {
  if (!items.length) return <EmptyState icon={MdAttachMoney} msg="No salary anomalies detected ✓"/>;
  return (
    <ScrollTable>
      <thead>
        <tr>{["ID","Employee","Month","Base Salary","Net Salary","Change","Severity","Action"].map(h =>
          <th key={h} style={TH}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {items.map(item => <SalaryRow key={item._id} item={item} onResolve={onResolve} busyId={busyId}/>)}
      </tbody>
    </ScrollTable>
  );
}

function SalaryRow({ item, onResolve, busyId }) {
  const [hov, setHov] = useState(false);
  const m = item.meta || {};

  const net      = m.netSalary  || 0;
  const baseline = m.baseSalary || m.baseline || 0;
  const diff     = net - baseline;
  const pct      = baseline > 0 ? ((Math.abs(diff) / baseline) * 100).toFixed(1) : "0.0";
  const isUp     = diff > 0;

  const sevColor = item.severity === "Critical" ? C.red   : C.amber;
  const sevBg    = item.severity === "Critical" ? C.redLt : C.amberLt;

  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.blue50 : "#fff", transition: "background .12s" }}>
      <td style={{ ...TD, color: C.gray400, fontSize: 11, fontFamily: "monospace" }}>
        #{String(item.employeeId).padStart(3,"0")}
      </td>
      <td style={TD}>
        <div style={{ fontWeight: 600, color: C.gray800 }}>{item.employeeName}</div>
        <div style={{ fontSize: 11, color: C.gray400 }}>{item.dept}</div>
      </td>
      <td style={{ ...TD, color: C.gray500 }}>{m.salaryMonth || item.date || "—"}</td>
      <td style={{ ...TD, color: C.gray600 }}>
        {Number(baseline).toLocaleString("vi-VN")} ₫
      </td>
      <td style={TD}>
        <span style={{ fontWeight: 700, color: isUp ? C.red : C.amber }}>
          {Number(net).toLocaleString("vi-VN")} ₫
        </span>
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <span style={{
          fontWeight: 800,
          color: isUp ? C.red : C.amber,
          background: isUp ? C.redLt : C.amberLt,
          padding: "2px 8px", borderRadius: 20, fontSize: 11,
        }}>
          {isUp ? "+" : "−"}{pct}%
        </span>
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px",
          borderRadius: 20, background: sevBg, color: sevColor,
        }}>
          {item.severity}
        </span>
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <ResolveBtn alertId={item._id} name={item.employeeName} busy={busyId} onResolve={onResolve}/>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════
   PANEL: ANNIVERSARY & BIRTHDAY
═══════════════════════════════════════ */
function TenurePanel({ items, onResolve, busyId }) {
  if (!items.length) return <EmptyState icon={MdCelebration} msg="No upcoming anniversaries or birthdays."/>;
  return (
    <ScrollTable>
      <thead>
        <tr>{["ID","Employee","Type","Start / DOB","Milestone","Anniversary Date","Time","Action"].map(h =>
          <th key={h} style={TH}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {items.map(item => <TenureRow key={item._id} item={item} onResolve={onResolve} busyId={busyId}/>)}
      </tbody>
    </ScrollTable>
  );
}

function TenureRow({ item, onResolve, busyId }) {
  const [hov, setHov] = useState(false);
  const m          = item.meta || {};
  const isBirthday = item.type === "Birthday";
  const years      = m.yearsServed ?? m.age ?? 0;
  const daysUntil  = m.daysUntil ?? 0;
  const isToday    = daysUntil === 0;

  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.blue50 : "#fff", transition: "background .12s" }}>
      <td style={{ ...TD, color: C.gray400, fontSize: 11, fontFamily: "monospace" }}>
        #{String(item.employeeId).padStart(3,"0")}
      </td>
      <td style={TD}>
        <div style={{ fontWeight: 600, color: C.gray800 }}>{item.employeeName}</div>
        <div style={{ fontSize: 11, color: C.gray400 }}>{item.dept}</div>
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
          background: isBirthday ? "#fdf4ff" : C.blue50,
          color:      isBirthday ? "#9333ea" : C.navy,
        }}>
          {isBirthday ? "🎂 Birthday" : "🏅 Anniversary"}
        </span>
      </td>
      <td style={{ ...TD, color: C.gray500, fontSize: 11 }}>
        {isBirthday ? m.dob : m.hireDate || "—"}
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <span style={{
          fontWeight: 800, fontSize: 14, color: C.cyan,
          background: C.cyanLt, padding: "2px 10px", borderRadius: 20,
        }}>
          {years} {isBirthday ? "yrs old" : "years"}
        </span>
      </td>
      <td style={{ ...TD, color: C.gray500, fontSize: 11 }}>
        {m.anniversaryDate || item.date || "—"}
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <span style={{
          fontWeight: 700, fontSize: 11, padding: "2px 10px", borderRadius: 20,
          background: isToday ? C.greenLt : C.blue50,
          color:      isToday ? C.green   : C.navy,
        }}>
          {isToday ? "Today! 🎊" : `In ${daysUntil} days`}
        </span>
      </td>
      <td style={{ ...TD, textAlign: "center" }}>
        <ResolveBtn alertId={item._id} name={item.employeeName} busy={busyId} onResolve={onResolve}/>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════
   PANEL: RESOLVED
═══════════════════════════════════════ */
function ResolvedPanel({ items }) {
  if (!items.length) return <EmptyState icon={MdCheckCircle} msg="No alerts resolved this session."/>;
  return (
    <ScrollTable>
      <thead>
        <tr>{["Employee","Type","Message","Resolved By","Resolved At"].map(h =>
          <th key={h} style={TH}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={`r__${item._id}__${i}`}
            style={{ background: i % 2 === 0 ? "#fff" : "#fafbff", borderBottom: `1px solid ${C.blue50}` }}>
            <td style={{ ...TD, fontWeight: 600 }}>{item.employeeName}</td>
            <td style={TD}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px",
                borderRadius: 20, background: C.blue50, color: C.navy }}>
                {item.type}
              </span>
            </td>
            <td style={{ ...TD, color: C.gray500 }}>{item.message}</td>
            <td style={{ ...TD, color: C.gray500 }}>{item.resolvedBy || "—"}</td>
            <td style={{ ...TD, color: C.gray400, fontSize: 11 }}>{item.resolvedAt || "—"}</td>
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}

/* ═══════════════════════════════════════
   TAB BUTTON
═══════════════════════════════════════ */
function TabBtn({ active, onClick, children, count }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
      border: "none", cursor: "pointer", fontFamily: "inherit",
      background: active ? C.navy : "#fff",
      color:      active ? "#fff" : C.gray500,
      boxShadow:  active ? "0 2px 8px rgba(30,58,138,.18)" : "none",
      transition: "all .15s",
    }}>
      {children}
      {count > 0 && (
        <span style={{
          background: active ? "#ffffff33" : C.redLt,
          color:      active ? "#fff"      : C.red,
          fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 20,
        }}>{count}</span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 9999,
      padding: "10px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600,
      background: toast.type === "success" ? C.greenLt : C.redLt,
      color:      toast.type === "success" ? C.green   : C.red,
      boxShadow: "0 4px 16px rgba(0,0,0,.12)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {toast.type === "success" ? <MdCheckCircle size={15}/> : <MdError size={15}/>}
      {toast.msg}
    </div>
  );
}

/* ═══════════════════════════════════════
   EXPORT CSV
═══════════════════════════════════════ */
function exportAlertsCSV(leave, salary, tenure) {
  const rows = [
    ...leave.map(a  => ({ Type:"Leave",    ID:a.employeeId, Name:a.employeeName, Dept:a.dept, Message:a.message, Severity:a.severity })),
    ...salary.map(a => ({ Type:"Salary",   ID:a.employeeId, Name:a.employeeName, Dept:a.dept, Message:a.message, Severity:a.severity })),
    ...tenure.map(a => ({ Type:"Tenure/BD",ID:a.employeeId, Name:a.employeeName, Dept:a.dept, Message:a.message, Severity:a.severity })),
  ];
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(","), ...rows.map(r => keys.map(k => `"${r[k]??""}`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "alerts.csv"; a.click();
}

/* ═══════════════════════════════════════
   MAIN
═══════════════════════════════════════ */
export default function Alerts() {
  const navigate = useNavigate();

  const [activeTab,     setActiveTab]     = useState("leave");
  const [month,         setMonth]         = useState("");
  const [syncing,       setSyncing]       = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [toast,         setToast]         = useState(null);
  const [busyId,        setBusyId]        = useState(null);

  const [leaveItems,    setLeaveItems]    = useState([]);
  const [salaryItems,   setSalaryItems]   = useState([]);
  const [tenureItems,   setTenureItems]   = useState([]);
  const [resolvedItems, setResolvedItems] = useState([]);

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const params = {};
      if (month) params.month = month;
      const data = await AlertApi.scanAlerts(params);
      const { leave, salary, tenure } = groupAlerts(data.alerts || []);
      setLeaveItems(leave);
      setSalaryItems(salary);
      setTenureItems(tenure);
    } catch (err) {
      setError(err?.message || "Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    const role = sessionStorage.getItem("role") || localStorage.getItem("role");
    if (!role) { navigate("/"); return; }
    fetchAll();
  }, []);

  useEffect(() => { if (!loading) fetchAll(true); }, [month]);

  const handleSync = async () => {
    setSyncing(true);
    await fetchAll(true);
    setTimeout(() => setSyncing(false), 800);
  };

  /* ─Resolve: mỗi tab truyền đúng setter của chính nó */
  const makeResolver = (setItems) => async (alertId, empName) => {
    setBusyId(alertId);
    try {
      const role = sessionStorage.getItem("role") || localStorage.getItem("role") || "admin";
      await AlertApi.resolveAlert(alertId, role);

      setItems(prev => {
        const removed = prev.find(i => i._id === alertId);
        if (removed) {
          setResolvedItems(r => [{
            ...removed,
            resolvedBy: role,
            resolvedAt: new Date().toLocaleString("vi-VN"),
          }, ...r]);
        }
        return prev.filter(i => i._id !== alertId);
      });

      showToast(`Resolved: ${empName}`, "success");
    } catch (err) {
      showToast(err?.message || "Failed to resolve.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const alertCount = leaveItems.length + salaryItems.length + tenureItems.length;

  if (loading) return (
    <div style={{
      display: "flex", width: "100%", height: "100vh",
      alignItems: "center", justifyContent: "center",
      background: "#f0f6ff", fontFamily: "'Inter',sans-serif",
      color: C.gray500, flexDirection: "column", gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, border: `3px solid ${C.blue200}`,
        borderTopColor: C.navy, borderRadius: "50%", animation: "spin 1s linear infinite",
      }}/>
      <span style={{ fontSize: 13 }}>Loading alerts...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{
      display: "flex", width: "100%", height: "100vh",
      overflow: "hidden", fontFamily: "'Inter',sans-serif", background: "#f0f6ff",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <Sidebar alertCount={alertCount}/>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar alertCount={alertCount}/>

        <div style={{
          flex: 1, overflowY: "auto", padding: "14px 16px",
          scrollbarWidth: "thin", scrollbarColor: "#dbeafe transparent",
        }}>
          <Toast toast={toast}/>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fee2e2",
              borderRadius: 10, padding: "10px 16px", fontSize: 12,
              color: C.red, marginBottom: 12,
            }}>⚠️ {error}</div>
          )}

          {/* Header */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom: 12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{
                  width:32, height:32, borderRadius:8, background:C.navy,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <MdNotificationsActive size={17} color="#fff"/>
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:C.gray900, letterSpacing:-.3 }}>
                  Alert Center
                </div>
              </div>
              <div style={{ fontSize:11, color:C.gray400, marginLeft:42 }}>
                Monitor and resolve leave, salary, and HR alerts in real time
              </div>
            </div>

            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                style={{
                  padding:"5px 10px", borderRadius:7, fontSize:12,
                  border:`1.5px solid ${C.blue200}`, color:C.navy,
                  fontFamily:"inherit", outline:"none", background:"#fff",
                }}
              />
              <button onClick={() => exportAlertsCSV(leaveItems, salaryItems, tenureItems)}
                style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                  background:"#fff", color:C.navy, border:`1.5px solid ${C.blue200}`,
                  cursor:"pointer", fontFamily:"inherit",
                }}>
                <BsDownload size={12}/> Export
              </button>
              <button onClick={handleSync} disabled={syncing}
                style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                  background:C.navy, color:"#fff", border:"none",
                  cursor: syncing ? "not-allowed" : "pointer",
                  opacity: syncing ? .7 : 1, fontFamily:"inherit",
                }}>
                <BsArrowRepeat size={12} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}/>
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:12 }}>
            <KpiCard idx={0} value={alertCount}
              badge={alertCount > 0 ? "Pending" : "OK"}
              badgeType={alertCount > 0 ? "dn" : "nt"}
              onClick={() => setActiveTab("leave")}
            />
            <KpiCard idx={1} value={leaveItems.length}
              badge={leaveItems.length > 0 ? `${leaveItems.length} staff` : "OK"}
              badgeType={leaveItems.length > 0 ? "wn" : "nt"}
              onClick={() => setActiveTab("leave")}
            />
            <KpiCard idx={2} value={salaryItems.length}
              badge={salaryItems.length > 0 ? `${salaryItems.length} staff` : "OK"}
              badgeType={salaryItems.length > 0 ? "dn" : "nt"}
              onClick={() => setActiveTab("salary")}
            />
            <KpiCard idx={3} value={tenureItems.length}
              badge={tenureItems.length > 0 ? `${tenureItems.length} staff` : "OK"}
              badgeType="nt"
              onClick={() => setActiveTab("tenure")}
            />
            <KpiCard idx={4} value={resolvedItems.length}
              badge={resolvedItems.length > 0 ? "Done" : "None"}
              badgeType={resolvedItems.length > 0 ? "up" : "nt"}
              onClick={() => setActiveTab("resolved")}
            />
          </div>

          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:16 }}>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <TabBtn active={activeTab==="leave"}    onClick={() => setActiveTab("leave")}    count={leaveItems.length}>
                  <MdEventBusy size={13}/> Leave Alerts
                </TabBtn>
                <TabBtn active={activeTab==="salary"}   onClick={() => setActiveTab("salary")}   count={salaryItems.length}>
                  <MdAttachMoney size={13}/> Salary Alerts
                </TabBtn>
                <TabBtn active={activeTab==="tenure"}   onClick={() => setActiveTab("tenure")}   count={tenureItems.length}>
                  <MdCelebration size={13}/> Anniversary &amp; Birthday
                </TabBtn>
                <TabBtn active={activeTab==="resolved"} onClick={() => setActiveTab("resolved")} count={resolvedItems.length}>
                  <MdCheckCircle size={13}/> Resolved
                </TabBtn>
              </div>
              <div style={{ fontSize:11, color:C.gray400 }}>
                {activeTab==="leave"    && `${leaveItems.length} alerts · Absent ≥ 1 day/month`}
                {activeTab==="salary"   && `${salaryItems.length} alerts · Net vs Base Salary`}
                {activeTab==="tenure"   && `${tenureItems.length} notifications · Within 30 days`}
                {activeTab==="resolved" && `${resolvedItems.length} resolved this session`}
              </div>
            </div>

            {activeTab==="leave"    && <SectionHead icon={MdEventBusy}    title="Leave Alerts"         sub="Employees with excessive absences"          count={leaveItems.length}/>}
            {activeTab==="salary"   && <SectionHead icon={MdAttachMoney}  title="Salary Alerts"        sub="Net salary anomalies vs individual baseline" count={salaryItems.length}/>}
            {activeTab==="tenure"   && <SectionHead icon={MdCelebration}  title="Anniversary & Birthday" sub="Upcoming within 30 days"                  count={tenureItems.length}/>}
            {activeTab==="resolved" && <SectionHead icon={MdCheckCircle}  title="Resolved Alerts"      sub="Handled this session"                       count={resolvedItems.length}/>}

            {activeTab==="leave"    && <LeavePanel  items={leaveItems}    busyId={busyId} onResolve={makeResolver(setLeaveItems)}/>}
            {activeTab==="salary"   && <SalaryPanel items={salaryItems}   busyId={busyId} onResolve={makeResolver(setSalaryItems)}/>}
            {activeTab==="tenure"   && <TenurePanel items={tenureItems}   busyId={busyId} onResolve={makeResolver(setTenureItems)}/>}
            {activeTab==="resolved" && <ResolvedPanel items={resolvedItems}/>}
          </div>

        </div>
      </div>
    </div>
  );
}