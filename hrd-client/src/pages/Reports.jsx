import { useState, useEffect, useRef, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdBarChart, MdPeople, MdPayments, MdCalendarMonth,
  MdFilterList, MdDownload, MdRefresh, MdCardGiftcard,
  MdNotifications, MdWarning, MdInfo, MdCheckCircle,
  MdTrendingUp, MdGroups, MdAccessTime,
} from "react-icons/md";
import {
  getDashboardReport,
  getDepartmentReport,
  getSalaryTrend,
  getTopEmployees,
  getAlerts,
  getDividendReport,
} from "../services/reportApi";
import {
  getLeaveWarnings,
  getSalaryWarnings,
  getTenureNotifications
} from "../services/alertApi";

Chart.register(...registerables);

const DEPT_COLORS = [
  "#3b82f6","#22c55e","#06b6d4","#f59e0b",
  "#a855f7","#ef4444","#ec4899","#14b8a6",
  "#f97316","#6366f1",
];

const REPORT_TYPES = [
  { key: "hr",         label: "HR Report",         icon: MdPeople },
  { key: "payroll",    label: "Payroll Report",     icon: MdPayments },
  { key: "attendance", label: "Attendance Report",  icon: MdCalendarMonth },
  { key: "dividend",   label: "Dividend Report",    icon: MdCardGiftcard },
];

const fmtVND = v => {
  if (!v && v !== 0) return "—";
  const n = Number(v);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + " M";
  return n.toLocaleString("vi-VN");
};

const fmtCurrency = v => {
  if (!v && v !== 0) return "—";
  return Number(v).toLocaleString("vi-VN") + " ₫";
};

const exportCSV = (rows, filename) => {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(","), ...rows.map(r =>
    keys.map(k => `"${(r[k] ?? "").toString().replace(/"/g, '""')}"`).join(",")
  )].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

function BarChart({ data = [] }) {
  const ref  = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    inst.current?.destroy();
    inst.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: data.map(d => (d.department || d.Department || "").replace("Phòng ", "")),
        datasets: [{
          label: "Tổng lương (VND)",
          data:  data.map(d => d.total_salary ?? d.TotalSalary ?? 0),
          backgroundColor: DEPT_COLORS.slice(0, data.length).map(c => c + "cc"),
          borderColor:     DEPT_COLORS.slice(0, data.length),
          borderWidth: 1.5, borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1e293b", cornerRadius: 8, padding: 10,
            callbacks: { label: ctx => ` ${fmtVND(ctx.raw)} VND` },
          },
        },
        scales: {
          x: {
            grid: { display: false }, border: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 30 },
          },
          y: {
            grid: { color: "rgba(219,234,254,.6)" }, border: { display: false },
            ticks: { font: { size: 10 }, callback: v => fmtVND(v) },
          },
        },
      },
    });
    return () => inst.current?.destroy();
  }, [data]);

  if (!data.length) return <EmptyChart msg="Không có dữ liệu phòng ban"/>;
  return <canvas ref={ref} style={{ width: "100%", height: "100%" }}/>;
}

function DonutChart({ data = [] }) {
  const ref  = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    inst.current?.destroy();
    const total = data.reduce((s, d) => s + (d.total_salary || 0), 0);
    const pcts  = data.map(d =>
      total > 0 ? Math.round((d.total_salary || 0) / total * 100) : 0
    );
    inst.current = new Chart(ref.current, {
      type: "doughnut",
      data: {
        labels: data.map(d => d.department || d.Department || ""),
        datasets: [{
          data: pcts,
          backgroundColor: DEPT_COLORS.slice(0, data.length),
          borderWidth: 2, borderColor: "#fff", hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1e293b", cornerRadius: 8, padding: 10,
            callbacks: { label: c => ` ${c.label}: ${c.raw}%` },
          },
        },
      },
    });
    return () => inst.current?.destroy();
  }, [data]);

  if (!data.length) return <EmptyChart msg="Không có dữ liệu"/>;
  return <canvas ref={ref} style={{ width: "100%", height: "100%" }}/>;
}

function TrendChart({ data = [] }) {
  const ref  = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    inst.current?.destroy();
    inst.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: data.map(d => d.month || d.Month || ""),
        datasets: [{
          label: "Tổng lương (VND)",
          data:  data.map(d => d.total_salary ?? d.TotalSalary ?? 0),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,.07)",
          borderWidth: 2.5, fill: true, tension: 0.4,
          pointBackgroundColor: "#2563eb",
          pointRadius: 4, pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true, position: "top", align: "end",
            labels: { font: { size: 11 }, boxWidth: 16, boxHeight: 2, padding: 12 },
          },
          tooltip: {
            backgroundColor: "#1e293b", cornerRadius: 8, padding: 10,
            callbacks: { label: ctx => ` ${fmtVND(ctx.raw)} VND` },
          },
        },
        scales: {
          x: {
            grid: { display: false }, border: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            grid: { color: "rgba(219,234,254,.6)" }, border: { display: false },
            ticks: { font: { size: 11 }, callback: v => fmtVND(v) },
          },
        },
      },
    });
    return () => inst.current?.destroy();
  }, [data]);

  if (!data.length) return <EmptyChart msg="Chưa có dữ liệu xu hướng lương"/>;
  return <canvas ref={ref} style={{ width: "100%", height: "100%" }}/>;
}


