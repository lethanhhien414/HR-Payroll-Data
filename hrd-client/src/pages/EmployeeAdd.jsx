
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import { MdArrowBack, MdSave, MdPerson, MdEmail,
         MdPhone, MdBusiness, MdWork, MdCalendarToday } from "react-icons/md";
import { getDepartments } from "../services/departmentApi";
import { getPositions }   from "../services/positionApi";
import { createEmployee } from "../services/employeeApi";

function Field({ label, icon: Icon, required, children, note }) {
  return (
    <div>
      <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5,
        fontWeight:600, color:"#334155", marginBottom:6 }}>
        {Icon && <Icon size={13} style={{ color:"#1e3a8a" }}/>}
        {label} {required && <span style={{ color:"#ef4444" }}>*</span>}
      </label>
      {children}
      {note && <p style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>{note}</p>}
    </div>
  );
}

const inputStyle = {
  width:"100%", padding:"9px 12px", borderRadius:8,
  border:"1.5px solid #dbeafe", background:"#f8fbff",
  fontSize:13, color:"#1e293b", outline:"none",
  fontFamily:"inherit", boxSizing:"border-box",
  transition:"border .15s",
};

const selectStyle = {
  ...inputStyle, cursor:"pointer",
};

function Toast({ msg, type }) {
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:100,
      display:"flex", alignItems:"center", gap:10,
      padding:"12px 18px", borderRadius:12,
      background:"#0f172a", minWidth:260,
      borderLeft:`4px solid ${type === "success" ? "#22c55e" : "#ef4444"}`,
      boxShadow:"0 8px 30px rgba(0,0,0,.25)",
    }}>
      <span style={{ fontSize:15 }}>{type === "success" ? "✓" : "✕"}</span>
      <span style={{ fontSize:13, color:"#fff", fontWeight:500 }}>{msg}</span>
    </div>
  );
}

