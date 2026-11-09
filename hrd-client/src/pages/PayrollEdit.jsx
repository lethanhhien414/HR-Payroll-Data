

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdArrowBack, MdSave, MdRefresh,
  MdPerson, MdAttachMoney, MdRemoveCircle,
  MdCardGiftcard, MdCheckCircle, MdWarning,
  MdPayments, MdBusiness,
} from "react-icons/md";
import { getEmployeeDetail } from "../services/employeeApi";
import { getPayrollDetail, calculatePayroll } from "../services/payrollApi";

const C = {
  navy:    "#1e3a8a",
  blue600: "#2563eb",
  blue500: "#3b82f6",
  blue200: "#bfdbfe",
  blue100: "#dbeafe",
  blue50:  "#eff6ff",
  gray900: "#0f172a",
  gray800: "#1e293b",
  gray700: "#334155",
  gray500: "#64748b",
  gray400: "#94a3b8",
  gray300: "#cbd5e1",
  green:   "#16a34a",
  greenLt: "#dcfce7",
  amber:   "#d97706",
  amberLt: "#fef3c7",
  red:     "#dc2626",
  redLt:   "#fee2e2",
};

const fmtVND = v => Number(v || 0).toLocaleString("vi-VN") + " ₫";
const fmtNum = v => Number(v || 0).toLocaleString("vi-VN");

/* ══════════════════════════════════════════
   INPUT — navy-blue focus ring
══════════════════════════════════════════ */
function Input({ value, onChange, type = "text", placeholder, min, step, error, disabled }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      disabled={disabled}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
        border: `1.5px solid ${error ? C.red : focus ? C.navy : C.blue100}`,
        background: error ? C.redLt : focus ? "#fff" : C.blue50,
        color: C.gray800, outline: "none", fontFamily: "inherit",
        boxSizing: "border-box",
        boxShadow: focus ? `0 0 0 3px ${C.navy}18` : "none",
        transition: "all .15s",
        opacity: disabled ? .6 : 1,
        cursor: disabled ? "not-allowed" : "text",
      }}
    />
  );
}

/* ══════════════════════════════════════════
   FIELD WRAPPER
══════════════════════════════════════════ */
function Field({ label, icon: Icon, children, note, error }) {
  return (
    <div>
      <label style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 12, fontWeight: 700, color: C.gray700, marginBottom: 6,
        textTransform: "uppercase", letterSpacing: .4,
      }}>
        {Icon && <Icon size={12} style={{ color: C.navy }}/>}
        {label}
      </label>
      {children}
      {note  && <p style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>{note}</p>}
      {error && <p style={{ fontSize: 11, color: C.red,    marginTop: 4 }}>{error}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════
   STAT CARD — matches Dashboard KPI style
══════════════════════════════════════════ */
function StatCard({ label, value, sub, color1, color2, icon: Icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "14px 18px",
      position: "relative", overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,.06)",
    }}>
      {/* bottom gradient bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg,${color1},${color2})`,
        borderRadius: "0 0 14px 14px",
      }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: `${color1}18`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={15} style={{ color: color1 }}/>
        </div>
        <span style={{ fontSize: 11, color: C.gray500, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: .4 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.navy,
        lineHeight: 1, letterSpacing: -.5 }}>
        {value ?? "—"}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════
   SECTION HEADER — matches Dashboard style
══════════════════════════════════════════ */
function SectionHead({ icon: Icon, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10,
      marginBottom: 16, paddingBottom: 12,
      borderBottom: `1px solid ${C.blue100}` }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: C.navy,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={14} color="#fff"/>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gray900 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   VALIDATION ITEM
══════════════════════════════════════════ */
function ValidItem({ label, ok }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      padding: "6px 0", borderBottom: `1px solid ${C.blue50}` }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        background: ok ? C.greenLt : "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {ok
          ? <MdCheckCircle size={12} style={{ color: C.green }}/>
          : <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gray300 }}/>
        }
      </div>
      <span style={{ fontSize: 12, color: ok ? C.gray700 : C.gray400, fontWeight: ok ? 500 : 400 }}>
        {label}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 12, minWidth: 280,
      background: "#0f172a",
      borderLeft: `4px solid ${type === "success" ? "#22c55e" : C.red}`,
      boxShadow: "0 8px 30px rgba(0,0,0,.25)",
    }}>
      <span style={{ fontSize: 15 }}>{type === "success" ? "✓" : "✕"}</span>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{msg}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   EMPLOYEE AVATAR