const EmptyChart = ({ msg }) => (
  <div className="flex items-center justify-center h-full text-gray-400 text-[12px]">
    {msg}
  </div>
);

const KPI_GRADS = [
  ["#3b82f6","#93c5fd"],
  ["#16a34a","#4ade80"],
  ["#7c3aed","#a78bfa"],
  ["#d97706","#fbbf24"],
  ["#dc2626","#f87171"],
];

function KpiCard({ label, value, sub, badge, badgeColor = "bg-green-100 text-green-700", idx = 0 }) {
  const [c1, c2] = KPI_GRADS[idx] || KPI_GRADS[0];
  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4 relative overflow-hidden
                    hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
           style={{ background: `linear-gradient(90deg,${c1},${c2})` }}/>
      {badge && (
        <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5
                          rounded-full ${badgeColor}`}>
          {badge}
        </span>
      )}
      <p className="text-[11px] text-gray-500 font-medium mb-1.5">{label}</p>
      <p className="text-[22px] font-black" style={{ color: c1, letterSpacing: -0.5 }}>
        {value ?? "—"}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionHead({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
        <Icon size={17} style={{ color: "#1e3a8a" }}/>
      </div>
      <div>
        <h2 className="text-[14px] font-bold text-gray-900">{title}</h2>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

const TH = ({ children }) => (
  <th className="text-[10px] font-bold text-blue-600 uppercase tracking-wide
                 bg-blue-50 border-b border-blue-100 px-3 py-2 text-left
                 whitespace-nowrap sticky top-0 z-10">
    {children}
  </th>
);

const SEVERITY_CFG = {
  warning:  { bg: "bg-amber-50",  border: "border-amber-200",  icon: MdWarning,     ic: "text-amber-500",  badge: "bg-amber-100 text-amber-700"  },
  critical: { bg: "bg-red-50",    border: "border-red-200",    icon: MdWarning,     ic: "text-red-500",    badge: "bg-red-100 text-red-700"      },
  info:     { bg: "bg-blue-50",   border: "border-blue-200",   icon: MdInfo,        ic: "text-blue-500",   badge: "bg-blue-100 text-blue-700"    },
  success:  { bg: "bg-green-50",  border: "border-green-200",  icon: MdCheckCircle, ic: "text-green-500",  badge: "bg-green-100 text-green-700"  },
};
function SalaryAnomalyDetail({ alert }) {
  const up = (alert.changePct ?? 0) > 0;
  return (
    <div className="mt-2 flex items-center gap-3 bg-white rounded-lg px-3 py-1.5
                    border border-dashed border-gray-200">
      <div className="text-center">
        <p className="text-[9px] text-gray-400 uppercase tracking-wide">{alert.prevMonth}</p>
        <p className="text-[12px] font-bold text-gray-500">
          {alert.prevSalary != null
            ? Number(alert.prevSalary).toLocaleString("vi-VN") + " ₫"
            : "—"}
        </p>
      </div>
      <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full
                       text-[11px] font-black flex-shrink-0
                       ${up ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
        {up ? "▲" : "▼"} {Math.abs(alert.changePct ?? 0)}%
      </div>
      <div className="text-center">
        <p className="text-[9px] text-gray-400 uppercase tracking-wide">{alert.curMonth}</p>
        <p className="text-[12px] font-bold text-gray-800">
          {alert.curSalary != null
            ? Number(alert.curSalary).toLocaleString("vi-VN") + " ₫"
            : "—"}
        </p>
      </div>
    </div>
  );
}


function AlertItem({ alert, onResolve, resolved }) {
  const cfg  = SEVERITY_CFG[alert.severity] || SEVERITY_CFG.info;
  const Icon = cfg.icon;
  const uid  = `${alert.type}-${alert.EmployeeID}-${alert.month || alert.curMonth || "x"}`;

  if (resolved) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                      bg-gray-50 border border-gray-100 opacity-55">
        <MdCheckCircle size={13} className="text-green-500 flex-shrink-0"/>
        <span className="text-[11px] text-gray-400 flex-1 line-through truncate">
          {alert.FullName} — {alert.message}
        </span>
        <span className="text-[9px] bg-green-100 text-green-600 font-bold
                         px-2 py-0.5 rounded-full flex-shrink-0">
          Đã xử lý
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={`mt-0.5 flex-shrink-0 ${cfg.ic}`}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-[12px] font-semibold text-gray-800">{alert.FullName}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
              {(alert.severity || "info").toUpperCase()}
            </span>
            {alert.type === "salary_anomaly" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                               bg-purple-100 text-purple-700">
                LƯƠNG BẤT THƯỜNG
              </span>
            )}
            {alert.type === "leave_exceeded" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                               bg-amber-100 text-amber-700">
                VƯỢT PHÉP
              </span>
            )}
            {alert.type === "work_anniversary" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                               bg-blue-100 text-blue-700">
                KỸ NIỆM
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">{alert.message}</p>
          {alert.type === "salary_anomaly" && (
            <SalaryAnomalyDetail alert={alert}/>
          )}
        </div>
        <button
          onClick={() => onResolve && onResolve(uid)}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 mt-0.5
                     rounded-lg border border-green-200 bg-white
                     text-green-600 text-[10px] font-semibold
                     hover:bg-green-50 transition-all whitespace-nowrap">
          <MdCheckCircle size={11}/> Đã xử lý
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SECTION PANELS
═══════════════════════════════════════════ */

function HRReport({ dash, depts, top }) {
  const exportHR = () => exportCSV(
    depts.map(d => ({
      "Phòng ban":    d.department || d.Department,
      "Số nhân viên": d.employee_count ?? d.EmployeeCount,
      "Tổng lương":   d.total_salary ?? d.TotalSalary,
      "Lương TB":     d.avg_salary   ?? d.AverageSalary,
    })),
    "hr_report.csv"
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHead icon={MdPeople} title="HR Summary"
                     sub="Nguồn: HUMAN_2025.Employees + Departments"/>
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Tổng nhân viên"  value={dash?.TotalEmployees ?? "—"}
                   sub="HUMAN_2025.Employees" badge={dash?.TotalEmployees ? "Active" : null} idx={0}/>
          <KpiCard label="Số phòng ban"    value={depts.length || "—"}
                   sub="HUMAN_2025.Departments" idx={1}/>
          <KpiCard label="Tổng ngày công"  value={dash?.TotalWorkDays ?? "—"}
                   sub="PAYROLL.attendance" idx={2}/>
          <KpiCard label="Tổng ngày vắng"  value={dash?.TotalAbsentDays ?? "—"}
                   sub="PAYROLL.attendance"
                   badgeColor="bg-red-100 text-red-600"
                   badge={dash?.TotalAbsentDays > 0 ? "⚠️" : null} idx={4}/>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHead icon={MdGroups} title="Employee Distribution"
                       sub="Phân bổ nhân viên theo phòng ban"/>
          <button onClick={exportHR}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                             border-blue-200 bg-white text-[#1e3a8a] text-[12px]
                             font-semibold hover:bg-blue-50 transition-all">
            <MdDownload size={13}/> Export CSV
          </button>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2" style={{ height: 220 }}>
            <BarChart data={depts}/>
          </div>
          <div>
            <div style={{ height: 150 }}>
              <DonutChart data={depts}/>
            </div>
            <div className="mt-2 space-y-1 overflow-y-auto" style={{ maxHeight: 60 }}>
              {depts.map((d, i) => {
                const total = depts.reduce((s, x) => s + (x.total_salary || 0), 0);
                const pct   = total > 0 ? Math.round((d.total_salary || 0) / total * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0"
                         style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}/>
                    <span className="text-[10px] text-gray-500 flex-1 truncate">
                      {d.department || d.Department}
                    </span>
                    <span className="text-[10px] font-bold text-gray-700">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHead icon={MdPayments} title="Top 10 Earners"
                     sub="Nguồn: PAYROLL.salaries GROUP BY employee"/>
        {top.length === 0 ? (
          <p className="text-center text-gray-400 text-[13px] py-6">Chưa có dữ liệu</p>
        ) : (
          <div className="flex flex-col gap-2">
            {top.map((emp, i) => {
              const maxSal = Number(top[0]?.total_salary ?? top[0]?.TotalSalary ?? 1);
              const sal    = Number(emp.total_salary ?? emp.TotalSalary ?? 0);
              const pct    = maxSal > 0 ? Math.round(sal / maxSal * 100) : 0;
              const name   = emp.full_name ?? emp.FullName ?? "—";
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center
                                   text-[12px] font-black flex-shrink-0
                                   ${i === 0 ? "bg-amber-100 text-amber-600"
                                   : i === 1 ? "bg-gray-100 text-gray-500"
                                   : i === 2 ? "bg-orange-100 text-orange-500"
                                             : "bg-blue-50 text-blue-400"}`}>
                    {i + 1}
                  </div>
                  <span className="text-[13px] font-semibold text-gray-800 w-40 truncate">{name}</span>
                  <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                         style={{
                           width: `${pct}%`,
                           background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8"
                                     : i === 2 ? "#f97316" : "#3b82f6",
                         }}/>
                  </div>
                  <span className="text-[13px] font-bold text-blue-600 w-28 text-right">
                    {fmtVND(sal)} VND
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* Payroll Report */
function PayrollReport({
  dash,
  depts,
  trend,
  currentPage,
  totalPages,
  setCurrentPage,
  paginatedDepts
}) {
  const exportPayroll = () => exportCSV(
    depts.map(d => ({
      "Phòng ban":    d.department || d.Department,
      "Số NV":        d.employee_count ?? d.EmployeeCount,
      "Tổng lương":   d.total_salary   ?? d.TotalSalary,
      "Lương TB":     d.avg_salary     ?? d.AverageSalary,
    })),
    "payroll_report.csv"
  );

  const grandTotal = depts.reduce((s, d) => s + (d.total_salary || 0), 0);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHead icon={MdPayments} title="Payroll Summary"
                     sub="Nguồn: PAYROLL.salaries"/>
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Tổng lương (NetSalary)"
                   value={fmtVND(dash?.TotalSalary) + " VND"}
                   sub="Tất cả tháng" idx={0}/>
          <KpiCard label="Lương trung bình"
                   value={fmtVND(dash?.AverageSalary) + " VND"}
                   sub="Mỗi nhân viên / tháng" idx={2}/>
          <KpiCard label="Tổng ngày nghỉ phép"
                   value={dash?.TotalLeaveDays ?? "—"}
                   sub="PAYROLL.attendance" idx={3}/>
        </div>
      </div>

      {/* Payroll Trend */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHead icon={MdTrendingUp} title="Payroll Trend"
                     sub="Xu hướng tổng lương theo tháng"/>
        <div style={{ height: 220 }}>
          <TrendChart data={trend}/>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHead icon={MdBarChart} title="Payroll by Department"
                       sub="Nguồn: PAYROLL.salaries JOIN employees_payroll"/>
          <button onClick={exportPayroll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                             border-blue-200 bg-white text-[#1e3a8a] text-[12px]
                             font-semibold hover:bg-blue-50 transition-all">
            <MdDownload size={13}/> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>#</TH><TH>Phòng ban</TH><TH>Số NV</TH>
                <TH>Tổng lương</TH><TH>Lương TB</TH><TH>% Tổng</TH>
              </tr>
            </thead>
            <tbody>
              {depts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-[13px]">
                  Chưa có dữ liệu phòng ban
                </td></tr>
              ) : paginatedDepts.map((d, i) => {
                const pct = grandTotal > 0
                  ? ((d.total_salary || 0) / grandTotal * 100).toFixed(1) : "0";
                return (
                  <tr key={i} className="border-b border-blue-50 hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 text-[11px] text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                             style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}/>
                        <span className="font-semibold text-[13px] text-gray-800">
                          {d.department || d.Department || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-gray-500">
                      {d.employee_count ?? d.EmployeeCount ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[13px] text-blue-600">
                      {fmtVND(d.total_salary ?? d.TotalSalary)} VND
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-gray-600">
                      {fmtVND(d.avg_salary ?? d.AverageSalary)} VND
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                               style={{
                                 width: `${pct}%`,
                                 background: DEPT_COLORS[i % DEPT_COLORS.length],
                               }}/>
                        </div>
                        <span className="text-[12px] font-semibold text-gray-600 w-10">
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-end gap-2 mt-4">

          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
            className="px-3 py-1 rounded-lg border border-blue-100 text-[12px] disabled:opacity-40"
          > Previous
          </button>
          <span className="text-[12px] text-gray-500"> Page {currentPage} / {totalPages || 1}
          </span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1 rounded-lg border border-blue-100 text-[12px] disabled:opacity-40"
          >
            Next
          </button>

        </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceReport({ dash }) {
  const totalAtt = (dash?.TotalWorkDays || 0) + (dash?.TotalAbsentDays || 0) + (dash?.TotalLeaveDays || 0);
  const workPct   = totalAtt ? Math.round((dash?.TotalWorkDays   || 0) / totalAtt * 100) : 0;
  const absentPct = totalAtt ? Math.round((dash?.TotalAbsentDays || 0) / totalAtt * 100) : 0;
  const leavePct  = totalAtt ? Math.round((dash?.TotalLeaveDays  || 0) / totalAtt * 100) : 0;

  const rows = [
    { label: "Ngày công",      val: dash?.TotalWorkDays,   color: "#2563eb", pct: workPct,   icon: "✅" },
    { label: "Ngày nghỉ phép", val: dash?.TotalLeaveDays,  color: "#d97706", pct: leavePct,  icon: "🏖️" },
    { label: "Ngày vắng",      val: dash?.TotalAbsentDays, color: "#dc2626", pct: absentPct, icon: "⚠️" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHead icon={MdCalendarMonth} title="Attendance Summary"
                     sub="Nguồn: PAYROLL.attendance"/>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {rows.map(({ label, val, color, pct, icon }) => (
            <div key={label} className="bg-blue-50 rounded-xl p-4">
              <p className="text-[11px] text-gray-500 mb-1">{icon} {label}</p>
              <p className="text-[26px] font-black mb-2" style={{ color }}>
                {val ?? "—"} <span className="text-[14px] font-medium text-gray-400">ngày</span>
              </p>
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${pct}%`, background: color }}/>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{pct}% tổng số ngày</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
          <div className="text-[12px] text-gray-500">
            Tổng số ngày ghi nhận: <span className="font-bold text-gray-800">{totalAtt} ngày</span>
          </div>
          <div className="flex gap-4">
            {rows.map(({ label, color, pct }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }}/>
                <span className="text-[11px] text-gray-500">{label}: <b style={{ color }}>{pct}%</b></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DividendReport() {
  const [dividends, setDividends] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    const fetchDividends = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:5000/api/reports/dividends", {
          headers: { Authorization: getToken() ? `Bearer ${getToken()}` : "" },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setDividends(data);
        } else {
          setError(data?.error || "Không thể tải dữ liệu cổ tức");
        }
      } catch (e) {
        setError("Lỗi kết nối: " + e.message);
      }
      setLoading(false);
    };
    fetchDividends();
  }, []);

  const totalDiv = dividends.reduce((s, d) => s + Number(d.DividendAmount ?? d.dividend_amount ?? 0), 0);
  const totalPages = Math.ceil(dividends.length / rowsPerPage);

const paginatedDividends = dividends.slice( (currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const exportDiv = () => exportCSV(
    dividends.map(d => ({
      "EmployeeID":    d.EmployeeID ?? d.employee_id,
      "Họ tên":        d.FullName   ?? d.full_name,
      "Số tiền cổ tức": d.DividendAmount ?? d.dividend_amount,
      "Ngày cổ tức":   d.DividendDate   ?? d.dividend_date,
    })),
    "dividend_report.csv"
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHead icon={MdCardGiftcard} title="Dividend Report"
                       sub="Nguồn: HUMAN_2025.Dividends · Cổ tức nội bộ nhân viên"/>
          <button onClick={exportDiv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                             border-blue-200 bg-white text-[#1e3a8a] text-[12px]
                             font-semibold hover:bg-blue-50 transition-all">
            <MdDownload size={13}/> Export CSV
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <KpiCard label="Tổng số tiền cổ tức"
                   value={fmtVND(totalDiv) + " VND"}
                   sub="HUMAN_2025.Dividends" idx={0}/>
          <KpiCard label="Số nhân viên nhận cổ tức"
                   value={dividends.length}
                   sub="HUMAN_2025.Dividends" idx={1}/>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-10 text-blue-400">
            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-[13px]">Đang tải dữ liệu cổ tức...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400 text-[13px]">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <TH>#</TH><TH>Nhân viên</TH><TH>Số tiền cổ tức</TH>
                  <TH>Ngày cổ tức</TH><TH>% / Tổng</TH>
                </tr>
              </thead>
              <tbody>
                {dividends.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-[13px]">
                    Không có dữ liệu cổ tức
                  </td></tr>
                ) : paginatedDividends.map((d, i) => {
                  const amt = Number(d.DividendAmount ?? d.dividend_amount ?? 0);
                  const pct = totalDiv > 0 ? (amt / totalDiv * 100).toFixed(1) : "0";
                  return (
                    <tr key={i} className="border-b border-blue-50 hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2.5 text-[11px] text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-[13px] text-gray-800">
                        {d.FullName ?? d.full_name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[13px] text-blue-600">
                        {fmtCurrency(amt)}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-500">
                        {d.DividendDate ?? d.dividend_date ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-400"
                                 style={{ width: `${pct}%` }}/>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600 w-10">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertsPanel({ alerts, loading }) {

  const [resolved, setResolved] = useState({});

  const handleResolve = (uid) => {
    setResolved(prev => ({
      ...prev,
      [uid]: true
    }));
  };

  const groupedAlerts = alerts.reduce((acc, alert) => {

    const type = alert.type || "other";

    if (!acc[type]) acc[type] = [];

    acc[type].push(alert);

    return acc;

  }, {});

  const typeConfig = {
    leave_exceeded: {
      title: "⚠️ Vượt ngày nghỉ phép",
      color: "text-amber-600",
    },

    salary_anomaly: {
      title: "💸 Lương bất thường",
      color: "text-purple-600",
    },

    work_anniversary: {
      title: "🎉 Kỷ niệm công tác",
      color: "text-blue-600",
    },

    other: {
      title: "📋 Cảnh báo khác",
      color: "text-gray-600",
    },
  };

  const unresolvedCount = alerts.filter(a => {

    const uid =
      `${a.type}-${a.EmployeeID}-${a.month || a.curMonth || "x"}`;

    return !resolved[uid];

  }).length;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <SectionHead
          icon={MdNotifications}
          title="Alerts & Notifications"
          sub="Đang tải dữ liệu cảnh báo..."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">

      <div className="flex items-center justify-between mb-4">

        <SectionHead
          icon={MdNotifications}
          title="Alerts & Notifications"
          sub="Realtime system alerts"
        />

        <div className="flex items-center gap-2">

          {unresolvedCount > 0 && (
            <span className="bg-red-100 text-red-600 text-[11px]
                             font-bold px-2.5 py-1 rounded-full">
              {unresolvedCount} chưa xử lý
            </span>
          )}

        </div>
      </div>

      {alerts.length === 0 ? (

        <div className="flex flex-col items-center justify-center py-10 text-gray-400">

          <MdCheckCircle
            size={32}
            className="text-green-400 mb-2"
          />

          <p className="text-[13px]">
            Không có cảnh báo nào
          </p>

        </div>

      ) : (

        <div className="grid grid-cols-2 gap-4">

          {Object.entries(groupedAlerts).map(([type, items]) => {

            const cfg = typeConfig[type] || typeConfig.other;

            return (
              <div key={type}>

                <p className={`text-[11px] font-bold mb-2 uppercase tracking-wide ${cfg.color}`}>

                  {cfg.title} ({items.length})

                </p>

                <div className="space-y-2">

                  {items.map((a, i) => {

                    const uid =
                      `${a.type}-${a.EmployeeID}-${a.month || a.curMonth || "x"}`;

                    return (
                      <AlertItem
                        key={i}
                        alert={a}
                        onResolve={handleResolve}
                        resolved={!!resolved[uid]}
                      />
                    );
                  })}

                </div>

              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}


export default function Reports() {
  const [activeReport, setActiveReport] = useState("hr");

  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  const apiMonth = dateTo
    ? dateTo.slice(0, 7)
    : dateFrom
    ? dateFrom.slice(0, 7)
    : "";

  const [deptFilter,   setDeptFilter]   = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [loading,      setLoading]      = useState(true);
  const [alertLoading, setAlertLoading] = useState(true);

  const [dash,   setDash]   = useState(null);
  const [depts,  setDepts]  = useState([]);
  const [trend,  setTrend]  = useState([]);
  const [top,    setTop]    = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const deptNames = ["", ...depts.map(d => d.department || d.Department || "")];

  const filteredDepts = deptFilter
    ? depts.filter(d =>
        (d.department || d.Department || "") === deptFilter
      )
    : depts;
    const totalPages = Math.ceil(filteredDepts.length / rowsPerPage);
    const paginatedDepts = filteredDepts.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage);
  const filteredTop = employeeFilter
    ? top.filter(e =>
        (e.full_name || e.FullName || "") === employeeFilter
      )
    : top;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, dep, tr, t] = await Promise.allSettled([
        getDashboardReport(apiMonth || undefined),
        getDepartmentReport(apiMonth || undefined),
        getSalaryTrend(),
        getTopEmployees(10),
      ]);
      if (d.status   === "fulfilled") setDash(d.value);
      if (dep.status === "fulfilled" && Array.isArray(dep.value)) setDepts(dep.value);
      if (tr.status  === "fulfilled" && Array.isArray(tr.value))  setTrend(tr.value);
      if (t.status   === "fulfilled" && Array.isArray(t.value))   setTop(t.value);
    } catch { /* silent */ }
    setLoading(false);
  }, [apiMonth]);

  const loadAlerts = useCallback(async () => {

  setAlertLoading(true);

  try {

    const [
      leaveRes,
      salaryRes,
      tenureRes
    ] = await Promise.all([

      getLeaveWarnings(),
      getSalaryWarnings(),
      getTenureNotifications()

    ]);

    const leaveAlerts =
      ((leaveRes?.data || [])).map(x => ({
        ...x,
        type: "leave_exceeded"
      }));

    const salaryAlerts =
      ((salaryRes?.data || [])).map(x => ({
        ...x,
        type: "salary_anomaly"
      }));

    const tenureAlerts =
      ((tenureRes?.data || [])).map(x => ({
        ...x,
        type: "work_anniversary"
      }));

    setAlerts([
      ...leaveAlerts,
      ...salaryAlerts,
      ...tenureAlerts
    ]);

  } catch (err) {

    console.error("loadAlerts error:", err);

    setAlerts([]);

  }

  setAlertLoading(false);

}, []);

  useEffect(() => { load(); },       [load]);
  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleExportAll = () => {
    if (activeReport === "hr")
      exportCSV(filteredDepts.map(d => ({
        "Phòng ban": d.department || d.Department,
        "Số NV":     d.employee_count ?? d.EmployeeCount,
        "Tổng lương": d.total_salary ?? d.TotalSalary,
        "Lương TB":   d.avg_salary   ?? d.AverageSalary,
      })), "hr_report.csv");
    else if (activeReport === "payroll")
      exportCSV(filteredDepts.map(d => ({
        "Phòng ban":  d.department || d.Department,
        "Tổng lương": d.total_salary ?? d.TotalSalary,
        "Lương TB":   d.avg_salary   ?? d.AverageSalary,
      })), "payroll_report.csv");
    else if (activeReport === "attendance")
      exportCSV([{
        TotalWorkDays:   dash?.TotalWorkDays,
        TotalLeaveDays:  dash?.TotalLeaveDays,
        TotalAbsentDays: dash?.TotalAbsentDays,
      }], "attendance_report.csv");
  };

  const totalAtt  = (dash?.TotalWorkDays||0)+(dash?.TotalAbsentDays||0)+(dash?.TotalLeaveDays||0);
  const workPct   = totalAtt ? Math.round((dash?.TotalWorkDays  ||0)/totalAtt*100) : 0;
  const absentPct = totalAtt ? Math.round((dash?.TotalAbsentDays||0)/totalAtt*100) : 0;
  const leavePct  = totalAtt ? Math.round((dash?.TotalLeaveDays ||0)/totalAtt*100) : 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden"
         style={{ fontFamily: "'Inter',sans-serif" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar />

        <main className="flex-1 overflow-y-auto bg-[#f0f6ff] px-3 py-3
                         [&::-webkit-scrollbar]:w-1
                         [&::-webkit-scrollbar-thumb]:bg-blue-200">

          <div className="flex items-center justify-between mb-2">

            <div className="flex items-center gap-3">

              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: "#1e3a8a",
                  boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                }}
              >
                <MdBarChart size={18} style={{ color: "#fff" }} />
              </div>

              <div>
                <h1 className="text-[22px] font-black text-gray-900 tracking-tight">
                  Reports &amp; Analytics
                </h1>

                <p className="text-[11px] text-gray-400 mt-0.5">
                  HUMAN_2025 + PAYROLL integration · CS5 §3.4
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={() => { load(); loadAlerts(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                          border-blue-200 bg-white text-[#1e3a8a] text-[12px]
                          font-semibold hover:bg-blue-50 transition-all"
              >
                <MdRefresh size={14}/> Refresh
              </button>

              <button
                onClick={handleExportAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                          border-blue-200 bg-white text-[#1e3a8a] text-[12px]
                          font-semibold hover:bg-blue-50 transition-all"
              >
                <MdDownload size={14}/> Export
              </button>

            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm px-4 py-2 mb-3
                          flex items-center gap-4 flex-wrap">

            <div className="flex items-center gap-2">
              <MdCalendarMonth size={15} className="text-blue-400 flex-shrink-0"/>
              <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                Date Range
              </span>
              <div className="flex items-center gap-1.5 border border-blue-100 rounded-lg px-2.5 py-1">
                <input type="date" value={dateFrom}
                       onChange={e => setDateFrom(e.target.value)}
                       className="text-[12px] text-gray-700 outline-none border-none bg-transparent w-28"/>
                <span className="text-gray-300 text-[11px]">–</span>
                <input type="date" value={dateTo}
                       onChange={e => setDateTo(e.target.value)}
                       className="text-[12px] text-gray-700 outline-none border-none bg-transparent w-28"/>
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                        className="text-[11px] text-gray-400 hover:text-red-400">✕</button>
              )}
            </div>

            <div className="w-px h-6 bg-blue-100"/>

            <div className="w-px h-6 bg-blue-100"/>

            <div className="flex items-center gap-2">
              <MdPeople size={15} className="text-blue-400 flex-shrink-0"/>

              <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                Employee
              </span>

              <select value={employeeFilter}
                onChange={e => { setEmployeeFilter(e.target.value); setCurrentPage(1);}}
                className="text-[12px] text-gray-700 border border-blue-100 rounded-lg
                          px-2.5 py-1 outline-none bg-white cursor-pointer">
                <option value="">— All Employees —</option>

                {top.map((e, i) => (
                  <option key={i} value={e.full_name || e.FullName}>
                    {e.full_name || e.FullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <MdGroups size={15} className="text-blue-400 flex-shrink-0"/>
              <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                Department
              </span>
              <select value={deptFilter}
                      onChange={e => { setDeptFilter(e.target.value); setCurrentPage(1);}}
                      className="text-[12px] text-gray-700 border border-blue-100 rounded-lg
                                 px-2.5 py-1 outline-none bg-white cursor-pointer">
                {deptNames.map((n, i) => (
                  <option key={i} value={n}>{n || "— Select Department —"}</option>
                ))}
              </select>
              {deptFilter && (
                <button onClick={() => setDeptFilter("")}
                        className="text-[11px] text-gray-400 hover:text-red-400">✕</button>
              )}
            </div>

            <div className="w-px h-6 bg-blue-100"/>

            <div className="flex items-center gap-1 ml-auto">
              {REPORT_TYPES.map(({ key, label, icon: Icon }) => (
                <button key={key}
                        onClick={() => setActiveReport(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                    text-[12px] font-semibold transition-all ${
                          activeReport === key
                            ? "bg-[#1e3a8a] text-white shadow-sm"
                            : "text-gray-500 hover:bg-blue-50 hover:text-[#1e3a8a] border border-blue-100"
                        }`}>
                  <Icon size={13}/>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!alertLoading && alerts.length > 0 && (() => {

  const leaveCount =
    alerts.filter(a => a.type === "leave_exceeded").length;

  const salaryCount =
    alerts.filter(a => a.type === "salary_anomaly").length;

  const anniversaryCount =
    alerts.filter(a => a.type === "work_anniversary").length;

  return (
    <div
      className="mb-3 flex items-center justify-between
                 bg-amber-50 border border-amber-200
                 rounded-xl px-4 py-3"
    >

      <div className="flex items-center gap-2">

        <MdNotifications
          size={16}
          className="text-amber-500"
        />

        <div>

          <p className="text-[12px] font-bold text-amber-700">
            Có {alerts.length} cảnh báo đang chờ xử lý
          </p>

          <div className="flex items-center gap-2 mt-1 flex-wrap">

            {leaveCount > 0 && (
              <span
                className="text-[10px] font-semibold
                           px-2 py-0.5 rounded-full
                           bg-amber-100 text-amber-700"
              >
                ⚠️ Nghỉ phép: {leaveCount}
              </span>
            )}

            {salaryCount > 0 && (
              <span
                className="text-[10px] font-semibold
                           px-2 py-0.5 rounded-full
                           bg-purple-100 text-purple-700"
              >
                💸 Lương: {salaryCount}
              </span>
            )}

            {anniversaryCount > 0 && (
              <span
                className="text-[10px] font-semibold
                           px-2 py-0.5 rounded-full
                           bg-blue-100 text-blue-700"
              >
                🎉 Kỷ niệm: {anniversaryCount}
              </span>
            )}

          </div>

        </div>

      </div>

      <div
        className="text-[11px] font-semibold
                   text-amber-600"
      >
        Realtime
      </div>

    </div>
  );

})()}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-blue-400">
              <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span className="text-[14px]">Đang tải báo cáo...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">

                <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-3">
                    <MdBarChart size={15} className="text-blue-600"/>
                    <p className="text-[13px] font-bold text-gray-800">Salary by Department</p>
                  </div>
                  <div className="flex-1" style={{ minHeight: 200 }}>
                    <BarChart data={filteredDepts}/>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-3">
                    <MdPeople size={15} className="text-blue-600"/>
                    <p className="text-[13px] font-bold text-gray-800">Employee Distribution</p>
                  </div>
                  <div style={{ height: 160 }}>
                    <DonutChart data={filteredDepts}/>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto"
                       style={{ maxHeight: 70 }}>
                    {filteredDepts.map((d, i) => {
                      const total = filteredDepts.reduce((s, x) => s + (x.total_salary || 0), 0);
                      const pct   = total > 0
                        ? Math.round((d.total_salary || 0) / total * 100) : 0;
                      const label = (d.department || d.Department || "")
                        .replace("Phòng ", "");
                      return (
                        <div key={i} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                               style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}/>
                          <span className="text-[10px] text-gray-500 truncate flex-1">{label}</span>
                          <span className="text-[10px] font-bold text-gray-600">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-3">
                    <MdTrendingUp size={15} className="text-blue-600"/>
                    <p className="text-[13px] font-bold text-gray-800">Payroll Trend</p>
                  </div>
                  <div className="flex-1" style={{ minHeight: 200 }}>
                    <TrendChart data={trend}/>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-3">
                <KpiCard label="Tổng nhân viên"
                         value={dash?.TotalEmployees ?? "—"}
                         sub="HUMAN_2025" idx={0}/>
                <KpiCard label="Tổng lương"
                         value={fmtVND(dash?.TotalSalary) + " VND"}
                         sub="PAYROLL.salaries" idx={1}/>
                <KpiCard label="Lương TB"
                         value={fmtVND(dash?.AverageSalary) + " VND"}
                         sub="/ nhân viên" idx={2}/>
                <KpiCard label="Ngày công"
                         value={`${dash?.TotalWorkDays ?? "—"} (${workPct}%)`}
                         sub="PAYROLL.attendance" idx={1}/>
                <KpiCard label="Vắng + Phép"
                         value={`${(dash?.TotalAbsentDays||0)+(dash?.TotalLeaveDays||0)} ngày`}
                         sub={`Vắng ${absentPct}% · Phép ${leavePct}%`}
                         badgeColor="bg-red-100 text-red-600"
                         badge={(dash?.TotalAbsentDays||0) > 0 ? "⚠️" : null}
                         idx={4}/>
              </div>

              <AlertsPanel alerts={alerts} loading={alertLoading}/>

              {activeReport === "hr" && (
                <HRReport dash={dash} depts={filteredDepts} top={filteredTop}/>
              )}
              {activeReport === "payroll" && (
                <PayrollReport dash={dash} depts={filteredDepts} paginatedDepts={paginatedDepts} trend={trend} currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}/>
              )}
              {activeReport === "attendance" && (
                <AttendanceReport dash={dash}/>
              )}
              {activeReport === "dividend" && (
                <DividendReport/>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}