
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate }       from "react-router-dom";
import { Chart, registerables }         from "chart.js";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdArrowBack, MdPayments, MdTrendingUp,
  MdTrendingDown, MdTrendingFlat,
} from "react-icons/md";
import { getPayrollHistory } from "../services/payrollApi";

Chart.register(...registerables);

const fmtVND = v => {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  return n.toLocaleString();
};

const fmtMonth = s => s?.slice(0, 7) || "—";

/* ── Mini Stat Card ── */
function StatCard({ label, value, color = "#2563eb", icon: Icon, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={15} style={{ color }} />}
        <p className="text-[11px] text-gray-400 font-medium">{label}</p>
      </div>
      <p className="text-[20px] font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SalaryChart({ data }) {
  const ref  = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    inst.current?.destroy();

    inst.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: [...data].reverse().map(d => fmtMonth(d.SalaryMonth)),
        datasets: [
          {
            label: "Net Salary (VND)",
            data:  [...data].reverse().map(d => Number(d.NetSalary || 0)),
            borderColor:     "#2563eb",
            backgroundColor: "rgba(37,99,235,.07)",
            borderWidth: 2.5, fill: true, tension: 0.4,
            pointBackgroundColor: "#2563eb",
            pointRadius: 5, pointHoverRadius: 7,
          },
          {
            label: "Base Salary (VND)",
            data:  [...data].reverse().map(d => Number(d.BaseSalary || 0)),
            borderColor:     "#94a3b8",
            borderDash:      [5, 5],
            backgroundColor: "transparent",
            borderWidth: 1.5, fill: false, tension: 0.4,
            pointRadius: 3, pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true, position: "top", align: "end",
            labels: { font: { size: 11, family: "'Inter',sans-serif" },
                      boxWidth: 16, boxHeight: 2, padding: 14 },
          },
          tooltip: {
            backgroundColor: "#1e293b",
            cornerRadius: 8,
            padding: 10,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${fmtVND(ctx.raw)} VND`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 11, family: "'Inter',sans-serif" } },
          },
          y: {
            grid: { color: "rgba(219,234,254,.6)" },
            border: { display: false },
            ticks: {
              font: { size: 11, family: "'Inter',sans-serif" },
              callback: v => fmtVND(v),
            },
          },
        },
      },
    });

    return () => inst.current?.destroy();
  }, [data]);

  if (!data.length) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-[13px]">
      Chưa có dữ liệu lương
    </div>
  );

  return <canvas ref={ref} style={{ width: "100%", height: "100%" }} />;
}

/* ════════════════════════════════════
   MAIN
════════════════════════════════════ */
export default function SalaryHistory() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [empName, setEmpName] = useState("");

  useEffect(() => {
    if (!id) return;
    getPayrollHistory(id)
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        if (list[0]?.FullName) setEmpName(list[0].FullName);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [id]);

  const nets = rows.map(r => Number(r.NetSalary || 0));
  const maxNet  = nets.length ? Math.max(...nets) : 0;
  const minNet  = nets.length ? Math.min(...nets) : 0;
  const avgNet  = nets.length ? nets.reduce((s, v) => s + v, 0) / nets.length : 0;
  const latest  = rows[0]  ? Number(rows[0].NetSalary  || 0) : 0;
  const prev    = rows[1]  ? Number(rows[1].NetSalary  || 0) : 0;
  const delta   = latest && prev ? ((latest - prev) / prev * 100).toFixed(1) : null;

  const TrendIcon = !delta ? MdTrendingFlat
                 : Number(delta) > 0 ? MdTrendingUp
                 : MdTrendingDown;
  const trendColor = !delta ? "#94a3b8"
                   : Number(delta) > 0 ? "#16a34a" : "#dc2626";

  const TH = ({ children }) => (
    <th className="text-[11px] font-bold text-blue-600 uppercase tracking-wide
                   bg-blue-50 border-b-[1.5px] border-blue-100 px-4 py-2.5
                   text-left whitespace-nowrap sticky top-0 z-10">
      {children}
    </th>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden"
         style={{ fontFamily: "'Inter',sans-serif" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar />

        <main className="flex-1 overflow-y-auto bg-[#f0f6ff] p-5
                         [&::-webkit-scrollbar]:w-1
                         [&::-webkit-scrollbar-thumb]:bg-blue-200">

          <div className="flex items-center justify-between mb-5">
            <div>
              <button
                onClick={() => navigate("/payroll")}
                className="flex items-center gap-1.5 text-[13px] font-semibold
                           text-blue-600 hover:text-blue-800 mb-1 transition-colors"
              >
                <MdArrowBack size={16}/> Quay lại Payroll
              </button>
              <h1 className="text-[20px] font-black text-gray-900 tracking-tight">
                Salary History
                {empName && (
                  <span className="ml-2 text-[16px] font-semibold text-blue-600">
                    — {empName}
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                CS5 §3.3 · Employee #{String(id).padStart(3,"0")} · PAYROLL.salaries
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-blue-400">
              <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span className="text-[14px]">Đang tải lịch sử lương...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="text-5xl mb-4">💰</div>
              <p className="text-[15px] font-semibold mb-1">Chưa có dữ liệu lương</p>
              <p className="text-[13px] mb-4">
                Nhân viên #{id} chưa có bản ghi nào trong PAYROLL.salaries
              </p>
              <button onClick={() => navigate("/attendance")}
                      className="px-5 py-2 rounded-xl bg-[#1e3a8a] text-white
                                 text-[13px] font-semibold hover:bg-[#1e40af] transition-all">
                Đi tới Attendance → rồi tính lương
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3 mb-5">
                <StatCard
                  label="Lương mới nhất"
                  value={fmtVND(latest) + " VND"}
                  color="#2563eb"
                  icon={MdPayments}
                  sub={rows[0]?.SalaryMonth?.slice(0,7)}
                />
                <StatCard
                  label="Xu hướng (so tháng trước)"
                  value={delta ? `${Number(delta) > 0 ? "+" : ""}${delta}%` : "N/A"}
                  color={trendColor}
                  icon={TrendIcon}
                  sub={prev ? `Tháng trước: ${fmtVND(prev)}` : "Chưa đủ dữ liệu"}
                />
                <StatCard
                  label="Lương cao nhất"
                  value={fmtVND(maxNet) + " VND"}
                  color="#16a34a"
                  icon={MdTrendingUp}
                />
                <StatCard
                  label="Lương trung bình"
                  value={fmtVND(Math.round(avgNet)) + " VND"}
                  color="#7c3aed"
                  icon={MdTrendingFlat}
                  sub={`Trên ${rows.length} tháng`}
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <MdTrendingUp size={18} style={{ color: "#1e3a8a" }}/>
                  <h2 className="text-[14px] font-bold" style={{ color: "#1e3a8a" }}>
                    Biểu đồ xu hướng lương
                  </h2>
                  <span className="text-[11px] text-gray-400 ml-1">
                    ({rows.length} tháng)
                  </span>
                </div>
                <div style={{ height: 220 }}>
                  <SalaryChart data={rows} />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-blue-50">
                  <h2 className="text-[14px] font-bold" style={{ color: "#1e3a8a" }}>
                    Chi tiết từng tháng
                  </h2>
                </div>
                <div className="overflow-x-auto overflow-y-auto"
                     style={{ maxHeight: "calc(100vh - 560px)" }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <TH>#</TH>
                        <TH>Tháng</TH>
                        <TH>Lương cơ bản</TH>
                        <TH>Bonus</TH>
                        <TH>Khấu trừ</TH>
                        <TH>Thực lĩnh</TH>
                        <TH>So tháng trước</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const net      = Number(row.NetSalary  || 0);
                        const prevNet  = rows[i + 1] ? Number(rows[i + 1].NetSalary || 0) : null;
                        const change   = prevNet ? ((net - prevNet) / prevNet * 100).toFixed(1) : null;
                        const isUp     = change && Number(change) > 0;
                        const isDown   = change && Number(change) < 0;

                        return (
                          <tr key={row.SalaryID ?? i}
                              className={`border-b border-blue-50 transition-colors
                                          ${i === 0
                                            ? "bg-blue-50"
                                            : "hover:bg-blue-50"}`}>
                            <td className="px-4 py-3 text-[11px] text-gray-400">
                              {i + 1}
                              {i === 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px]
                                                 font-bold bg-blue-600 text-white">
                                  MỚI
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 font-semibold text-[13px] text-gray-800">
                              {fmtMonth(row.SalaryMonth)}
                            </td>

                            <td className="px-4 py-3 text-[13px] text-gray-600">
                              {fmtVND(row.BaseSalary)} VND
                            </td>

                            <td className="px-4 py-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[11.5px]
                                               font-semibold bg-green-100 text-green-700">
                                +{fmtVND(row.Bonus)}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[11.5px]
                                               font-semibold bg-red-100 text-red-600">
                                -{fmtVND(row.Deductions)}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <span className="text-[14px] font-black" style={{ color: "#2563eb" }}>
                                {fmtVND(net)} VND
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {change === null ? (
                                <span className="text-[12px] text-gray-400">—</span>
                              ) : (
                                <span className={`flex items-center gap-1 text-[12px] font-semibold
                                                  ${isUp   ? "text-green-600"
                                                  : isDown ? "text-red-500"
                                                           : "text-gray-400"}`}>
                                  {isUp   ? <MdTrendingUp   size={14}/>
                                  : isDown ? <MdTrendingDown size={14}/>
                                           : <MdTrendingFlat size={14}/>}
                                  {isUp ? "+" : ""}{change}%
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2.5 border-t border-blue-50 text-[11px] text-gray-400">
                  {rows.length} bản ghi · Sắp xếp mới nhất trước
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}