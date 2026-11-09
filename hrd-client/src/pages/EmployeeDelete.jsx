
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import { MdArrowBack, MdDelete, MdWarning, MdCheck, MdClose } from "react-icons/md";
import { getEmployeeDetail, deleteEmployee } from "../services/employeeApi";

const GRAD = [
  "from-blue-500 to-blue-400","from-green-500 to-green-400",
  "from-amber-500 to-amber-400","from-purple-500 to-purple-400",
];

function Toast({ msg, type }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5
                     px-4 py-3 rounded-xl shadow-xl text-white text-[13px] font-medium
                     min-w-[260px] animate-[slideUp_.3s_ease]
                     ${type === "success"
                       ? "bg-gray-900 border-l-4 border-green-400"
                       : "bg-gray-900 border-l-4 border-red-400"}`}>
      {type === "success" ? "✅" : "❌"} {msg}
    </div>
  );
}

export default function EmployeeDelete() {
  const navigate   = useNavigate();
  const { id }     = useParams();

  const [emp,      setEmp]     = useState(null);
  const [loading,  setLoading] = useState(true);
  const [deleting, setDeleting]= useState(false);
  const [confirm,  setConfirm] = useState("");   
  const [toast,    setToast]   = useState(null);
  const [blocked,  setBlocked] = useState(false); 

  useEffect(() => {
    const load = async () => {
      const data = await getEmployeeDetail(id);
      setEmp(data);
      setLoading(false);
    };
    load();
  }, [id]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* FR6: DELETE /employees/:id — blocked if salary/dividend exists */
  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteEmployee(id);
    setDeleting(false);

    if (res?.error) {
      // FR6: constraint block
      if (res.error.toLowerCase().includes("salary") ||
          res.error.toLowerCase().includes("dividend") ||
          res.error.toLowerCase().includes("constraint") ||
          res.error.toLowerCase().includes("blocked")) {
        setBlocked(true);
        showToast("Delete blocked: employee has existing records.", "error");
      } else {
        showToast(res.error, "error");
      }
    } else {
      showToast("Employee deleted from both databases ✓", "success");
      setTimeout(() => navigate("/employees"), 1500);
    }
  };

  const name    = emp?.FullName    ?? emp?.name    ?? "";
  const dept    = emp?.DepartmentName ?? emp?.department ?? "—";
  const pos     = emp?.PositionName   ?? emp?.position   ?? "—";
  const status  = emp?.Status      ?? emp?.status  ?? "Active";
  const hire    = emp?.HireDate    ?? emp?.hireDate ?? "—";
  const initials= name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "?";
  const canDelete = confirm.trim().toLowerCase() === name.toLowerCase() && !blocked;

  if (loading) return (
    <div className="flex h-screen w-screen items-center justify-center
                    bg-[#f0f6ff] font-['Inter',sans-serif]">
      <div className="flex items-center gap-2 text-blue-400">
        <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span className="text-[14px] font-medium">Loading...</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden font-['Inter',sans-serif]">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar/>
        <main className="flex-1 overflow-y-auto bg-[#f0f6ff] p-5
                         [&::-webkit-scrollbar]:w-1
                         [&::-webkit-scrollbar-thumb]:bg-blue-200
                         flex items-start justify-center">

          <div className="w-full max-w-2xl mt-6">

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => navigate("/employees")}
                      className="w-9 h-9 rounded-lg bg-white border border-blue-200
                                 flex items-center justify-center text-[#1e3a8a]
                                 hover:bg-blue-50 transition-all">
                <MdArrowBack size={18}/>
              </button>
              <div>
                <h1 className="text-[20px] font-black text-gray-900">Delete Employee</h1>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  UC.04 · FR6 — Constraint validation before deletion
                </p>
              </div>
            </div>

            {/* FR6 Block Warning */}
            {blocked && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4
                              flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center
                                justify-center flex-shrink-0 mt-0.5">
                  <MdClose size={18} className="text-red-600"/>
                </div>
                <div>
                  
                  <p className="text-[12.5px] text-red-600 leading-relaxed">
                    This employee cannot be deleted because they have existing{" "}
                    <b>salary records</b> in <code className="bg-red-100 px-1 rounded">
                    PAYROLL.salaries</code> or <b>dividend records</b> in{" "}
                    <code className="bg-red-100 px-1 rounded">HUMAN_2025.Dividends</code>.
                    <br/>Remove those records first before deleting the employee.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br
                                 ${GRAD[0]} flex items-center justify-center
                                 text-white text-2xl font-black flex-shrink-0`}>
                  {initials}
                </div>
                <div className="flex-1">
                  <div className="text-[17px] font-black text-gray-900">{name}</div>
                  <div className="text-[12.5px] text-gray-400 mt-0.5">#{id}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700
                                     rounded-full text-[11px] font-semibold">{dept}</span>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600
                                     rounded-full text-[11px] font-semibold">{pos}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold
                      ${status === "Active"
                        ? "bg-green-100 text-green-700"
                        : status === "On Leave"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"}`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
                {[
                  ["Email",     emp?.Email ?? emp?.email ?? "—"],
                  ["Phone",     emp?.PhoneNumber ?? emp?.phone ?? "—"],
                  ["Hire Date", hire],
                ].map(([k, v]) => (
                  <div key={k} className="text-center">
                    <div className="text-[10.5px] text-gray-400 font-medium mb-1">{k}</div>
                    <div className="text-[12.5px] font-semibold text-gray-700 truncate">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
              <div className="text-[12.5px] font-bold text-gray-800 mb-3">
                The following records will be deleted:
              </div>
              <div className="space-y-2">
                {[
                  { db:"HUMAN_2025 (SQL Server)", table:"Employees", color:"text-blue-600" },
                  { db:"PAYROLL (MySQL)", table:"employees_payroll", color:"text-green-600" },
                ].map(r => (
                  <div key={r.table}
                       className="flex items-center gap-2.5 p-3 bg-gray-50
                                  rounded-lg border border-gray-100">
                    <MdDelete size={15} className="text-red-400 flex-shrink-0"/>
                    <span className="text-[12.5px] text-gray-600">
                      <b className={r.color}>{r.db}</b> · {r.table}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <div className="flex items-start gap-2.5">
                <MdWarning size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                <div>
                  <div className="text-[13px] font-bold text-amber-700 mb-1">
                    FR6 — Constraint Check
                  </div>
                  <p className="text-[12px] text-amber-600 leading-relaxed">
                    Delete will be <b>automatically blocked</b> if this employee has:
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[12px] text-amber-600 list-disc list-inside">
                    <li>Salary records in <b>PAYROLL.salaries</b></li>
                    <li>Dividend records in <b>HUMAN_2025.Dividends</b></li>
                  </ul>
                </div>
              </div>
            </div>

            {!blocked && (
              <div className="bg-white rounded-xl shadow-sm p-5 mb-5">
                <div className="text-[13px] font-semibold text-gray-700 mb-2">
                  Type <b className="text-red-600">"{name}"</b> to confirm deletion:
                </div>
                <input
                  type="text"
                  placeholder={`Type "${name}" to confirm`}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-[13px]
                              text-gray-800 outline-none transition-all
                              ${canDelete
                                ? "border-green-400 bg-green-50 focus:shadow-[0_0_0_3px_rgba(34,197,94,.15)]"
                                : "border-blue-100 bg-blue-50 focus:border-blue-400"}`}
                />
                {confirm && (
                  <div className={`flex items-center gap-1.5 mt-2 text-[12px] font-medium
                    ${canDelete ? "text-green-600" : "text-red-500"}`}>
                    {canDelete
                      ? <><MdCheck size={14}/> Name matches — you can proceed</>
                      : <><MdClose size={14}/> Name does not match</>
                    }
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => navigate("/employees")}
                      className="flex-1 py-3 rounded-xl border border-blue-200 bg-white
                                 text-[#1e3a8a] text-[13.5px] font-bold
                                 hover:bg-blue-50 transition-all">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleting || blocked}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                           bg-red-600 text-white text-[13.5px] font-bold
                           hover:bg-red-700 transition-all active:scale-95
                           disabled:opacity-40 disabled:cursor-not-allowed">
                <MdDelete size={16}/>
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>

          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}