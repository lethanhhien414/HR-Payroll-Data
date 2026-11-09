
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdArrowBack, MdSave, MdBusiness,
  MdCheckCircle, MdWarning,
} from "react-icons/md";
import { getDepartmentDetail, updateDepartment } from "../services/departmentApi";

const C = {
  navy:    "#1e3a8a", blue600:"#2563eb", blue500:"#3b82f6",
  blue200: "#bfdbfe", blue100:"#dbeafe", blue50:"#eff6ff",
  gray900: "#0f172a", gray800:"#1e293b", gray700:"#334155",
  gray500: "#64748b", gray400:"#94a3b8", gray300:"#cbd5e1",
  green:   "#16a34a", greenLt:"#dcfce7",
  amber:   "#d97706", amberLt:"#fef3c7",
  red:     "#dc2626", redLt:"#fee2e2",
};

const AVATAR_COLORS = [
  ["#1e40af","#3b82f6"], ["#065f46","#10b981"], ["#92400e","#f59e0b"],
  ["#6b21a8","#a855f7"], ["#0e7490","#06b6d4"], ["#9d174d","#ec4899"],
  ["#991b1b","#ef4444"], ["#064e3b","#34d399"],
];

const inputBase = (hasError = false) => ({
  width: "100%", height: 34, padding: "0 10px",
  borderRadius: 7,
  border: `1.5px solid ${hasError ? "#fca5a5" : C.blue100}`,
  background: hasError ? C.redLt : C.blue50,
  fontFamily: "inherit", fontSize: 12, color: C.gray800,
  outline: "none", boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
});

const textareaBase = (hasError = false) => ({
  width: "100%", padding: "8px 10px",
  borderRadius: 7,
  border: `1.5px solid ${hasError ? "#fca5a5" : C.blue100}`,
  background: hasError ? C.redLt : C.blue50,
  fontFamily: "inherit", fontSize: 12, color: C.gray800,
  outline: "none", resize: "none", boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
});

const onFocus = e => {
  e.target.style.borderColor = C.blue600;
  e.target.style.background  = "#fff";
  e.target.style.boxShadow   = "0 0 0 3px rgba(37,99,235,.1)";
};
const onBlur = hasError => e => {
  e.target.style.borderColor = hasError ? "#fca5a5" : C.blue100;
  e.target.style.background  = hasError ? C.redLt   : C.blue50;
  e.target.style.boxShadow   = "none";
};

function SectionTitle({ icon: Icon, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 11, fontWeight: 700, color: C.blue600,
      textTransform: "uppercase", letterSpacing: .6,
      paddingBottom: 10, marginBottom: 14,
      borderBottom: `1px solid ${C.blue100}`,
    }}>
      <Icon size={13}/> {children}
    </div>
  );
}

function Field({ label, icon: Icon, required, error, children }) {
  return (
    <div>
      <label style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 5,
      }}>
        {Icon && <Icon size={12} style={{ color: C.navy }}/>}
        {label}
        {required && <span style={{ color: C.red }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: C.red, marginTop: 4,
          display: "flex", alignItems: "center", gap: 4 }}>
          <MdWarning size={12}/> {error}
        </div>
      )}
    </div>
  );
}

