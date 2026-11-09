// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsDownload, BsArrowRepeat } from "react-icons/bs";
import {
  MdDashboard, MdPeople, MdAttachMoney, MdTrendingUp,
  MdEventNote, MdNotificationsActive,
} from "react-icons/md";
import { getDashboardReport, getSalaryTrend, getDepartmentReport } from "../services/reportApi";
import { getEmployees } from "../services/employeeApi";
import { getAlerts }    from "../services/alertApi";

import Sidebar       from "../components/Sidebar";
import Navbar        from "../components/Navbar";
import { SalaryChart, DonutChart, DonutLegend } from "../components/Chart";
import EmployeeTable from "../components/Table";

const C = {
  navy:"#1e3a8a", blue600:"#2563eb", blue500:"#3b82f6",
  blue200:"#bfdbfe", blue100:"#dbeafe", blue50:"#eff6ff",
  gray900:"#0f172a", gray800:"#1e293b", gray700:"#334155",
  gray500:"#64748b", gray400:"#94a3b8", gray300:"#cbd5e1",
  green:"#16a34a", greenLt:"#dcfce7",
  amber:"#d97706", amberLt:"#fef3c7",
  red:"#dc2626", redLt:"#fee2e2",
};

const KPI_CONF = [
  {
    label:"Tổng số nhân viên", sub:"All registered staff",
    Icon: MdPeople, grad:["#3b82f6","#93c5fd"],
    route: "/employees",
  },
  {
    label:"Total Payroll", sub:"Monthly salary expense",
    Icon: MdAttachMoney, grad:["#16a34a","#4ade80"],
    route: "/payroll",
  },
  {
    label:"Avg Salary", sub:"Per employee / month",
    Icon: MdTrendingUp, grad:["#7c3aed","#a78bfa"],
    route: "/payroll",
  },
  {
    label:"Leave / Absent", sub:"Total days this period",
    Icon: MdEventNote, grad:["#d97706","#fbbf24"],
    route: "/attendance",
  },
  {
    label:"Alerts", sub:"Requiring attention",
    Icon: MdNotificationsActive, grad:["#dc2626","#f87171"],
    route: "/alerts",
  },
];

function KpiCard({ label, sub, value, badge, badgeType, idx, onClick }) {
  const [hov, setHov] = useState(false);
  const { Icon, grad } = KPI_CONF[idx] || KPI_CONF[0];
  const [c1, c2] = grad;
  const bc = {
    up: { bg: C.greenLt,  text: C.green },
    dn: { bg: C.redLt,    text: C.red   },
    nt: { bg: C.blue100,  text: C.navy  },
  }[badgeType] || { bg: C.blue100, text: C.navy };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 14, padding: "14px 18px",
        position: "relative", overflow: "hidden", cursor: "pointer",
        boxShadow: hov ? "0 8px 24px rgba(30,58,138,.18)" : "0 2px 8px rgba(0,0,0,.06)",
        transform: hov ? "translateY(-4px)" : "none",
        transition: "all .18s",
        outline: hov ? `2px solid ${c1}33` : "none",
      }}
    >
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:3,
        background:`linear-gradient(90deg,${c1},${c2})`, borderRadius:"0 0 14px 14px",
      }}/>

      <span style={{
        position:"absolute", top:12, right:12, fontSize:10, fontWeight:700,
        padding:"2px 7px", borderRadius:20, background:bc.bg, color:bc.text,
      }}>
        {badge}
      </span>

      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{
          width:30, height:30, borderRadius:8, background:`${c1}18`,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>
          <Icon size={16} style={{ color: c1 }}/>
        </div>
        <div style={{ fontSize:12, color:C.gray500, fontWeight:500 }}>{label}</div>
      </div>

      <div style={{ fontSize:22, fontWeight:800, color:C.navy, lineHeight:1, letterSpacing:-.5 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize:11, color:C.gray400, marginTop:5 }}>{sub}</div>

      {hov && (
        <div style={{
          position:"absolute", bottom:10, right:12,
          fontSize:10, color:c1, fontWeight:700, opacity:.7,
        }}>→</div>
      )}
    </div>
  );
}

function AttBar({ label, val, color }) {
  const pct = isNaN(val) ? 0 : Math.min(Number(val), 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, color:C.gray700, fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color }}>{pct}%</span>
      </div>
      <div style={{ height:7, borderRadius:20, background:C.blue100 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color,
          borderRadius:20, transition:"width .4s" }}/>
      </div>
    </div>
  );
}

function fmtMoney(val) {
  if (!val && val !== 0) return "—";
  const n = Number(val);
  if (!n) return "0 ₫";
  return n.toLocaleString("vi-VN") + " ₫";
}