export default function EmployeeAdd() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    FullName:"", Email:"", PhoneNumber:"",
    HireDate: new Date().toISOString().split("T")[0],
    DepartmentID:"", PositionID:"",
    Status:"Đang làm việc", Gender:"Male", DateOfBirth:"",
  });

  const [depts,     setDepts]     = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [errors,    setErrors]    = useState({});

  useEffect(() => {
    const load = async () => {
      const [d, p] = await Promise.all([getDepartments(), getPositions()]);
      setDepts(Array.isArray(d) ? d : []);
      setPositions(Array.isArray(p) ? p : []);
    };
    load();
  }, []);

  const onChange = (field, val) => {
    setForm(f => ({
      ...f,
      [field]: val,
    }));

    setErrors(e => ({
      ...e,
      [field]: "",
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.FullName.trim()) {e.FullName = "Full name is required";}
    if (!form.Email.trim()) { e.Email = "Email is required";}
     else {
      const emailRegex =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

      if (!emailRegex.test(form.Email.trim())) { e.Email = "Invalid email format";}}
      if (form.PhoneNumber) {
      const phoneRegex = /^[0-9+]+$/;
      if (!phoneRegex.test(form.PhoneNumber.trim())) {
        e.PhoneNumber = "Phone number cannot contain negative values";
      }
      if (form.PhoneNumber.includes("-")) {
        e.PhoneNumber = "Phone number cannot be negative";
      }
    }
    if (form.DateOfBirth) {
      const today = new Date();
      const dob = new Date(form.DateOfBirth);

      today.setHours(0, 0, 0, 0);
      dob.setHours(0, 0, 0, 0);

      if (dob > today) {
        e.DateOfBirth = "Date of birth cannot be after today";
      }
    }
    if (!form.DepartmentID) {
      e.DepartmentID = "Department is required";
    }

    if (!form.PositionID) {
      e.PositionID = "Position is required";
    }

    if (!form.HireDate) {
      e.HireDate = "Hire date is required";
    } else {
      const today = new Date();
      const hireDate = new Date(form.HireDate);

      today.setHours(0, 0, 0, 0);
      hireDate.setHours(0, 0, 0, 0);

      if (hireDate > today) {
        e.HireDate = "Hire date cannot be after today";
      }
    }
    setErrors(e);

    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const payload = {
      FullName:     form.FullName.trim(),
      Email:        form.Email.trim(),
      PhoneNumber:  form.PhoneNumber.trim() || null,
      DateOfBirth:  form.DateOfBirth || null,
      Gender:       form.Gender,
      HireDate:     form.HireDate,
      DepartmentID: Number(form.DepartmentID),
      PositionID:   Number(form.PositionID),
      Status:       form.Status,
    };
    const result = await createEmployee(payload);
    setLoading(false);
    if (result?.error) {
      showToast(result.error, "error");
    } else {
      showToast("Employee added successfully", "success");
      setTimeout(() => navigate("/employees"), 1200);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const previewInitials = form.FullName
    ? form.FullName.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const previewDept = depts.find(
    d => String(d.DepartmentID ?? d.id) === String(form.DepartmentID)
  );

  const STATUS_COLOR = {
    "Đang làm việc": { bg:"#dcfce7", text:"#16a34a" },
    "Nghỉ phép":     { bg:"#fef3c7", text:"#d97706" },
    "Thử việc":      { bg:"#dbeafe", text:"#1e3a8a" },
    "Thực tập":      { bg:"#f1f5f9", text:"#64748b" },
  };

  const sectionLabel = (Icon, text) => (
    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11,
      fontWeight:700, color:"#2563eb", textTransform:"uppercase", letterSpacing:.6,
      marginBottom:16, paddingBottom:10, borderBottom:"1px solid #eff6ff" }}>
      <Icon size={13}/> {text}
    </div>
  );

  const card = { background:"#fff", borderRadius:14,
    boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:20 };

  const errStyle = { fontSize:11, color:"#ef4444", marginTop:4 };

  return (
    <div style={{ display:"flex", width:"100%", height:"100vh", overflow:"hidden",
      fontFamily:"'Inter',sans-serif", background:"#f0f6ff" }}>

      <Sidebar/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar/>

        <main style={{ flex:1, overflowY:"auto", padding:"14px 16px",
          scrollbarWidth:"thin", scrollbarColor:"#dbeafe transparent" }}>

          <div style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button
                onClick={() => navigate("/employees")}
                style={{ width:34, height:34, borderRadius:9, background:"#fff",
                  border:"1.5px solid #dbeafe", display:"flex", alignItems:"center",
                  justifyContent:"center", color:"#1e3a8a", cursor:"pointer" }}
              >
                <MdArrowBack size={17}/>
              </button>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:"#0f172a", letterSpacing:-.3 }}>
                  Add New Employee
                </div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:3, fontWeight:500 }}>
                  Create a new employee record and sync across systems
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => navigate("/employees")}
                style={{ padding:"7px 16px", borderRadius:8, border:"1.5px solid #dbeafe",
                  background:"#fff", color:"#1e3a8a", fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit" }}
              >Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  padding:"7px 18px", borderRadius:8, background:"#1e3a8a",
                  color:"#fff", fontSize:12, fontWeight:700, border:"none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? .7 : 1, fontFamily:"inherit" }}
              >
                <MdSave size={14}/>
                {loading ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              <div style={card}>
                {sectionLabel(MdPerson, "Personal Information")}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                  <div style={{ gridColumn:"1 / -1" }}>
                    <Field label="Full Name" icon={MdPerson} required>
                      <input
                        style={{ ...inputStyle, borderColor: errors.FullName ? "#f87171" : "#dbeafe", background: errors.FullName ? "#fef2f2" : "#f8fbff" }}
                        placeholder="Enter full name"
                        value={form.FullName}
                        onChange={e => onChange("FullName", e.target.value)}
                      />
                      {errors.FullName && <p style={errStyle}>{errors.FullName}</p>}
                    </Field>
                  </div>

                  <Field label="Email" icon={MdEmail} required>
                    <input
                      style={{ ...inputStyle, borderColor: errors.Email ? "#f87171" : "#dbeafe", background: errors.Email ? "#fef2f2" : "#f8fbff" }}
                      type="email"
                      placeholder="name@company.com"
                      value={form.Email}
                      onChange={e => onChange("Email", e.target.value)}
                    />
                    {errors.Email && <p style={errStyle}>{errors.Email}</p>}
                  </Field>

                  <Field label="Phone Number" icon={MdPhone}>
                    <input
                      style={{
                        ...inputStyle,
                        borderColor: errors.PhoneNumber ? "#f87171" : "#dbeafe",
                        background: errors.PhoneNumber ? "#fef2f2" : "#f8fbff"
                      }}
                      placeholder="+84 xxx xxx xxx"
                      value={form.PhoneNumber}
                      onChange={e => onChange("PhoneNumber", e.target.value)}
                    />
                    {errors.PhoneNumber && (
                      <p style={errStyle}>{errors.PhoneNumber}</p>
                    )}
                  </Field>

                  <Field label="Date of Birth" icon={MdCalendarToday}>
                    <input
                      style={{
                        ...inputStyle,
                        borderColor: errors.DateOfBirth ? "#f87171" : "#dbeafe",
                        background: errors.DateOfBirth ? "#fef2f2" : "#f8fbff"
                      }}
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={form.DateOfBirth}
                      onChange={e => onChange("DateOfBirth", e.target.value)}
                    />
                    {errors.DateOfBirth && (
                      <p style={errStyle}>{errors.DateOfBirth}</p>
                    )}
                  </Field>

                  <Field label="Gender">
                    <select style={selectStyle} value={form.Gender} onChange={e => onChange("Gender", e.target.value)}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>

                </div>
              </div>

              <div style={card}>
                {sectionLabel(MdWork, "Job Information")}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                  <Field label="Department" icon={MdBusiness} required>
                    <select
                      style={{ ...selectStyle, borderColor: errors.DepartmentID ? "#f87171" : "#dbeafe" }}
                      value={String(form.DepartmentID || "")}
                      onChange={e => onChange("DepartmentID", String(e.target.value))}
                    >
                      <option value="">-- Select Department --</option>
                      {depts.map(d => (
                        <option key={d.DepartmentID ?? d.id} value={d.DepartmentID ?? d.id}>
                          {d.DepartmentName ?? d.name}
                        </option>
                      ))}
                    </select>
                    {errors.DepartmentID && <p style={errStyle}>{errors.DepartmentID}</p>}
                  </Field>

                  <Field label="Position" icon={MdWork} required>
                    <select
                      style={{ ...selectStyle, borderColor: errors.PositionID ? "#f87171" : "#dbeafe" }}
                      value={String(form.PositionID || "")}
                      onChange={e => onChange("PositionID", String(e.target.value))}
                    >
                      <option value="">-- Select Position --</option>
                      {positions.map(p => (
                        <option key={p.PositionID ?? p.id} value={p.PositionID ?? p.id}>
                          {p.PositionName ?? p.name}
                        </option>
                      ))}
                    </select>
                    {errors.PositionID && <p style={errStyle}>{errors.PositionID}</p>}
                  </Field>

                  <Field label="Hire Date" icon={MdCalendarToday} required>
                    <input
                      style={{
                        ...inputStyle,
                        borderColor: errors.HireDate ? "#f87171" : "#dbeafe",
                        background: errors.HireDate ? "#fef2f2" : "#f8fbff"
                      }}
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={form.HireDate}
                      onChange={e => onChange("HireDate", e.target.value)}
                    />
                    {errors.HireDate && (
                      <p style={errStyle}>{errors.HireDate}</p>
                    )}
                  </Field>

                  <Field label="Status">
                    <select style={selectStyle} value={form.Status} onChange={e => onChange("Status", e.target.value)}>
                      <option value="Đang làm việc">Đang làm việc</option>
                      <option value="Nghỉ phép">Nghỉ phép</option>
                      <option value="Thử việc">Thử việc</option>
                      <option value="Thực tập">Thực tập</option>
                    </select>
                  </Field>

                </div>
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              <div style={card}>
                {sectionLabel(MdPerson, "Preview")}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  textAlign:"center", padding:"8px 0" }}>
                  <div style={{
                    width:64, height:64, borderRadius:"50%",
                    background:"linear-gradient(135deg,#1e40af,#3b82f6)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:22, fontWeight:800, color:"#fff", marginBottom:12,
                  }}>{previewInitials}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>
                    {form.FullName || "Employee Name"}
                  </div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>
                    {form.Email || "email@company.com"}
                  </div>
                  <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap", justifyContent:"center" }}>
                    {previewDept && (
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11,
                        fontWeight:600, background:"#dbeafe", color:"#1e3a8a" }}>
                        {previewDept.DepartmentName ?? previewDept.name}
                      </span>
                    )}
                    {form.Status && (() => {
                      const sc = STATUS_COLOR[form.Status] || { bg:"#f1f5f9", text:"#64748b" };
                      return (
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11,
                          fontWeight:600, background:sc.bg, color:sc.text }}>
                          {form.Status}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div style={{ background:"#fffbeb", border:"1px solid #fef3c7",
                borderRadius:14, padding:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#92400e",
                  marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>
                  Required Fields
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    ["FullName",     "Full Name"],
                    ["Email",        "Email"],
                    ["DepartmentID", "Department"],
                    ["PositionID",   "Position"],
                    ["HireDate",     "Hire Date"],
                  ].map(([key, label]) => {
                    const done = Boolean(form[key]);
                    return (
                      <div key={key} style={{ display:"flex", alignItems:"center", gap:8,
                        opacity: done ? .45 : 1, transition:"opacity .2s" }}>
                        <div style={{
                          width:18, height:18, borderRadius:"50%", flexShrink:0,
                          background: done ? "#22c55e" : "#fde68a",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, fontWeight:800,
                          color: done ? "#fff" : "#92400e",
                        }}>{done ? "✓" : "!"}</div>
                        <span style={{ fontSize:12, color:"#78350f",
                          textDecoration: done ? "line-through" : "none" }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background:"#eff6ff", border:"1px solid #dbeafe",
                borderRadius:14, padding:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#1e3a8a",
                  marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>
                  How it works
                </div>
                <div style={{ fontSize:12, color:"#334155", lineHeight:1.7 }}>
                  Saving will create the employee record and automatically
                  sync relevant data to the payroll system.
                  Both operations are atomic — if one fails, both roll back.
                </div>
                <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                  {[
                    // ["Endpoint", "POST /api/employees"],
                    // ["Method",   "Atomic dual-write"],
                    // ["Rollback", "Auto on failure"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between",
                      fontSize:11, paddingTop:5, borderTop:"1px solid #dbeafe" }}>
                      <span style={{ color:"#64748b" }}>{k}</span>
                      <span style={{ fontWeight:600, color:"#1e293b", fontFamily:"monospace" }}>{v}</span>
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