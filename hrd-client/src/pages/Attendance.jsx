
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdEventNote, MdSearch, MdRefresh,
  MdCheckCircle, MdWarning,
} from "react-icons/md";
import { BsDownload } from "react-icons/bs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import { getAttendance } from "../services/attendanceApi";

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

const PAGE_SIZE = 10;

const fmtMonth = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d)) return String(raw).slice(0, 7);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};

/**
 * Deduplicate: DB has duplicate rows (IDs 1-10 and 11-20 same month/employee).
 * Keep the record with the highest AttendanceID per (EmployeeID, YYYY-MM).
 */
function dedup(records) {
  const map = new Map();
  for (const r of records) {
    const key  = `${r.EmployeeID}_${String(r.AttendanceMonth).slice(0, 7)}`;
    const prev = map.get(key);
    if (!prev || r.AttendanceID > prev.AttendanceID) map.set(key, r);
  }
  return Array.from(map.values());
}

function KpiCard({ label, value, color, bg, icon: Icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "14px 18px",
      boxShadow: "0 2px 8px rgba(0,0,0,.06)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 3, background: color, borderRadius: "0 0 14px 14px",
      }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} style={{ color }}/>
        </div>
        <span style={{ fontSize: 12, color: C.gray500, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, letterSpacing: -.5 }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function Badge({ label, bg, text }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px",
      borderRadius: 20, background: bg, color: text, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function AttRow({ r, idx, page }) {
  const [hov, setHov] = useState(false);

  const absFlag   = r.AbsentDays > 2;
  const leaveFlag = r.LeaveDays  > 3;
  const badgeLabel = absFlag ? "⚠ High Absent" : leaveFlag ? "On Leave" : "Active";
  const badgeBg    = absFlag ? C.redLt   : leaveFlag ? C.amberLt : C.greenLt;
  const badgeText  = absFlag ? C.red     : leaveFlag ? C.amber   : C.green;

  const td = {
    padding: "10px 14px",
    borderBottom: `1px solid ${C.blue50}`,
    background: hov ? "#f8fbff" : "#fff",
    transition: "background .12s",
    fontSize: 12,
    color: C.gray700,
    verticalAlign: "middle",
  };

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <td style={{ ...td, color: C.gray400, fontSize: 11 }}>
        {(page - 1) * PAGE_SIZE + idx + 1}
      </td>
      <td style={td}>
        <div style={{ fontWeight: 700, color: C.gray800, fontSize: 12.5 }}>{r.FullName}</div>
        <div style={{ fontSize: 10, color: C.gray400 }}>ID #{String(r.EmployeeID).padStart(3,"0")}</div>
      </td>
      <td style={td}>
        <Badge label={badgeLabel} bg={badgeBg} text={badgeText}/>
      </td>
      <td style={{ ...td, textAlign: "center" }}>
        <span style={{ fontWeight: 700, color: C.navy }}>{r.WorkDays}</span>
        <span style={{ fontSize: 10, color: C.gray400, marginLeft: 3 }}>days</span>
      </td>
      <td style={{ ...td, textAlign: "center" }}>
        <span style={{ fontWeight: 700, color: C.cyan }}>{r.LeaveDays}</span>
        <span style={{ fontSize: 10, color: C.gray400, marginLeft: 3 }}>days</span>
      </td>
      <td style={{ ...td, textAlign: "center" }}>
        <span style={{
          fontWeight: 700,
          color: r.AbsentDays > 0 ? C.red : C.green,
        }}>
          {r.AbsentDays}
        </span>
        <span style={{ fontSize: 10, color: C.gray400, marginLeft: 3 }}>days</span>
      </td>
      <td style={{ ...td, whiteSpace: "nowrap" }}>
        {fmtMonth(r.AttendanceMonth)}
      </td>
    </tr>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.gray800, borderRadius: 8,
      padding: "8px 14px", boxShadow: "0 4px 12px rgba(0,0,0,.2)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{
          fontSize: 11, color: p.color, marginBottom: 3, display: "flex", gap: 8,
        }}>
          <span style={{ opacity: .7 }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{p.value} days</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function Attendance() {
  const navigate = useNavigate();

  const [search,      setSearch]      = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [empFilter,   setEmpFilter]   = useState("");
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [allRecords,  setAllRecords]  = useState([]);

  useEffect(() => {
    const role = sessionStorage.getItem("role") || localStorage.getItem("role");
    if (!role) { navigate("/"); return; }
    fetchData();
  }, []);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getAttendance({});
      if (Array.isArray(data)) setAllRecords(dedup(data));
    } catch (e) {
      console.error("Attendance fetch error:", e);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setPage(1); }, [search, monthFilter, empFilter]);

  const filtered = allRecords.filter(r => {
    const q = search.trim().toLowerCase();
    if (q && !r.FullName?.toLowerCase().includes(q) && !String(r.EmployeeID).includes(q))
      return false;
    if (monthFilter) {
      if (String(r.AttendanceMonth).slice(0, 7) !== monthFilter) return false;
    }
    if (empFilter && !isNaN(empFilter)) {
      if (r.EmployeeID !== Number(empFilter)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalWork   = filtered.reduce((s, r) => s + (r.WorkDays   || 0), 0);
  const totalLeave  = filtered.reduce((s, r) => s + (r.LeaveDays  || 0), 0);
  const totalAbsent = filtered.reduce((s, r) => s + (r.AbsentDays || 0), 0);

  const byEmp = {};
  filtered.forEach(r => {
    if (!byEmp[r.EmployeeID]) {
      const parts = (r.FullName || "").trim().split(" ");
      byEmp[r.EmployeeID] = {
        name:       parts[parts.length - 1] || `#${r.EmployeeID}`,
        WorkDays:   0,
        LeaveDays:  0,
        AbsentDays: 0,
      };
    }
    byEmp[r.EmployeeID].WorkDays   += r.WorkDays   || 0;
    byEmp[r.EmployeeID].LeaveDays  += r.LeaveDays  || 0;
    byEmp[r.EmployeeID].AbsentDays += r.AbsentDays || 0;
  });
  const chartData = Object.values(byEmp).slice(0, 10);

  const exportCSV = () => {
    const hdr  = "EmployeeID,FullName,WorkDays,LeaveDays,AbsentDays,AttendanceMonth";
    const rows = filtered.map(r =>
      `${r.EmployeeID},"${r.FullName}",${r.WorkDays},${r.LeaveDays},${r.AbsentDays},${String(r.AttendanceMonth).slice(0,7)}`
    );
    const blob = new Blob([[hdr, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "attendance_report.csv";
    a.click();
  };

  const hasFilter = search || monthFilter || empFilter;
  const QUICK_MONTHS = ["", "2024-09", "2024-10", "2024-11", "2024-12"];

  const absentRate = (totalWork + totalLeave + totalAbsent) > 0
    ? ((totalAbsent / (totalWork + totalLeave + totalAbsent)) * 100).toFixed(1)
    : "0.0";

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div style={{
      display: "flex", width: "100%", height: "100vh",
      overflow: "hidden", fontFamily: "'Inter',sans-serif", background: "#f0f6ff",
    }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        ::-webkit-scrollbar       { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #dbeafe; border-radius: 4px; }
      `}</style>

      <Sidebar/>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar/>

        <main style={{
          flex: 1, overflowY: "auto", padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 10,
          scrollbarWidth: "thin", scrollbarColor: "#dbeafe transparent",
        }}>

          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: C.navy,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <MdEventNote size={17} color="#fff"/>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.gray900, letterSpacing: -.3 }}>
                  Attendance Overview
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.gray400, marginLeft: 42, fontWeight: 500 }}>
                View and analyse attendance data from PAYROLL.attendance (MySQL) · Read-only
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={exportCSV} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: "#fff", color: C.navy, border: `1.5px solid ${C.blue100}`,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <BsDownload size={12}/> Export CSV
              </button>
              <button onClick={() => fetchData(true)} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: C.navy, color: "#fff", border: "none",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <MdRefresh size={13}/> Refresh
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            <KpiCard label="Total Records"     value={filtered.length} color={C.blue500} bg={C.blue100}  icon={MdEventNote}/>
            <KpiCard label="Total Work Days"   value={totalWork}       color={C.green}   bg={C.greenLt}  icon={MdCheckCircle}/>
            <KpiCard label="Total Leave Days"  value={totalLeave}      color={C.cyan}    bg={C.cyanLt}   icon={MdEventNote}/>
            <KpiCard label="Total Absent Days" value={totalAbsent}     color={C.red}     bg={C.redLt}    icon={MdWarning}/>
          </div>

          {/* ── CHART + FILTER ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 12 }}>

            <div style={{
              background: "#fff", borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: 16,
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.gray800, marginBottom: 2 }}>
                Attendance Breakdown
              </div>
              <div style={{ fontSize: 11, color: C.gray400, marginBottom: 14 }}>
                Work · Leave · Absent per employee
              </div>
              {chartData.length === 0 ? (
                <div style={{
                  height: 220, display: "flex", alignItems: "center",
                  justifyContent: "center", color: C.gray400, fontSize: 12,
                }}>
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                    barCategoryGap="30%" barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.blue100} vertical={false}/>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.gray500 }}
                           axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 10, fill: C.gray500 }}
                           axisLine={false} tickLine={false}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }}/>
                    <Bar dataKey="WorkDays"   name="Work Days"   fill={C.navy}  radius={[4,4,0,0]}/>
                    <Bar dataKey="LeaveDays"  name="Leave Days"  fill={C.cyan}  radius={[4,4,0,0]}/>
                    <Bar dataKey="AbsentDays" name="Absent Days" fill={C.amber} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{
              background: "#fff", borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: 16,
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.gray800, marginBottom: 14 }}>
                Filter &amp; Search
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>

                <div style={{ position: "relative" }}>
                  <MdSearch size={13} style={{
                    position: "absolute", left: 9, top: "50%",
                    transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none",
                  }}/>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name / ID…"
                    style={{
                      width: "100%", padding: "7px 10px 7px 28px",
                      border: `1.5px solid ${search ? C.navy : C.blue100}`,
                      borderRadius: 7, fontSize: 11, outline: "none",
                      fontFamily: "inherit", color: C.gray800,
                      boxSizing: "border-box",
                      background: search ? C.blue50 : "#f8fbff",
                    }}
                  />
                </div>

                <input
                  type="month"
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    border: `1.5px solid ${monthFilter ? C.navy : C.blue100}`,
                    borderRadius: 7, fontSize: 11, outline: "none",
                    fontFamily: "inherit",
                    color: monthFilter ? C.gray800 : C.gray400,
                    background: monthFilter ? C.blue50 : "#f8fbff",
                    boxSizing: "border-box",
                  }}
                />

                <input
                  type="number"
                  value={empFilter}
                  onChange={e => setEmpFilter(e.target.value)}
                  placeholder="Employee ID"
                  style={{
                    padding: "7px 10px",
                    border: `1.5px solid ${empFilter ? C.navy : C.blue100}`,
                    borderRadius: 7, fontSize: 11, outline: "none",
                    fontFamily: "inherit", color: C.gray800,
                    background: empFilter ? C.blue50 : "#f8fbff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Showing",       val: filtered.length,                      sub: `of ${allRecords.length} records`, color: C.navy  },
                  { label: "Avg Work Days", val: filtered.length ? (totalWork / filtered.length).toFixed(1) : 0, sub: "per record", color: C.green },
                  { label: "Absent Rate",   val: absentRate + "%",                     sub: "of total days",      color: Number(absentRate) > 10 ? C.red : C.amber },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: C.blue50, borderRadius: 10,
                    padding: "10px 12px", borderLeft: `3px solid ${s.color}`,
                  }}>
                    <div style={{ fontSize: 10, color: C.gray500, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: C.gray400 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.gray500 }}>Quick:</span>
                {QUICK_MONTHS.map(m => (
                  <button key={m || "all"} onClick={() => setMonthFilter(m)} style={{
                    padding: "3px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                    background: monthFilter === m ? C.navy : "#fff",
                    color:      monthFilter === m ? "#fff" : C.navy,
                    border:     `1.5px solid ${monthFilter === m ? C.navy : C.blue100}`,
                  }}>
                    {m || "All"}
                  </button>
                ))}
                {hasFilter && (
                  <button
                    onClick={() => { setMonthFilter(""); setEmpFilter(""); setSearch(""); }}
                    style={{
                      padding: "3px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                      background: C.redLt, color: C.red, border: `1.5px solid #fca5a5`,
                    }}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── TABLE ── */}
          <div style={{
            background: "#fff", borderRadius: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,.06)",
            display: "flex", flexDirection: "column",
            flex: 1, minHeight: 300, overflow: "hidden",
          }}>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderBottom: `1px solid ${C.blue50}`, flexShrink: 0,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gray800 }}>
                Attendance Records
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 600,
                  padding: "2px 8px", borderRadius: 20,
                  background: C.blue100, color: C.navy,
                }}>
                  {filtered.length} entries
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.gray400 }}>
                Page {page} of {totalPages}
              </div>
            </div>

            <div style={{
              overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0,
              scrollbarWidth: "thin", scrollbarColor: "#dbeafe transparent",
            }}>
              {loading ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  height: 160, flexDirection: "column", gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, border: `3px solid ${C.blue200}`,
                    borderTopColor: C.navy, borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}/>
                  <span style={{ fontSize: 12, color: C.gray400 }}>Loading attendance data...</span>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["#","Employee","Status","Work Days","Leave Days","Absent Days","Month"].map(h => (
                        <th key={h} style={{
                          padding: "9px 14px", textAlign: h === "#" ? "left" : "left",
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
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 52 }}>
                          <div style={{ fontSize: 32, marginBottom: 10, opacity: .3 }}>📋</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.gray500, marginBottom: 8 }}>
                            {hasFilter ? "No records match your filters" : "No records found"}
                          </div>
                          {hasFilter && (
                            <button
                              onClick={() => { setMonthFilter(""); setEmpFilter(""); setSearch(""); }}
                              style={{
                                padding: "5px 14px", borderRadius: 7, background: C.navy,
                                color: "#fff", border: "none", fontSize: 12, fontWeight: 600,
                                cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              Clear Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : paginated.map((r, idx) => (
                      <AttRow key={r.AttendanceID} r={r} idx={idx} page={page}/>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && allRecords.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderTop: `1px solid ${C.blue50}`,
                background: "#fafbff", flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, color: C.gray400 }}>
                  Showing{" "}
                  <b style={{ color: C.gray800 }}>
                    {filtered.length === 0 ? 0 : (page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)}
                  </b>
                  {" "}of{" "}
                  <b style={{ color: C.gray800 }}>{filtered.length}</b> records
                  <span style={{ marginLeft: 8, color: C.gray300 }}>·</span>
                  <span style={{ marginLeft: 8, color: C.gray400 }}>Source: PAYROLL.attendance</span>
                </span>

                {totalPages > 1 && (
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p-1))}
                      disabled={page === 1}
                      style={{
                        padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: page === 1 ? C.blue50 : C.navy,
                        color:      page === 1 ? C.gray400 : "#fff",
                        border: "none", cursor: page === 1 ? "default" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >← Prev</button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                      return (
                        <button key={p} onClick={() => setPage(p)} style={{
                          width: 28, height: 28, borderRadius: 7,
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          fontFamily: "inherit",
                          background: page === p ? C.navy : "#fff",
                          color:      page === p ? "#fff" : C.navy,
                          border:     `1.5px solid ${page === p ? C.navy : C.blue100}`,
                        }}>{p}</button>
                      );
                    })}

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p+1))}
                      disabled={page === totalPages}
                      style={{
                        padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: page === totalPages ? C.blue50 : C.navy,
                        color:      page === totalPages ? C.gray400 : "#fff",
                        border: "none", cursor: page === totalPages ? "default" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >Next →</button>
                  </div>
                )}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}