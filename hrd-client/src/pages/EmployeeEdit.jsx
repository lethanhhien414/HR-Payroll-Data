
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdArrowBack, MdSave, MdPerson,
  MdEmail, MdPhone, MdBusiness, MdWork,
  MdCalendarToday, MdPayments,
} from "react-icons/md";
import { getEmployeeDetail, updateEmployee } from "../services/employeeApi";
import { getDepartments }                    from "../services/departmentApi";
import { getPositions }                      from "../services/positionApi";

const getDeptId = (emp) =>
  emp?.DepartmentID ?? emp?.DepartmentId ?? emp?.department_id ?? emp?.departmentId ?? "";

const getPosId = (emp) =>
  emp?.PositionID ?? emp?.PositionId ?? emp?.position_id ?? emp?.positionId ?? "";

const deptKey = (d) =>
  d?.DepartmentID ?? d?.id ?? d?.department_id ?? "";

const posKey = (p) =>
  p?.PositionID ?? p?.id ?? p?.position_id ?? "";

const deptName = (d) => d?.DepartmentName ?? d?.name ?? d?.department_name ?? "";
const posName  = (p) => p?.PositionName   ?? p?.name ?? p?.position_name   ?? "";

/* ── UI helpers ── */
function Field({ label, icon: Icon, required, children, note }) {
  return (
    <div>
      <label style={{
        display:"flex", alignItems:"center", gap:6,
        fontSize:12.5, fontWeight:600, color:"#334155", marginBottom:6,
      }}>
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
};
const selectStyle = { ...inputStyle, cursor:"pointer" };
const errStyle    = { fontSize:11, color:"#ef4444", marginTop:4 };

function Toast({ msg, type }) {
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:100,
      display:"flex", alignItems:"center", gap:10,
      padding:"12px 18px", borderRadius:12,
      background:"#0f172a", minWidth:260,
      borderLeft:`4px solid ${type==="success"?"#22c55e":"#ef4444"}`,
      boxShadow:"0 8px 30px rgba(0,0,0,.25)",
    }}>
      <span style={{ fontSize:15 }}>{type==="success"?"✓":"✕"}</span>
      <span style={{ fontSize:13, color:"#fff", fontWeight:500 }}>{msg}</span>
    </div>
  );
}

const STATUS_COLOR = {
  "Đang làm việc":{ bg:"#dcfce7", text:"#16a34a" },
  "Nghỉ phép":    { bg:"#fef3c7", text:"#d97706" },
  "Thử việc":     { bg:"#dbeafe", text:"#1e3a8a" },
  "Thực tập":     { bg:"#f1f5f9", text:"#64748b" },
  "Inactive":     { bg:"#f1f5f9", text:"#94a3b8" },
};

const fmtVND = v => {
  if (!v) return "—";
  const n = Number(v);
  return n >= 1_000_000 ? (n/1_000_000).toFixed(1)+"M VND" : n.toLocaleString()+" VND";
};

const calcYears = d => {
  if (!d) return null;
  return Math.floor((Date.now()-new Date(d))/(365.25*24*3600*1000));
};

const sectionLabel = (Icon, text) => (
  <div style={{
    display:"flex", alignItems:"center", gap:6,
    fontSize:11, fontWeight:700, color:"#2563eb",
    textTransform:"uppercase", letterSpacing:.6,
    marginBottom:16, paddingBottom:10, borderBottom:"1px solid #eff6ff",
  }}>
    <Icon size={13}/>{text}
  </div>
);

const card = {
  background:"#fff", borderRadius:14,
  boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:20,
};