function DeptAvatar({ name = "", idx = 0, size = 56 }) {
  const initials = (name || "?")
    .split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const [dark, light] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg,${dark},${light})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color: "#fff",
      margin: "0 auto",
    }}>
      {initials}
    </div>
  );
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 12,
      background: C.gray900, minWidth: 280,
      borderLeft: `4px solid ${type === "success" ? C.green : C.red}`,
      boxShadow: "0 8px 30px rgba(0,0,0,.25)",
      animation: "slideUp .25s ease",
    }}>
      {type === "success"
        ? <MdCheckCircle size={16} color={C.green}/>
        : <MdWarning     size={16} color={C.red}/>}
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{msg}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════
export default function DepartmentEdit() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [form,     setForm]     = useState({ DepartmentName: "", Description: "" });
  const [original, setOriginal] = useState(null);
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [changed,  setChanged]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [deptIdx,  setDeptIdx]  = useState(0);

  useEffect(() => {
    const load = async () => {
      const data = await getDepartmentDetail(id);
      if (data) {
        const f = {
          DepartmentName: data.DepartmentName ?? data.name ?? "",
          Description:    data.Description    ?? data.description ?? "",
        };
        setForm(f);
        setOriginal(f);
        setDeptIdx((Number(id) - 1) % AVATAR_COLORS.length);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const onChange = (field, val) => {
    setForm(p => {
      const next = { ...p, [field]: val };
      setChanged(JSON.stringify(next) !== JSON.stringify(original));
      return next;
    });
    setErrors(e => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.DepartmentName.trim()) e.DepartmentName = "Department name is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const result = await updateDepartment(id, {
      DepartmentName: form.DepartmentName.trim(),
      Description:    form.Description,
    });
    setSaving(false);
    if (result?.error) {
      showToast(result.error, "error");
    } else {
      showToast("Department updated & synced to MySQL ✓", "success");
      setOriginal(form);
      setChanged(false);
      setTimeout(() => navigate("/departments"), 1200);
    }
  };

  const handleReset = () => {
    setForm(original);
    setChanged(false);
    setErrors({});
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (loading) return (
    <div style={{
      display: "flex", width: "100%", height: "100vh",
      alignItems: "center", justifyContent: "center",
      background: "#f0f6ff", fontFamily: "'Inter',sans-serif",
      flexDirection: "column", gap: 12, color: C.gray500,
    }}>
      <div style={{
        width: 32, height: 32, border: `3px solid ${C.blue100}`,
        borderTopColor: C.navy, borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}/>
      <span style={{ fontSize: 13 }}>Loading department...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const REQUIRED = [["DepartmentName", "Department Name", MdBusiness]];
  const completedCount = REQUIRED.filter(([k]) => Boolean(form[k])).length;

  return (
    <div style={{
      display: "flex", width: "100%", height: "100vh",
      overflow: "hidden", fontFamily: "'Inter',sans-serif", background: "#f0f6ff",
    }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      <Sidebar/>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar/>

        <main style={{
          flex: 1, overflowY: "auto", padding: "14px 16px",
          scrollbarWidth: "thin", scrollbarColor: "#dbeafe transparent",
        }}>

          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => navigate("/departments")}
                style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: "#fff", border: `1.5px solid ${C.blue100}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: C.navy,
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.blue50}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <MdArrowBack size={18}/>
              </button>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.gray900, letterSpacing: -.3 }}>
                  Update Department Information
                </div>
                <div style={{ fontSize: 11, color: C.gray400, marginTop: 2, fontWeight: 500 }}>
                  Edit #{id} · HUMAN_2025 → Sync departments_payroll (MySQL) · FR7
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Unsaved badge — same style as EmployeeAdd status badges */}
              {changed && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: C.amber,
                  background: C.amberLt, border: `1px solid #fde68a`,
                  borderRadius: 20, padding: "2px 10px",
                }}>
                  ⚠ Unsaved changes
                </span>
              )}
              <button
                onClick={handleReset}
                disabled={!changed}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: "#fff", color: C.navy, border: `1.5px solid ${C.blue100}`,
                  cursor: changed ? "pointer" : "not-allowed",
                  opacity: changed ? 1 : .4, fontFamily: "inherit",
                }}
              >
                Reset
              </button>
              <button
                onClick={() => navigate("/departments")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: "#fff", color: C.navy, border: `1.5px solid ${C.blue100}`,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !changed}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700,
                  background: C.navy, color: "#fff", border: "none",
                  cursor: (saving || !changed) ? "not-allowed" : "pointer",
                  opacity: (saving || !changed) ? .5 : 1, fontFamily: "inherit",
                }}
              >
                <MdSave size={13}/>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12 }}>

            {/* LEFT: Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              <div style={{
                background: "#fff", borderRadius: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: 18,
              }}>
                <SectionTitle icon={MdBusiness}>Department Information</SectionTitle>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  <Field label="Department Name" icon={MdBusiness} required error={errors.DepartmentName}>
                    <input
                      type="text"
                      placeholder="Department name"
                      value={form.DepartmentName}
                      onChange={e => onChange("DepartmentName", e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSave()}
                      style={inputBase(!!errors.DepartmentName)}
                      onFocus={onFocus}
                      onBlur={onBlur(!!errors.DepartmentName)}
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      rows={4}
                      placeholder="Optional description..."
                      value={form.Description}
                      onChange={e => onChange("Description", e.target.value)}
                      style={textareaBase()}
                      onFocus={onFocus}
                      onBlur={onBlur(false)}
                    />
                  </Field>

                </div>
              </div>

              <div style={{
                background: C.blue50, border: `1px solid ${C.blue100}`,
                borderRadius: 10, padding: "10px 14px",
                fontSize: 12, color: "#1d4ed8", lineHeight: 1.6,
              }}>
                💡 Changes will update <strong>HUMAN_2025.Departments</strong> (SQL Server)
                and sync to <strong>departments_payroll</strong> (MySQL) atomically.
                Both roll back if one fails.
              </div>

            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              <div style={{
                background: "#fff", borderRadius: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                padding: 16, textAlign: "center",
              }}>
                <SectionTitle icon={MdBusiness}>Preview</SectionTitle>
                <DeptAvatar name={form.DepartmentName} idx={deptIdx} size={56}/>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.gray900,
                  marginTop: 10, wordBreak: "break-word" }}>
                  {form.DepartmentName || "—"}
                </div>
                <div style={{ fontSize: 10, color: C.gray400, marginTop: 3 }}>#{id}</div>
                {form.Description && (
                  <div style={{ fontSize: 11, color: C.gray400, marginTop: 6, lineHeight: 1.6 }}>
                    {form.Description}
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 11,
                    fontWeight: 600, background: C.greenLt, color: C.green,
                  }}>
                    Active
                  </span>
                </div>
              </div>

              <div style={{
                background: "#fff", borderRadius: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,.06)", padding: 16,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, fontWeight: 700, color: C.blue600,
                  textTransform: "uppercase", letterSpacing: .6,
                  paddingBottom: 10, marginBottom: 12,
                  borderBottom: `1px solid ${C.blue100}`,
                }}>
                  Required Fields
                  <span style={{
                    marginLeft: "auto", fontSize: 11, fontWeight: 700,
                    color: completedCount === REQUIRED.length ? C.green : C.amber,
                  }}>
                    {completedCount}/{REQUIRED.length}
                  </span>
                </div>

                <div style={{ height: 4, borderRadius: 20, background: C.blue100, marginBottom: 12 }}>
                  <div style={{
                    height: "100%", borderRadius: 20,
                    width: `${(completedCount / REQUIRED.length) * 100}%`,
                    background: completedCount === REQUIRED.length ? C.green : C.blue500,
                    transition: "width .3s",
                  }}/>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {REQUIRED.map(([key, label]) => {
                    const done = Boolean(form[key]);
                    return (
                      <div key={key} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        opacity: done ? .5 : 1, transition: "opacity .2s",
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          background: done ? C.greenLt : C.amberLt,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {done
                            ? <MdCheckCircle size={13} color={C.green}/>
                            : <span style={{ fontSize: 10, fontWeight: 800, color: C.amber }}>!</span>
                          }
                        </div>
                        <span style={{
                          fontSize: 12, color: C.gray700,
                          textDecoration: done ? "line-through" : "none",
                        }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{
                background: C.blue50, border: `1px solid ${C.blue100}`,
                borderRadius: 14, padding: 14,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.navy,
                  textTransform: "uppercase", letterSpacing: .5, marginBottom: 8,
                }}>
                  Sync Info
                </div>
                <div style={{ fontSize: 11, color: C.gray700, lineHeight: 1.7 }}>
                  Changes synced atomically to MySQL.
                  Auto rollback on failure.
                </div>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[["SQL Server", "HUMAN_2025"], ["MySQL", "payroll"]].map(([k, v]) => (
                    <div key={k} style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: 11, paddingTop: 6, borderTop: `1px solid ${C.blue100}`,
                    }}>
                      <span style={{ color: C.gray500 }}>{k}</span>
                      <span style={{ fontWeight: 700, color: C.navy, fontFamily: "monospace", fontSize: 11 }}>{v}</span>
                    </div>
                  ))}
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