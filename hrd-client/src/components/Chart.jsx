// src/components/Chart.jsx
// FIX: safeMonthLabel thay new Date("2024-09") → không còn "NaN-NaN" / "Invalid Date"
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

Chart.defaults.font.family = "'Inter',sans-serif";
Chart.defaults.color = "#94a3b8";

const NAVY         = "#1e3a8a";
const NAVY_ALPHA   = "rgba(30,58,138,0.18)";
const CYAN         = "#06b6d4";
const DONUT_COLORS = ["#3b82f6","#22c55e","#06b6d4","#f59e0b","#a855f7","#ef4444"];
const MON          = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtMoney(val) {
  const n = Number(val);
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n/1_000_000_000).toFixed(1)+"B";
  if (n >= 1_000_000)     return (n/1_000_000).toFixed(1)+"M";
  if (n >= 1_000)         return (n/1_000).toFixed(0)+"K";
  return n.toLocaleString();
}

/**
 * FIX: parse "2024-09" → "Sep 24" bằng split string
 * KHÔNG dùng new Date("2024-09") → NaN-NaN / Invalid Date trên nhiều browser
 */
function safeLabel(str = "") {
  const s = String(str).slice(0, 7);        // "2024-09"
  const [y, m] = s.split("-");
  const mi = parseInt(m, 10);
  if (!y || isNaN(mi) || mi < 1 || mi > 12) return s || "—";
  return `${MON[mi - 1]} ${String(y).slice(2)}`;  // "Sep 24"
}

function addMonths(str = "", delta) {
  const [y, m] = str.slice(0, 7).split("-").map(Number);
  if (!y || !m) return str;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ══════════════════════════════════════════════
   SalaryChart  (Dashboard)
   data: [{ month: "2024-09", total_salary: 108500000 }, ...]
══════════════════════════════════════════════ */
export function SalaryChart({ data = [] }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    if (!data || data.length === 0) return;

    // Pad nếu ít điểm
    let pts = [...data];
    if (pts.length === 1) {
      pts = [
        { month: addMonths(pts[0].month, -2), total_salary: 0 },
        { month: addMonths(pts[0].month, -1), total_salary: 0 },
        pts[0],
        { month: addMonths(pts[0].month, +1), total_salary: 0 },
        { month: addMonths(pts[0].month, +2), total_salary: 0 },
      ];
    } else if (pts.length === 2) {
      pts = [
        { month: addMonths(pts[0].month, -1), total_salary: 0 },
        ...pts,
        { month: addMonths(pts[pts.length-1].month, +1), total_salary: 0 },
      ];
    }

    const labels = pts.map(d => safeLabel(d.month));          // ← FIX
    const totals = pts.map(d => d.total_salary ?? 0);
    const avgs   = totals.map(v => v ? Math.round(v / 10) : 0);

    const ctx  = canvasRef.current.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, NAVY_ALPHA);
    grad.addColorStop(1, "rgba(30,58,138,0)");

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Total Payroll", data: totals,
            borderColor: NAVY, borderWidth: 2.5,
            backgroundColor: grad, fill: true, tension: 0.4,
            pointBackgroundColor: NAVY, pointBorderColor: "#fff",
            pointBorderWidth: 2, pointRadius: 3, pointHoverRadius: 6,
          },
          {
            label: "Avg Salary", data: avgs,
            borderColor: CYAN, borderWidth: 2,
            backgroundColor: "transparent", fill: false, tension: 0.4,
            pointBackgroundColor: CYAN, pointBorderColor: "#fff",
            pointBorderWidth: 2, pointRadius: 3, pointHoverRadius: 5,
            borderDash: [5, 3],
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true, position: "top", align: "end",
            labels: { boxWidth: 20, boxHeight: 2, font: { size: 11 }, color: "#64748b", padding: 16, usePointStyle: true, pointStyle: "line" },
          },
          tooltip: {
            backgroundColor: "#1e293b", cornerRadius: 8, padding: 10,
            callbacks: {
              label: c => {
                const v = c.raw;
                if (!v) return ` ${c.dataset.label}: —`;
                return ` ${c.dataset.label}: ${v >= 1_000_000 ? (v/1_000_000).toFixed(1)+"M" : v.toLocaleString()} VND`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 }, color: "#94a3b8" } },
          y: { grid: { color: "rgba(219,234,254,.5)" }, border: { display: false }, ticks: { font: { size: 11 }, color: "#94a3b8", callback: v => fmtMoney(v) } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fffbeb", borderRadius: 8, border: "1px solid #fef3c7", padding: "8px 16px", fontSize: 11, color: "#d97706" }}>
          ⚠️ No payroll data — chart will populate after payroll records are created.
        </div>
      </div>
    );
  }
  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }}/>;
}

/* ══════════════════════════════════════════════
   DonutChart
══════════════════════════════════════════════ */
export function DonutChart({ data = [] }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    if (!data || data.length === 0) return;

    const total  = data.reduce((s, d) => s + (d.total_salary || 0), 0);
    const labels = data.map(d => d.department || d.DepartmentName || "");
    const values = total > 0
      ? data.map(d => Math.round(((d.total_salary || 0) / total) * 100))
      : data.map(() => Math.round(100 / data.length));

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: DONUT_COLORS.slice(0, labels.length), borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#1e293b", cornerRadius: 8, padding: 10, callbacks: { label: c => `${c.label}: ${c.raw}%` } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#94a3b8" }}>
        No data
      </div>
    );
  }
  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }}/>;
}

/* ══════════════════════════════════════════════
   DonutLegend
══════════════════════════════════════════════ */
export function DonutLegend({ data = [] }) {
  if (!data || data.length === 0) {
    return <div style={{ flex: 1, display:"flex", alignItems:"center", fontSize:11, color:"#94a3b8" }}>No departments</div>;
  }
  const total = data.reduce((s, d) => s + (d.total_salary || 0), 0);
  return (
    <div style={{ flex: 1, overflowY: "auto", maxHeight: 120 }}>
      {data.map((d, i) => {
        const pct   = total > 0 ? Math.round(((d.total_salary||0)/total)*100) : Math.round(100/data.length);
        const label = d.department || d.DepartmentName || "";
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", borderBottom:"1px solid #f1f5f9" }}>
            <div style={{ width:8, height:8, borderRadius:2, flexShrink:0, background:DONUT_COLORS[i%DONUT_COLORS.length] }}/>
            <span style={{ flex:1, fontSize:11.5, color:"#64748b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</span>
            <b style={{ fontSize:11.5, color:"#334155", flexShrink:0 }}>{pct}%</b>
          </div>
        );
      })}
    </div>
  );
}