/* ════════════════════════════════════
   MAIN
════════════════════════════════════ */
export default function EmployeeEdit() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [depts,     setDepts]     = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [errors,    setErrors]    = useState({});
  const [snapshot,  setSnapshot]  = useState(null);

  const [form, setForm] = useState({
    FullName:"", Email:"", PhoneNumber:"",
    DateOfBirth:"", Gender:"Male", HireDate:"",
    DepartmentID:"", PositionID:"",
    Status:"Đang làm việc",
  });

  /* ── Load employee + depts + positions ── */
  useEffect(() => {
    Promise.all([
      getEmployeeDetail(id),
      getDepartments(),
      getPositions(),
    ]).then(([emp, d, p]) => {
      const deptList = Array.isArray(d) ? d : [];
      const posList  = Array.isArray(p) ? p : [];
      setDepts(deptList);
      setPositions(posList);

      if (emp && !emp.error) {
        setSnapshot(emp);

        const empDeptId = String(getDeptId(emp) ?? "");
        const empPosId  = String(getPosId(emp)  ?? "");

        console.log("[EmployeeEdit] emp:", emp);
        console.log("[EmployeeEdit] DepartmentID →", empDeptId);
        console.log("[EmployeeEdit] PositionID →",   empPosId);
        console.log("[EmployeeEdit] depts:", deptList.map(d=>({id:deptKey(d),name:deptName(d)})));
        console.log("[EmployeeEdit] positions:", posList.map(p=>({id:posKey(p),name:posName(p)})));

        setForm({
          FullName:    emp.FullName    || "",
          Email:       emp.Email       || "",
          PhoneNumber: emp.PhoneNumber || "",
          DateOfBirth: (emp.DateOfBirth || "").slice(0,10),
          Gender:      emp.Gender      || "Male",
          HireDate:    (emp.HireDate   || "").slice(0,10),
          DepartmentID: empDeptId,
          PositionID:   empPosId,
          Status:      emp.Status      || "Đang làm việc",
        });
      }
    }).catch(err => console.error("[EmployeeEdit] load error:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const onChange = (field, val) => {
    setForm(f => ({ ...f, [field]:val }));
    setErrors(e => ({ ...e, [field]:"" }));
  };

  const validate = () => {
    const e = {};
    if (!form.FullName.trim()) e.FullName = "Full name is required";
    if (form.Email.trim()) {
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.Email.trim()))
        e.Email = "Invalid email format";
    }
    if (form.PhoneNumber) {
      if (!/^[0-9+\-]+$/.test(form.PhoneNumber.trim()))
        e.PhoneNumber = "Invalid phone number";
      if (form.PhoneNumber.includes("-"))
        e.PhoneNumber = "Phone number cannot be negative";
    }
    if (form.DateOfBirth) {
      const dob   = new Date(form.DateOfBirth); dob.setHours(0,0,0,0);
      const today = new Date();                 today.setHours(0,0,0,0);
      if (dob > today) e.DateOfBirth = "Date of birth cannot be after today";
    }
    if (!form.HireDate) {
      e.HireDate = "Hire date is required";
    } else {
      const hire  = new Date(form.HireDate); hire.setHours(0,0,0,0);
      const today = new Date();              today.setHours(0,0,0,0);
      if (hire > today) e.HireDate = "Hire date cannot be after today";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const res = await updateEmployee(id, {
      FullName:    form.FullName.trim(),
      Email:       form.Email        || null,
      PhoneNumber: form.PhoneNumber  || null,
      DateOfBirth: form.DateOfBirth  || null,
      Gender:      form.Gender,
      HireDate:    form.HireDate     || null,
      DepartmentID:form.DepartmentID ? Number(form.DepartmentID) : null,
      PositionID:  form.PositionID   ? Number(form.PositionID)   : null,
      Status:      form.Status,
    });
    setSaving(false);
    if (res?.error) {
      showToast(res.error, "error");
    } else {
      showToast("Employee updated successfully", "success");
      setTimeout(() => navigate("/employees"), 1200);
    }
  };

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const previewInitials = form.FullName
    ? form.FullName.split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase()
    : "?";

  const previewDept = depts.find(d => String(deptKey(d)) === String(form.DepartmentID));
  const years = calcYears(snapshot?.HireDate);

  if (loading) return (
    <div style={{ display:"flex", width:"100%", height:"100vh",
      overflow:"hidden", fontFamily:"'Inter',sans-serif", background:"#f0f6ff" }}>
      <Sidebar/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar/>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, color:"#2563eb" }}>
            <svg style={{ animation:"spin 1s linear infinite" }} width="20" height="20"
                 fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity:.25 }} cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"/>
              <path style={{ opacity:.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span style={{ fontSize:14 }}>Loading employee data...</span>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", width:"100%", height:"100vh", overflow:"hidden",
      fontFamily:"'Inter',sans-serif", background:"#f0f6ff" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <Sidebar/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar/>

        <main style={{ flex:1, overflowY:"auto", padding:"14px 16px",
          scrollbarWidth:"thin", scrollbarColor:"#dbeafe transparent" }}>

          {/* ── Header ── */}
          <div style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={() => navigate("/employees")}
                style={{ width:34, height:34, borderRadius:9, background:"#fff",
                  border:"1.5px solid #dbeafe", display:"flex", alignItems:"center",
                  justifyContent:"center", color:"#1e3a8a", cursor:"pointer" }}>
                <MdArrowBack size={17}/>
              </button>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:"#0f172a", letterSpacing:-.3 }}>
                  Edit Employee
                  <span style={{ fontSize:14, fontWeight:600, color:"#2563eb", marginLeft:8 }}>
                    #{String(id).padStart(3,"0")}
                  </span>
                </div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:3, fontWeight:500 }}>
                  Update employee record · Changes sync to Payroll automatically
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => navigate("/employees")}
                style={{ padding:"7px 16px", borderRadius:8, border:"1.5px solid #dbeafe",
                  background:"#fff", color:"#1e3a8a", fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving}
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  padding:"7px 18px", borderRadius:8, background:"#1e3a8a",
                  color:"#fff", fontSize:12, fontWeight:700, border:"none",
                  cursor:saving?"not-allowed":"pointer",
                  opacity:saving?.7:1, fontFamily:"inherit" }}>
                <MdSave size={14}/>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>

            {/* LEFT */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              <div style={card}>
                {sectionLabel(MdPerson, "Personal Information")}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                  <div style={{ gridColumn:"1 / -1" }}>
                    <Field label="Full Name" icon={MdPerson} required>
                      <input style={{ ...inputStyle,
                        borderColor:errors.FullName?"#f87171":"#dbeafe",
                        background: errors.FullName?"#fef2f2":"#f8fbff" }}
                        placeholder="Enter full name"
                        value={form.FullName}
                        onChange={e => onChange("FullName", e.target.value)}/>
                      {errors.FullName && <p style={errStyle}>{errors.FullName}</p>}
                    </Field>
                  </div>

                  <Field label="Email" icon={MdEmail}>
                    <input style={{ ...inputStyle,
                      borderColor:errors.Email?"#f87171":"#dbeafe",
                      background: errors.Email?"#fef2f2":"#f8fbff" }}
                      type="email" placeholder="name@company.com"
                      value={form.Email}
                      onChange={e => onChange("Email", e.target.value)}/>
                    {errors.Email && <p style={errStyle}>{errors.Email}</p>}
                  </Field>

                  <Field label="Phone Number" icon={MdPhone}>
                    <input style={{ ...inputStyle,
                      borderColor:errors.PhoneNumber?"#f87171":"#dbeafe",
                      background: errors.PhoneNumber?"#fef2f2":"#f8fbff" }}
                      placeholder="+84 xxx xxx xxx"
                      value={form.PhoneNumber}
                      onChange={e => onChange("PhoneNumber", e.target.value)}/>
                    {errors.PhoneNumber && <p style={errStyle}>{errors.PhoneNumber}</p>}
                  </Field>

                  <Field label="Date of Birth" icon={MdCalendarToday}>
                    <input style={{ ...inputStyle,
                      borderColor:errors.DateOfBirth?"#f87171":"#dbeafe",
                      background: errors.DateOfBirth?"#fef2f2":"#f8fbff" }}
                      type="date" max={new Date().toISOString().split("T")[0]}
                      value={form.DateOfBirth}
                      onChange={e => onChange("DateOfBirth", e.target.value)}/>
                    {errors.DateOfBirth && <p style={errStyle}>{errors.DateOfBirth}</p>}
                  </Field>

                  <Field label="Gender">
                    <select style={selectStyle} value={form.Gender}
                      onChange={e => onChange("Gender", e.target.value)}>
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

                  <Field label="Department" icon={MdBusiness}>
                    <select style={selectStyle}
                      value={String(form.DepartmentID || "")}
                      onChange={e => onChange("DepartmentID", e.target.value)}>
                      <option value="">-- Select Department --</option>
                      {depts.map(d => (
                        <option key={deptKey(d)} value={String(deptKey(d))}>
                          {deptName(d)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Position" icon={MdWork}>
                    <select style={selectStyle}
                      value={String(form.PositionID || "")}
                      onChange={e => onChange("PositionID", e.target.value)}>
                      <option value="">-- Select Position --</option>
                      {positions.map(p => (
                        <option key={posKey(p)} value={String(posKey(p))}>
                          {posName(p)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Hire Date" icon={MdCalendarToday} required>
                    <input style={{ ...inputStyle,
                      borderColor:errors.HireDate?"#f87171":"#dbeafe",
                      background: errors.HireDate?"#fef2f2":"#f8fbff" }}
                      type="date" max={new Date().toISOString().split("T")[0]}
                      value={form.HireDate}
                      onChange={e => onChange("HireDate", e.target.value)}/>
                    {errors.HireDate && <p style={errStyle}>{errors.HireDate}</p>}
                  </Field>

                  <Field label="Status">
                    <select style={selectStyle} value={form.Status}
                      onChange={e => onChange("Status", e.target.value)}>
                      <option value="Đang làm việc">Đang làm việc</option>
                      <option value="Nghỉ phép">Nghỉ phép</option>
                      <option value="Thử việc">Thử việc</option>
                      <option value="Thực tập">Thực tập</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </Field>

                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              <div style={card}>
                {sectionLabel(MdPerson, "Preview")}
                <div style={{ display:"flex", flexDirection:"column",
                  alignItems:"center", textAlign:"center", padding:"8px 0" }}>
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
                    {form.Email || "—"}
                  </div>
                  {years !== null && (
                    <div style={{ marginTop:8, padding:"3px 12px", borderRadius:20,
                      fontSize:11, fontWeight:700, background:"#dbeafe", color:"#1e3a8a" }}>
                      🏅 {years} year{years!==1?"s":""} tenure
                    </div>
                  )}
                  <div style={{ display:"flex", gap:6, marginTop:10,
                    flexWrap:"wrap", justifyContent:"center" }}>
                    {previewDept && (
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11,
                        fontWeight:600, background:"#dbeafe", color:"#1e3a8a" }}>
                        {deptName(previewDept)}
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

              {/* Payroll Snapshot */}
              <div style={card}>
                {sectionLabel(MdPayments, "Payroll Snapshot")}
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    { label:"Latest Net Salary", value:fmtVND(snapshot?.LatestSalary),  color:"#2563eb" },
                    { label:"Salary Month",      value:snapshot?.SalaryMonth?.slice(0,7)||"—", color:"#334155" },
                    { label:"Total Work Days",   value:snapshot?.TotalWorkDays  !=null?`${snapshot.TotalWorkDays} days`  :"—", color:"#16a34a" },
                    { label:"Total Absent Days", value:snapshot?.TotalAbsentDays!=null?`${snapshot.TotalAbsentDays} days`:"—", color:"#dc2626" },
                    { label:"Total Leave Days",  value:snapshot?.TotalLeaveDays !=null?`${snapshot.TotalLeaveDays} days` :"—", color:"#d97706" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      padding:"9px 12px", borderRadius:9,
                      background:"#f8fbff", border:"1px solid #eff6ff",
                    }}>
                      <div style={{ fontSize:10.5, color:"#94a3b8", marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:14, fontWeight:700, color }}>{value}</div>
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