/* ════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();

  const [search,     setSearch]     = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [syncing,    setSyncing]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [kpi,       setKpi]       = useState(null);
  const [trend,     setTrend]     = useState([]);
  const [deptDist,  setDeptDist]  = useState([]);
  const [employees, setEmployees] = useState([]);
  const [alerts,    setAlerts]    = useState([]);

  const totalDays = (kpi?.TotalWorkDays||0)+(kpi?.TotalAbsentDays||0)+(kpi?.TotalLeaveDays||0);
  const workPct   = totalDays ? Math.round((kpi?.TotalWorkDays  ||0)/totalDays*100) : 0;
  const leavePct  = totalDays ? Math.round((kpi?.TotalLeaveDays ||0)/totalDays*100) : 0;
  const absentPct = totalDays ? Math.round((kpi?.TotalAbsentDays||0)/totalDays*100) : 0;

  const fetchAll = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [dashRes, trendRes, deptRes, empRes, alertRes] = await Promise.allSettled([
        getDashboardReport(),
        getSalaryTrend(),
        getDepartmentReport(),
        getEmployees(),
        getAlerts(),
      ]);
      if (dashRes.status  === "fulfilled" && !dashRes.value?.error)    setKpi(dashRes.value);
      if (trendRes.status === "fulfilled" && Array.isArray(trendRes.value)) setTrend(trendRes.value);
      if (deptRes.status  === "fulfilled" && Array.isArray(deptRes.value))  setDeptDist(deptRes.value);
      if (empRes.status   === "fulfilled" && Array.isArray(empRes.value))   setEmployees(empRes.value);
      if (alertRes.status === "fulfilled" && Array.isArray(alertRes.value)) setAlerts(alertRes.value);
    } catch(e) {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = sessionStorage.getItem("role") || localStorage.getItem("role");
    if (!role) { navigate("/"); return; }
    fetchAll();
  }, []);

  useEffect(() => {
    if (search === undefined) return;
    getEmployees({ name: search || undefined })
      .then(data => { if (Array.isArray(data)) setEmployees(data); })
      .catch(() => {});
  }, [search]);

  const handleSync = async () => {
    setSyncing(true);
    await fetchAll(true);
    setTimeout(() => setSyncing(false), 800);
  };

  if (loading) return (
    <div style={{
      display:"flex", width:"100%", height:"100vh",
      alignItems:"center", justifyContent:"center",
      background:"#f0f6ff", fontFamily:"'Inter',sans-serif",
      color:C.gray500, flexDirection:"column", gap:12,
    }}>
      <div style={{
        width:32, height:32, border:`3px solid ${C.blue200}`,
        borderTopColor:C.navy, borderRadius:"50%", animation:"spin 1s linear infinite",
      }}/>
      <span style={{ fontSize:13 }}>Loading dashboard...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const alertCount = kpi?.AlertCount ?? alerts.length;

  return (
    <div style={{
      display:"flex", width:"100%", height:"100vh",
      overflow:"hidden", fontFamily:"'Inter',sans-serif", background:"#f0f6ff",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <Sidebar alertCount={alertCount}/>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar search={search} onSearch={setSearch} alertCount={alertCount}/>

        <div style={{
          flex:1, overflowY:"auto", padding:"14px 16px",
          scrollbarWidth:"thin", scrollbarColor:"#dbeafe transparent",
        }}>

          {error && (
            <div style={{
              background:"#fef2f2", border:"1px solid #fee2e2",
              borderRadius:10, padding:"10px 16px", fontSize:12,
              color:C.red, marginBottom:12,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── Header ── */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{
                  width:32, height:32, borderRadius:8, background:C.navy,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                }}>
                  <MdDashboard size={17} color="#fff"/>
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:C.gray900, letterSpacing:-.3 }}>
                  Dashboard Overview
                </div>
              </div>
              <div style={{ fontSize:11, color:C.gray400, marginLeft:42, fontWeight:500 }}>
                Monitor company-wide HR and payroll metrics in real time
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button style={{
                display:"inline-flex", alignItems:"center", gap:5,
                padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                background:"#fff", color:C.navy, border:`1.5px solid ${C.blue200}`,
                cursor:"pointer", fontFamily:"inherit",
              }}>
                <BsDownload size={12}/> Export
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                  background:C.navy, color:"#fff", border:"none",
                  cursor: syncing ? "not-allowed" : "pointer",
                  opacity: syncing ? .7 : 1, fontFamily:"inherit",
                }}
              >
                <BsArrowRepeat size={12} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}/>
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:10 }}>
            <KpiCard
              idx={0} label="Total Employees"
              value={kpi?.TotalEmployees ?? "—"}
              sub="All registered staff"
              badge={kpi?.TotalEmployees ? `${kpi.TotalEmployees} staff` : "No data"}
              badgeType={kpi?.TotalEmployees ? "up" : "nt"}
              onClick={() => navigate("/employees")}
            />
            <KpiCard
              idx={1} label="Total Payroll"
              value={fmtMoney(kpi?.TotalSalary)}
              sub="Monthly salary expense"
              badge={kpi?.TotalSalary ? "Active" : "No data"}
              badgeType={kpi?.TotalSalary ? "up" : "nt"}
              onClick={() => navigate("/payroll")}
            />
            <KpiCard
              idx={2} label="Avg Salary"
              value={fmtMoney(kpi?.AverageSalary)}
              sub="Per employee / month"
              badge="±0%" badgeType="nt"
              onClick={() => navigate("/payroll")}
            />
            <KpiCard
              idx={3} label="Leave / Absent"
              value={(kpi?.TotalLeaveDays||0)+(kpi?.TotalAbsentDays||0)}
              sub="Total days this period"
              badge={`↑${kpi?.TotalAbsentDays??0} absent`}
              badgeType={kpi?.TotalAbsentDays > 0 ? "dn" : "nt"}
              onClick={() => navigate("/attendance")}
            />
            <KpiCard
              idx={4} label="Alerts"
              value={alertCount}
              sub="Requiring attention"
              badge={alertCount > 0 ? "New" : "OK"}
              badgeType={alertCount > 0 ? "dn" : "nt"}
              onClick={() => navigate("/alerts")}
            />
          </div>

          {/* ── Charts Row ── */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:12 }}>

            {/* Salary Over Time */}
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:C.gray800 }}>
                    Monthly Performance
                  </div>
                  <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>
                    Total payroll &amp; avg salary trends
                    {trend.length > 0 && (
                      <span style={{ marginLeft:8, color:C.navy, fontWeight:600 }}>
                        · {trend.length} month{trend.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => navigate("/reports")}
                  style={{
                    fontSize:11, padding:"3px 12px", background:C.navy,
                    color:"#fff", border:"none", borderRadius:6,
                    cursor:"pointer", fontFamily:"inherit",
                  }}
                >
                  View Reports →
                </button>
              </div>
              <div style={{ height:220 }}>
                <SalaryChart data={trend}/>
              </div>
            </div>

            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:14 }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:C.gray800, marginBottom:2 }}>
                Payroll by Department
              </div>
              <div style={{ fontSize:11, color:C.gray400, marginBottom:10 }}>
                Distribution across all departments
                {deptDist.length === 0 && <span style={{ color:C.amber, marginLeft:6 }}>(No data)</span>}
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:110, height:110, flexShrink:0 }}>
                  <DonutChart data={deptDist}/>
                </div>
                <DonutLegend data={deptDist}/>
              </div>

              <div style={{ borderTop:`1px solid ${C.blue100}`, paddingTop:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.gray800, marginBottom:10 }}>
                  Attendance Summary
                  {totalDays === 0 && (
                    <span style={{ fontSize:10, color:C.amber, fontWeight:400, marginLeft:8 }}>(No records)</span>
                  )}
                </div>
                <AttBar label="Work Days"   val={workPct}   color={C.navy}/>
                <AttBar label="Leave Days"  val={leavePct}  color="#06b6d4"/>
                <AttBar label="Absent Days" val={absentPct} color={C.red}/>
                {totalDays > 0 && (
                  <div style={{ fontSize:10, color:C.gray400, marginTop:6, display:"flex", gap:10 }}>
                    <span>Work: {kpi?.TotalWorkDays}</span>
                    <span>Leave: {kpi?.TotalLeaveDays}</span>
                    <span>Absent: {kpi?.TotalAbsentDays}</span>
                  </div>
                )}
                <button
                  onClick={() => navigate("/attendance")}
                  style={{
                    marginTop:10, width:"100%", padding:"5px 0", borderRadius:7,
                    border:`1px solid ${C.blue100}`, background:C.blue50,
                    fontSize:11, fontWeight:600, color:C.navy,
                    cursor:"pointer", fontFamily:"inherit",
                  }}
                >
                  View Attendance →
                </button>
              </div>
            </div>
          </div>

          <EmployeeTable
            employees={employees}
            deptFilter={deptFilter}   setDeptFilter={setDeptFilter}
            roleFilter={roleFilter}   setRoleFilter={setRoleFilter}
            onClearFilters={() => { setDeptFilter(""); setRoleFilter(""); }}
            onRefresh={() => fetchAll(true)}
          />

        </div>
      </div>
    </div>
  );
}