══════════════════════════════════════════ */
function EmpAvatar({ name, size = 48 }) {
  const initials = (name || "?").split(" ").filter(Boolean)
    .map(w => w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22, flexShrink: 0,
      background: `linear-gradient(135deg,${C.navy},${C.blue500})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color: "#fff",
      boxShadow: `0 4px 14px ${C.navy}44`,
    }}>
      {initials}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function PayrollEdit() {
  const navigate = useNavigate();
  const { id }   = useParams(); // EmployeeID

  const [emp,      setEmp]      = useState(null);
  const [form,     setForm]     = useState({
    EmployeeID:  id,
    SalaryMonth: new Date().toISOString().slice(0, 7),
    BaseSalary:  "",
    Bonus:       "0",
    Deductions:  "0",
  });
  const [original, setOriginal] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [changed,  setChanged]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [toast,    setToast]    = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [empData, payData] = await Promise.all([
        getEmployeeDetail(id),
        getPayrollDetail(id),
      ]);
      if (empData) setEmp(empData);
      if (payData) {
        const f = {
          EmployeeID:  id,
          SalaryMonth: (payData.SalaryMonth ?? payData.salary_month ?? "").slice(0, 7),
          BaseSalary:  String(payData.BaseSalary  ?? payData.base_salary  ?? ""),
          Bonus:       String(payData.Bonus       ?? payData.bonus        ?? "0"),
          Deductions:  String(payData.Deductions  ?? payData.deductions   ?? "0"),
        };
        setForm(f);
        setOriginal(f);
      }
      setLoading(false);
    })();
  }, [id]);

  const onChange = (field, val) => {
    setForm(prev => {
      const next = { ...prev, [field]: val };
      setChanged(JSON.stringify(next) !== JSON.stringify(original));
      return next;
    });
    setErrors(e => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.BaseSalary || isNaN(Number(form.BaseSalary)) || Number(form.BaseSalary) <= 0)
      e.BaseSalary = "Base salary must be a positive number";
    if (form.Bonus && isNaN(Number(form.Bonus)))
      e.Bonus = "Bonus must be a number";
    if (form.Deductions && isNaN(Number(form.Deductions)))
      e.Deductions = "Deductions must be a number";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const netSalary    = Number(form.BaseSalary || 0) + Number(form.Bonus || 0) - Number(form.Deductions || 0);
  const allValid     = !!id && Number(form.BaseSalary) > 0 && Number(form.Bonus) >= 0
                    && Number(form.Deductions) >= 0 && netSalary > 0 && !!form.SalaryMonth;
  const bonusPct     = form.BaseSalary ? ((Number(form.Bonus || 0) / Number(form.BaseSalary)) * 100).toFixed(1) : 0;
  const deductPct    = form.BaseSalary ? ((Number(form.Deductions || 0) / Number(form.BaseSalary)) * 100).toFixed(1) : 0;

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const res = await calculatePayroll({
      EmployeeID:  Number(id),
      SalaryMonth: form.SalaryMonth + "-01",
      BaseSalary:  Number(form.BaseSalary),
      Bonus:       Number(form.Bonus      || 0),
      Deductions:  Number(form.Deductions || 0),
    });
    setSaving(false);
    if (res?.error) {
      showToast(res.error, "error");
    } else {
      showToast("Payroll saved to PAYROLL.salaries ✓", "success");
      setOriginal(form);
      setChanged(false);
      setTimeout(() => navigate("/payroll"), 1400);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const name   = emp?.FullName       ?? emp?.name       ?? "—";
  const dept   = emp?.DepartmentName ?? emp?.department  ?? "—";
  const pos    = emp?.PositionName   ?? emp?.position    ?? "—";
  const status = emp?.Status         ?? emp?.status      ?? "—";

  if (loading) return (
    <div style={{
      display: "flex", width: "100%", height: "100vh",
      alignItems: "center", justifyContent: "center",
      background: "#f0f6ff", fontFamily: "'Inter',sans-serif",
      flexDirection: "column", gap: 12, color: C.gray500,
    }}>
      <div style={{
        width: 32, height: 32, border: `3px solid ${C.blue200}`,
        borderTopColor: C.navy, borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}/>
      <span style={{ fontSize: 13 }}>Loading payroll data...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{
      display: "flex", width: "100%", height: "100vh",
      overflow: "hidden", fontFamily: "'Inter',sans-serif",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <Sidebar/>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar/>

        <main style={{
          flex: 1, overflowY: "auto", background: "#f0f6ff",
          padding: "14px 16px",
          scrollbarWidth: "thin", scrollbarColor: "#dbeafe transparent",
        }}>

          <div style={{ display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => navigate("/payroll")}
                style={{
                  width: 34, height: 34, borderRadius: 8, background: "#fff",
                  border: `1.5px solid ${C.blue100}`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: C.navy, cursor: "pointer",
                }}
              >
                <MdArrowBack size={17}/>
              </button>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: C.navy,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <MdPayments size={17} color="#fff"/>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.gray900, letterSpacing: -.3 }}>
                    Update Payroll Details
                  </div>
                </div>

              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {changed && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px",
                  borderRadius: 20, background: C.amberLt, color: C.amber,
                  border: `1px solid #fcd34d`,
                }}>
                  ⚠ Unsaved changes
                </span>
              )}
              <button
                onClick={() => { setForm(original); setChanged(false); setErrors({}); }}
                disabled={!changed}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: "#fff", color: C.navy, border: `1.5px solid ${C.blue100}`,
                  cursor: changed ? "pointer" : "not-allowed",
                  opacity: changed ? 1 : .45, fontFamily: "inherit",
                }}
              >
                <MdRefresh size={13}/> Reset
              </button>
              <button
                onClick={() => navigate("/payroll")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: "#fff", color: C.gray500, border: `1.5px solid ${C.gray300}`,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !changed}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700,
                  background: C.navy, color: "#fff", border: "none",
                  cursor: (saving || !changed) ? "not-allowed" : "pointer",
                  opacity: (saving || !changed) ? .55 : 1, fontFamily: "inherit",
                }}
              >
                <MdSave size={14}/>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            <StatCard
              label="Base Salary" icon={MdAttachMoney}
              value={form.BaseSalary ? fmtNum(form.BaseSalary) + " ₫" : "—"}
              sub="Monthly base"
              color1="#3b82f6" color2="#93c5fd"
            />
            <StatCard
              label="Bonus" icon={MdCardGiftcard}
              value={fmtNum(form.Bonus || 0) + " ₫"}
              sub={bonusPct > 0 ? `+${bonusPct}% of base` : "No bonus"}
              color1="#16a34a" color2="#4ade80"
            />
            <StatCard
              label="Deductions" icon={MdRemoveCircle}
              value={fmtNum(form.Deductions || 0) + " ₫"}
              sub={deductPct > 0 ? `${deductPct}% of base` : "No deductions"}
              color1="#dc2626" color2="#f87171"
            />
            <StatCard
              label="Net Salary" icon={MdPayments}
              value={fmtNum(netSalary) + " ₫"}
              sub="Base + Bonus − Deductions"
              color1={C.navy} color2="#3b82f6"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              <div style={{
                background: "#fff", borderRadius: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: "16px 20px",
              }}>
                <SectionHead icon={MdPerson} title="Employee Information"
                  sub="Source: HUMAN_2025 (SQL Server)"/>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <EmpAvatar name={name} size={52}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.gray900, marginBottom: 4 }}>
                      {name}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 11, padding: "2px 9px", borderRadius: 20,
                        background: C.blue50, color: C.navy, fontWeight: 600,
                      }}>
                        #{String(id).padStart(3,"0")}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 9px", borderRadius: 20,
                        background: C.blue50, color: C.gray500,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <MdBusiness size={11}/> {dept}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 9px", borderRadius: 20,
                        background: status === "Đang làm việc" ? C.greenLt : C.amberLt,
                        color: status === "Đang làm việc" ? C.green : C.amber, fontWeight: 600,
                      }}>
                        {status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.gray400, marginTop: 6 }}>
                      {pos}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: "#fff", borderRadius: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: "16px 20px",
              }}>
                <SectionHead icon={MdPayments} title="Payroll Information"
                  sub="Write to PAYROLL.salaries (MySQL)"/>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                  <div style={{ gridColumn: "span 2" }}>
                    <Field label="Salary Month" icon={MdPayments}>
                      <Input
                        type="month"
                        value={form.SalaryMonth}
                        onChange={v => onChange("SalaryMonth", v)}
                      />
                      <p style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>
                        Month recorded in PAYROLL.salaries
                      </p>
                    </Field>
                  </div>

                  <Field label="Base Salary (₫) *" icon={MdAttachMoney} error={errors.BaseSalary}>
                    <Input
                      type="number" min="0" step="100000"
                      placeholder="e.g. 12000000"
                      value={form.BaseSalary}
                      onChange={v => onChange("BaseSalary", v)}
                      error={errors.BaseSalary}
                    />
                    {form.BaseSalary && !errors.BaseSalary && (
                      <p style={{ fontSize: 11, color: C.blue600, marginTop: 4, fontWeight: 600 }}>
                        = {fmtVND(form.BaseSalary)}
                      </p>
                    )}
                  </Field>

                  <Field label="Bonus (₫)" icon={MdCardGiftcard} error={errors.Bonus}>
                    <Input
                      type="number" min="0" step="100000"
                      placeholder="e.g. 500000"
                      value={form.Bonus}
                      onChange={v => onChange("Bonus", v)}
                      error={errors.Bonus}
                    />
                    {Number(form.Bonus) > 0 && (
                      <p style={{ fontSize: 11, color: C.green, marginTop: 4, fontWeight: 600 }}>
                        + {fmtVND(form.Bonus)}
                      </p>
                    )}
                  </Field>

                  <div style={{ gridColumn: "span 2" }}>
                    <Field label="Deductions (₫)" icon={MdRemoveCircle}
                           note="Insurance, PIT, disciplinary deductions..."
                           error={errors.Deductions}>
                      <Input
                        type="number" min="0" step="100000"
                        placeholder="e.g. 200000"
                        value={form.Deductions}
                        onChange={v => onChange("Deductions", v)}
                        error={errors.Deductions}
                      />
                      {Number(form.Deductions) > 0 && (
                        <p style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 600 }}>
                          − {fmtVND(form.Deductions)}
                        </p>
                      )}
                    </Field>
                  </div>
                </div>

                <div style={{
                  marginTop: 16, padding: "10px 14px",
                  background: C.blue50, border: `1px solid ${C.blue100}`,
                  borderRadius: 9, fontSize: 12, color: C.navy,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <MdPayments size={14} style={{ flexShrink: 0 }}/>
                  <span>
                    <b>Formula:</b> Net = BaseSalary + Bonus − Deductions
                    → <code style={{ background: C.blue100, padding: "1px 6px",
                      borderRadius: 4, fontSize: 11 }}>
                      POST /api/payroll/calculate
                    </code>
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              <div style={{
                background: `linear-gradient(135deg,${C.navy},${C.blue500})`,
                borderRadius: 14, padding: "18px 20px", color: "#fff",
                boxShadow: `0 8px 24px ${C.navy}44`,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)",
                  textTransform: "uppercase", letterSpacing: .7, marginBottom: 6,
                }}>
                  Net Salary Preview
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -.8, lineHeight: 1.1 }}>
                  {fmtNum(netSalary)}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginBottom: 18 }}>
                  ₫ / month · {form.SalaryMonth || "—"}
                </div>

                {[
                  { label: "Base Salary",  value: fmtNum(form.BaseSalary || 0), color: "rgba(255,255,255,.9)", sign: "" },
                  { label: "+ Bonus",      value: fmtNum(form.Bonus || 0),      color: "#86efac",              sign: "+" },
                  { label: "− Deductions", value: fmtNum(form.Deductions || 0), color: "#fca5a5",              sign: "−" },
                ].map(({ label, value, color, sign }) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "7px 0",
                    borderBottom: "1px solid rgba(255,255,255,.1)",
                    fontSize: 12,
                  }}>
                    <span style={{ color: "rgba(255,255,255,.6)" }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{sign}{value} ₫</span>
                  </div>
                ))}

                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  paddingTop: 10, marginTop: 2, fontSize: 14,
                }}>
                  <span style={{ fontWeight: 700, color: "#fff" }}>= Net Salary</span>
                  <span style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>
                    {fmtNum(netSalary)} ₫
                  </span>
                </div>
              </div>

              <div style={{
                background: "#fff", borderRadius: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: "16px 18px",
              }}>
                <SectionHead icon={MdPayments} title="Database Info" sub="Write target"/>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    ["Write to",    "PAYROLL.salaries"],
                    ["DB Engine",   "MySQL"],
                    ["Employee ID", `#${String(id).padStart(3,"0")}`],
                    ["Month",       form.SalaryMonth || "—"],
                    ["Use Case",    "UC.05 · FR10"],
                  ].map(([k, v]) => (
                    <div key={k} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "8px 0", borderBottom: `1px solid ${C.blue50}`,
                    }}>
                      <span style={{ fontSize: 12, color: C.gray400, fontWeight: 500 }}>{k}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.gray700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                background: "#fff", borderRadius: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: "16px 18px",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 12, paddingBottom: 10,
                  borderBottom: `1px solid ${C.blue100}`,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: allValid ? C.greenLt : C.blue50,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {allValid
                      ? <MdCheckCircle size={16} style={{ color: C.green }}/>
                      : <MdWarning size={16} style={{ color: C.amber }}/>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.gray900 }}>
                      Validation
                    </div>
                    <div style={{ fontSize: 11, color: allValid ? C.green : C.amber, marginTop: 1 }}>
                      {allValid ? "All checks passed" : "Incomplete"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <ValidItem label="EmployeeID set"     ok={!!id}/>
                  <ValidItem label="Base Salary > 0"    ok={Number(form.BaseSalary) > 0}/>
                  <ValidItem label="Bonus ≥ 0"          ok={Number(form.Bonus) >= 0}/>
                  <ValidItem label="Deductions ≥ 0"     ok={Number(form.Deductions) >= 0}/>
                  <ValidItem label="Net Salary > 0"     ok={netSalary > 0}/>
                  <ValidItem label="Salary month set"   ok={!!form.SalaryMonth}/>
                  <ValidItem label="Has unsaved changes" ok={changed}/>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}