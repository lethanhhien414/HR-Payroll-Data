
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdArrowBack, MdSave, MdWork, MdBusiness,
  MdAttachMoney, MdInfo, MdCheckCircle, MdWarning,
  MdDescription, MdSync,
} from "react-icons/md";
import { createPosition } from "../services/positionApi";

const C = {
  navy: "#1e3a8a", blue600: "#2563eb", blue500: "#3b82f6",
  blue200: "#bfdbfe", blue100: "#dbeafe", blue50: "#eff6ff",
  gray900: "#0f172a", gray800: "#1e293b", gray700: "#334155",
  gray500: "#64748b", gray400: "#94a3b8", gray300: "#cbd5e1",
  green: "#16a34a", greenLt: "#dcfce7",
  amber: "#d97706", amberLt: "#fef3c7",
  red: "#dc2626", redLt: "#fee2e2",
};

function Field({ label, icon: Icon, required, note, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 6,
      }}>
        {Icon && <Icon size={13} color={C.blue500}/>}
        {label}
        {required && <span style={{ color: C.red }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: 11, color: C.red, marginTop: 4,
        }}>
          <MdWarning size={11}/> {error}
        </div>
      )}
      {note && !error && (
        <div style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>{note}</div>
      )}
    </div>
  );
}

function StyledInput({ error, style = {}, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFocus(true); props.onFocus?.(e); }}
      onBlur={e  => { setFocus(false); props.onBlur?.(e); }}
      style={{
        width: "100%", padding: "9px 11px", borderRadius: 8,
        fontSize: 12.5, fontFamily: "inherit", color: C.gray800,
        border: `1.5px solid ${error ? C.red : focus ? C.blue600 : C.blue200}`,
        background: error ? "#fff5f5" : focus ? "#fff" : C.blue50,
        outline: "none", boxSizing: "border-box",
        boxShadow: focus && !error ? "0 0 0 3px rgba(37,99,235,.1)" : "none",
        transition: "all .15s",
        ...style,
      }}
    />
  );
}

function StyledTextarea({ error, style = {}, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      {...props}
      onFocus={e => { setFocus(true); props.onFocus?.(e); }}
      onBlur={e  => { setFocus(false); props.onBlur?.(e); }}
      style={{
        width: "100%", padding: "9px 11px", borderRadius: 8,
        fontSize: 12.5, fontFamily: "inherit", color: C.gray800,
        border: `1.5px solid ${error ? C.red : focus ? C.blue600 : C.blue200}`,
        background: error ? "#fff5f5" : focus ? "#fff" : C.blue50,
        outline: "none", boxSizing: "border-box", resize: "none",
        boxShadow: focus && !error ? "0 0 0 3px rgba(37,99,235,.1)" : "none",
        transition: "all .15s",
        ...style,
      }}
    />
  );
}

function StyledSelect({ error, style = {}, children, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <select
      {...props}
      onFocus={e => { setFocus(true); props.onFocus?.(e); }}
      onBlur={e  => { setFocus(false); props.onBlur?.(e); }}
      style={{
        width: "100%", padding: "9px 11px", borderRadius: 8,
        fontSize: 12.5, fontFamily: "inherit", color: C.gray800,
        border: `1.5px solid ${error ? C.red : focus ? C.blue600 : C.blue200}`,
        background: error ? "#fff5f5" : focus ? "#fff" : C.blue50,
        outline: "none", boxSizing: "border-box", cursor: "pointer",
        boxShadow: focus && !error ? "0 0 0 3px rgba(37,99,235,.1)" : "none",
        transition: "all .15s", appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
        paddingRight: 30,
        ...style,
      }}
    >
      {children}
    </select>
  );
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 10, fontWeight: 800, color: C.blue600,
      textTransform: "uppercase", letterSpacing: 1,
      paddingBottom: 10, marginBottom: 16,
      borderBottom: `1.5px solid ${C.blue50}`,
    }}>
      <Icon size={12}/> {label}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      boxShadow: "0 2px 8px rgba(0,0,0,.06)",
      padding: "20px 22px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 12,
      background: "#0f172a", color: "#fff",
      fontSize: 13, fontWeight: 600, minWidth: 260,
      borderLeft: `4px solid ${type === "success" ? "#22c55e" : C.red}`,
      boxShadow: "0 8px 24px rgba(0,0,0,.25)",
      animation: "slideUp .3s ease",
    }}>
      {type === "success" ? "✅" : "❌"} {msg}
    </div>
  );
}

export default function PositionAdd() {
  const navigate = useNavigate();
  const [form,    setForm]   = useState({
    PositionName: "", Department: "", MinSalary: "", Description: "",
  });
  const [errors,  setErrors] = useState({});
  const [loading, setLoading]= useState(false);
  const [toast,   setToast]  = useState(null);

  const onChange = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(e => ({ ...e, [f]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.PositionName.trim()) e.PositionName = "Position name is required";
    if (!form.Department)          e.Department   = "Department is required";
    if (!form.MinSalary)           e.MinSalary    = "Minimum salary is required";
    else if (isNaN(Number(form.MinSalary)) || Number(form.MinSalary) < 0)
                                   e.MinSalary    = "Must be a valid non-negative number";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const checks = [
    { label: "Position Name", done: !!form.PositionName.trim() },
    { label: "Department",    done: !!form.Department },
    { label: "Min Salary",    done: !!form.MinSalary && !isNaN(Number(form.MinSalary)) },
  ];
  const allDone = checks.every(c => c.done);

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const payload = { ...form, MinSalary: Number(form.MinSalary) };
    const res = await createPosition(payload);
    setLoading(false);
    if (res?.error) {
      setToast({ msg: res.error, type: "error" });
    } else {
      setToast({ msg: "Position created & synced to MySQL ✓", type: "success" });
      setTimeout(() => navigate("/positions"), 1200);
    }
    setTimeout(() => setToast(null), 3500);
  };

  // Preview avatar
  const initials = form.PositionName
    ? form.PositionName.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const isActive = !!form.Department && !!form.PositionName;

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100%",
      overflow: "hidden", fontFamily: "'Inter',sans-serif",
    }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-thumb { background:#dbeafe; border-radius:4px }
      `}</style>

      <Sidebar/>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Navbar/>
        <main style={{
          flex: 1, overflowY: "auto", background: "#f0f6ff",
          padding: "20px 24px", display: "flex", flexDirection: "column",
        }}>
          <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>

            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => navigate("/positions")}
                  style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: "#fff", border: `1.5px solid ${C.blue100}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.navy, cursor: "pointer", flexShrink: 0,
                  }}
                >
                  <MdArrowBack size={18}/>
                </button>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 900, color: C.gray900, margin: 0, letterSpacing: -.3 }}>
                    Add New Position
                  </h1>
                  <p style={{ fontSize: 11, color: C.gray400, margin: "3px 0 0" }}>
                    Insert HUMAN_2025 → Sync positions_payroll (MySQL) · FR8
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => navigate("/positions")}
                  style={{
                    padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${C.blue100}`, background: "#fff",
                    color: C.navy, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: C.navy, color: "#fff", border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? .7 : 1, fontFamily: "inherit",
                    transition: "transform .1s",
                  }}
                >
                  <MdSave size={14}/> {loading ? "Saving..." : "Save Position"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, alignItems: "start" }}>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                <Card>
                  <SectionTitle icon={MdWork} label="Position Information"/>
                  <Field label="Position Name" icon={MdWork} required error={errors.PositionName}>
                    <StyledInput
                      placeholder="e.g. Backend Developer, HR Manager..."
                      value={form.PositionName}
                      onChange={e => onChange("PositionName", e.target.value)}
                      error={errors.PositionName}
                      autoFocus
                    />
                  </Field>
                  <Field label="Department" icon={MdBusiness} required error={errors.Department}>
                    <StyledSelect
                      value={form.Department}
                      onChange={e => onChange("Department", e.target.value)}
                      error={errors.Department}
                    >
                      <option value="">-- Select Department --</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operations">Operations</option>
                      <option value="Sales">Sales</option>
                      <option value="Product">Product</option>
                      <option value="Legal">Legal</option>
                    </StyledSelect>
                  </Field>
                  <Field
                    label="Description" icon={MdDescription}
                    note="Optional — briefly describe this position's responsibilities."
                  >
                    <StyledTextarea
                      rows={3}
                      placeholder="Optional job description..."
                      value={form.Description}
                      onChange={e => onChange("Description", e.target.value)}
                    />
                  </Field>
                </Card>

                <Card>
                  <SectionTitle icon={MdAttachMoney} label="Salary Information"/>
                  <Field
                    label="Minimum Salary (USD)" icon={MdAttachMoney} required
                    note="Base minimum salary. Changes will affect payroll calculations."
                    error={errors.MinSalary}
                  >
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                        fontSize: 13, fontWeight: 700, color: C.gray400, pointerEvents: "none",
                      }}>$</span>
                      <StyledInput
                        type="number" min="0"
                        placeholder="3000"
                        value={form.MinSalary}
                        onChange={e => onChange("MinSalary", e.target.value)}
                        error={errors.MinSalary}
                        style={{ paddingLeft: 24 }}
                      />
                    </div>
                  </Field>
                  {form.MinSalary && Number(form.MinSalary) > 0 && (
                    <div style={{
                      background: C.amberLt, border: `1px solid #fde68a`,
                      borderRadius: 8, padding: "9px 12px",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}>
                      <MdWarning size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }}/>
                      <p style={{ fontSize: 11.5, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
                        Setting min salary to <b>${Number(form.MinSalary).toLocaleString()}</b> will affect payroll
                        calculations for all employees in this position.
                      </p>
                    </div>
                  )}
                </Card>

                <Card style={{ background: C.blue50, border: `1px solid ${C.blue100}` }}>
                  <SectionTitle icon={MdSync} label="System Sync Information"/>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { icon: "🗄️", label: "Primary DB", val: "HUMAN_2025.Positions (SQL Server)" },
                      { icon: "🔄", label: "Sync Target", val: "positions_payroll (MySQL)" },
                      { icon: "⚛️",  label: "Transaction", val: "Atomic — rollback on failure" },
                      { icon: "💰", label: "Payroll Impact", val: "Salary recalc triggered on save" },
                    ].map(({ icon, label, val }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        <span style={{ fontSize: 11, color: C.gray500, fontWeight: 600, minWidth: 110 }}>{label}</span>
                        <span style={{ fontSize: 11, color: C.gray700 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 0 }}>

                <Card>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 18,
                      background: `linear-gradient(135deg,#6d28d9,#a78bfa)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 900, color: "#fff",
                      margin: "0 auto 10px", letterSpacing: -.5,
                    }}>
                      {initials}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.gray900 }}>
                      {form.PositionName || "Position Name"}
                    </div>
                    {form.Department && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        marginTop: 4, fontSize: 11, color: C.gray500,
                      }}>
                        <MdBusiness size={11}/> {form.Department}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        background: isActive ? C.greenLt : "#f1f5f9",
                        color: isActive ? C.green : C.gray400,
                      }}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                      {form.MinSalary && Number(form.MinSalary) > 0 && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: C.greenLt, color: C.green,
                        }}>
                          ${Number(form.MinSalary).toLocaleString()} min
                        </span>
                      )}
                    </div>
                    {form.Description && (
                      <div style={{
                        marginTop: 10, fontSize: 11, color: C.gray500, lineHeight: 1.6,
                        textAlign: "left", background: C.blue50, borderRadius: 8, padding: "8px 10px",
                      }}>
                        {form.Description}
                      </div>
                    )}
                  </div>
                  <div style={{
                    marginTop: 4, padding: "10px 12px", background: C.blue50,
                    borderRadius: 8, display: "flex", alignItems: "center", gap: 6,
                    fontSize: 10.5, color: C.blue600, fontWeight: 600,
                  }}>
                    <MdSync size={12}/> Will sync to MySQL on save
                  </div>
                </Card>

                {/* Required Fields Checklist */}
                <Card>
                  <SectionTitle icon={MdCheckCircle} label="Required Fields"/>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {checks.map(({ label, done }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          background: done ? C.greenLt : "#f1f5f9",
                          border: `1.5px solid ${done ? C.green : C.gray300}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .2s",
                        }}>
                          {done && <MdCheckCircle size={11} color={C.green}/>}
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: done ? C.green : C.gray500,
                          transition: "color .2s",
                        }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {allDone && (
                    <div style={{
                      marginTop: 12, padding: "8px 12px", background: C.greenLt,
                      borderRadius: 8, fontSize: 11, color: C.green, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <MdCheckCircle size={13}/> All fields complete — ready to save!
                    </div>
                  )}
                </Card>

                {/* How it works */}
                <Card style={{ background: "#fafbff" }}>
                  <SectionTitle icon={MdInfo} label="How It Works"/>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { step: "1", text: "Writes position to HUMAN_2025.Positions (SQL Server)." },
                      { step: "2", text: "Atomically syncs to positions_payroll (MySQL). Rolls back both on failure." },
                      { step: "3", text: "Payroll engine recalculates min salary thresholds for affected employees." },
                    ].map(({ step, text }) => (
                      <div key={step} style={{ display: "flex", gap: 10 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          background: C.navy, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800,
                        }}>
                          {step}
                        </div>
                        <p style={{ fontSize: 11, color: C.gray600, margin: 0, lineHeight: 1.6 }}>{text}</p>
                      </div>
                    ))}
                  </div>
                </Card>

              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}