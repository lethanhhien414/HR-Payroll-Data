
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdCheck, MdClose,
  MdEdit, MdDelete, MdAdd, MdSearch,
  MdVisibility, MdVisibilityOff,
} from "react-icons/md";

function getStoredValue(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
}

function useAuthGuard(requiredRole = null) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getStoredValue("token");
    const role  = getStoredValue("role");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (requiredRole && role !== requiredRole) {
      navigate("/", { replace: true }); 
    }
  }, [navigate, requiredRole]);
}
// ──────────────────────────────────────────────────────────────

const C = {
  navy:"#1e3a8a", navyMid:"#1e40af", blue600:"#2563eb",
  blue100:"#dbeafe", blue50:"#eff6ff",
  gray900:"#0f172a", gray800:"#1e293b", gray700:"#334155",
  gray500:"#64748b", gray400:"#94a3b8",
  green:"#16a34a", greenLt:"#dcfce7",
  amber:"#d97706", amberLt:"#fef3c7",
  red:"#dc2626", redLt:"#fee2e2",
};

const ROLE_STYLE = {
  Admin:           { bg:"#dbeafe", text:"#1e3a8a" },
  HR_Manager:      { bg:"#dcfce7", text:"#16a34a" },
  Payroll_Manager: { bg:"#fef3c7", text:"#d97706" },
  Employee:        { bg:"#f1f5f9", text:"#64748b" },
};

const ROLE_PERMISSIONS = {
  Admin:           ["Dashboard","Employees","Payroll","Attendance","Departments","Positions","Reports","Alerts","User Management"],
  HR_Manager:      ["Dashboard","Employees","Attendance","Departments","Positions","Reports","Alerts"],
  Payroll_Manager: ["Dashboard","Payroll","Reports","Alerts"],
  Employee:        ["Dashboard"],
};

function Toast({ msg, type = "success" }) {
  const ok = type === "success";
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:100,
      display:"flex", alignItems:"center", gap:10,
      padding:"12px 18px", borderRadius:12,
      background:"#0f172a",
      borderLeft:`4px solid ${ok ? "#22c55e" : "#ef4444"}`,
      boxShadow:"0 8px 24px rgba(0,0,0,.18)",
      fontSize:13, fontWeight:500, color:"#fff", minWidth:260,
    }}>
      {ok ? "✓" : "✕"} {msg}
    </div>
  );
}

function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm]     = useState({
    username: user?.username || "",
    email:    user?.email    || "",
    role:     user?.role     || "Employee",
    password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onChange = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Required";
    if (!form.email.trim())    e.email    = "Required";
    if (!isEdit && !form.password) e.password = "Required";
    if (!isEdit && form.password && form.password.length < 6)
      e.password = "At least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    onSave(form);
    onClose();
  };

  const inp = (k) => ({
    width:"100%", padding:"9px 13px",
    borderRadius:8, border:`1.5px solid ${errors[k] ? "#fca5a5" : C.blue100}`,
    background: errors[k] ? "#fff5f5" : C.blue50,
    fontFamily:"inherit", fontSize:13, color:C.gray800, outline:"none",
    boxSizing:"border-box",
  });

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:50,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      background:"rgba(15,23,42,0.5)", backdropFilter:"blur(4px)",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, width:"100%", maxWidth:420,
        boxShadow:"0 20px 60px rgba(0,0,0,.18)", overflow:"hidden",
      }}>
        <div style={{ height:3, background:`linear-gradient(90deg,${C.navy},${C.blue600})` }}/>
        <form onSubmit={e=>e.preventDefault()} style={{ padding:"24px 26px" }}>

          {/* header */}
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:20 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:C.gray800 }}>
                {isEdit ? "Edit User" : "Add New User"}
              </div>
              <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>
                UC.02 — Role-Based Access Control
              </div>
            </div>
            <button onClick={onClose} style={{
              width:30, height:30, borderRadius:8, border:"none",
              background:"#f1f5f9", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <MdClose size={16} style={{ color:C.gray500 }}/>
            </button>
          </div>

          {[
            { k:"username", label:"Username", type:"text" },
            { k:"email",    label:"Email",    type:"email" },
          ].map(({ k, label, type }) => (
            <div key={k} style={{ marginBottom:14 }}>
              <label style={{ fontSize:11.5, fontWeight:600, color:C.gray700,
                display:"block", marginBottom:5,
                textTransform:"uppercase", letterSpacing:.4 }}>
                {label}
              </label>
              <input type={type} value={form[k]}
                onChange={e => onChange(k, e.target.value)}
                style={inp(k)} placeholder={label}/>
              {errors[k] && <div style={{ fontSize:11, color:C.red, marginTop:3 }}>{errors[k]}</div>}
            </div>
          ))}

          {/* Role */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11.5, fontWeight:600, color:C.gray700,
              display:"block", marginBottom:5,
              textTransform:"uppercase", letterSpacing:.4 }}>
              Role
            </label>
            <select value={form.role} onChange={e => onChange("role", e.target.value)}
              style={{ ...inp("role"), cursor:"pointer" }}>
              {Object.keys(ROLE_STYLE).map(r => (
                <option key={r} value={r}>{r.replace(/_/g," ")}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:11.5, fontWeight:600, color:C.gray700,
              display:"block", marginBottom:5,
              textTransform:"uppercase", letterSpacing:.4 }}>
              {isEdit ? "New Password (leave blank to keep)" : "Password"}
            </label>
            <div style={{ position:"relative" }}>
              <input type={showPw ? "text" : "password"}
                value={form.password}
                onChange={e => onChange("password", e.target.value)}
                style={inp("password")} placeholder="••••••••"/>
              <button onClick={() => setShowPw(s=>!s)} style={{
                position:"absolute", right:10, top:"50%",
                transform:"translateY(-50%)", border:"none",
                background:"none", cursor:"pointer", color:C.gray400,
                display:"flex", alignItems:"center",
              }}>
                {showPw ? <MdVisibilityOff size={15}/> : <MdVisibility size={15}/>}
              </button>
            </div>
            {errors.password && <div style={{ fontSize:11, color:C.red, marginTop:3 }}>{errors.password}</div>}
          </div>

          <div style={{
            background:C.blue50, borderRadius:9, padding:"10px 13px",
            marginBottom:18, fontSize:11.5, color:C.gray500,
          }}>
            <div style={{ fontWeight:700, color:C.navy, marginBottom:6 }}>
              Permissions for {form.role.replace(/_/g," ")}:
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {(ROLE_PERMISSIONS[form.role] || []).map(p => (
                <span key={p} style={{
                  padding:"2px 8px", borderRadius:20,
                  background:C.greenLt, color:C.green,
                  fontSize:11, fontWeight:600,
                }}>{p}</span>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{
              flex:1, padding:"10px 0", borderRadius:9,
              border:`1.5px solid ${C.blue100}`, background:"#fff",
              fontSize:13, fontWeight:600, color:C.navy,
              cursor:"pointer", fontFamily:"inherit",
            }}>Cancel</button>
            <button onClick={handleSave} disabled={loading} style={{
              flex:1, padding:"10px 0", borderRadius:9, border:"none",
              background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,
              fontSize:13, fontWeight:700, color:"#fff",
              cursor:"pointer", fontFamily:"inherit",
              opacity: loading ? .7 : 1,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              {loading
                ? <><svg style={{ animation:"spin 1s linear infinite" }} width="13" height="13" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity:.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path style={{ opacity:.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg> Saving...</>
                : <><MdCheck size={14}/> {isEdit ? "Save Changes" : "Create User"}</>
              }
            </button>
          </div>
        </form>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

function ConfirmModal({ user, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:50,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      background:"rgba(15,23,42,0.5)", backdropFilter:"blur(4px)",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, width:"100%", maxWidth:360,
        boxShadow:"0 20px 60px rgba(0,0,0,.18)", overflow:"hidden",
      }}>
        <div style={{ height:3, background:"linear-gradient(90deg,#ef4444,#f97316)" }}/>
        <div style={{ padding:"24px 26px" }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.gray800, marginBottom:6 }}>
            Delete User?
          </div>
          <div style={{ fontSize:13, color:C.gray500, marginBottom:14, lineHeight:1.6 }}>
            Delete <b style={{ color:C.gray800 }}>{user?.username}</b>?
            This action cannot be undone.
          </div>
          <div style={{
            background:C.amberLt, border:"1px solid #fde68a",
            borderRadius:9, padding:"10px 13px", marginBottom:18,
            fontSize:12, color:C.amber,
          }}>
            ⚠ You cannot delete your own account.
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel} style={{
              flex:1, padding:"10px 0", borderRadius:9,
              border:`1.5px solid ${C.blue100}`, background:"#fff",
              fontSize:13, fontWeight:600, color:C.navy,
              cursor:"pointer", fontFamily:"inherit",
            }}>Cancel</button>
            <button onClick={onConfirm} disabled={loading} style={{
              flex:1, padding:"10px 0", borderRadius:9, border:"none",
              background:"linear-gradient(135deg,#dc2626,#ef4444)",
              fontSize:13, fontWeight:700, color:"#fff",
              cursor:"pointer", fontFamily:"inherit",
              opacity: loading ? .6 : 1,
            }}>
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCK_USERS = [
  { id:1, username:"nhom7@gmail.com",  email:"nhom7@gmail.com",          role:"Admin",           status:"Active"   },
  { id:2, username:"hr.manager",       email:"hr@company.vn",            role:"HR_Manager",      status:"Active"   },
  { id:3, username:"payroll.manager",  email:"payroll@company.vn",       role:"Payroll_Manager", status:"Active"   },
  { id:4, username:"employee01",       email:"emp01@company.vn",         role:"Employee",        status:"Active"   },
  { id:5, username:"employee02",       email:"emp02@company.vn",         role:"Employee",        status:"Inactive" },
];

export default function UserManagement() {
  // Auth guard — redirect về /login nếu chưa đăng nhập
  // Chỉ Admin mới được vào trang này
  useAuthGuard("Admin");

  const currentUser = getStoredValue("username");

  const [users,     setUsers]     = useState(MOCK_USERS);
  const [search,    setSearch]    = useState("");
  const [selRole,   setSelRole]   = useState("");
  const [modalUser, setModalUser] = useState(undefined); // undefined=closed, null=add, obj=edit
  const [delUser,   setDelUser]   = useState(null);
  const [delLoading,setDelLoading]= useState(false);
  const [toast,     setToast]     = useState(null);
  const [hovRow,    setHovRow]    = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchR = !selRole || u.role === selRole;
    return matchQ && matchR;
  });

  const handleSave = (form) => {
    if (modalUser === null) {
      const newUser = { id: Date.now(), ...form, status:"Active" };
      setUsers(u => [...u, newUser]);
      showToast("User created successfully ✓");
    } else {
      setUsers(u => u.map(x => x.id === modalUser.id ? { ...x, ...form } : x));
      showToast("User updated successfully ✓");
    }
  };

  /* delete */
  const handleDelete = async () => {
    setDelLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setUsers(u => u.filter(x => x.id !== delUser.id));
    setDelLoading(false);
    setDelUser(null);
    showToast("User deleted ✓");
  };

  const cell = (isHov) => ({
    padding:"9px 12px",
    borderBottom:`1px solid ${C.blue50}`,
    background: isHov ? C.blue50 : "#fff",
    verticalAlign:"middle", fontSize:13,
    transition:"background .12s",
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden"
         style={{ fontFamily:"'Inter',sans-serif", background:"#f0f6ff" }}>
      <Sidebar/>
      <div style={{ flex:1, display:"flex", flexDirection:"column",
        overflow:"hidden", minWidth:0 }}>
        <Navbar/>

        <main style={{
          flex:1, overflowY:"auto", padding:"20px 24px",
          scrollbarWidth:"thin", scrollbarColor:"#bfdbfe transparent",
        }}>

          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:C.gray800,
                letterSpacing:-.3, marginBottom:3 }}>
                User Management
              </div>
              <div style={{ fontSize:12, color:C.gray400 }}>
                Manage system accounts and access permissions · Admin only
              </div>
            </div>
            <button onClick={() => setModalUser(null)} style={{
              display:"inline-flex", alignItems:"center", gap:6,
              padding:"8px 16px", borderRadius:8, border:"none",
              background:C.navy, fontSize:13, fontWeight:700,
              color:"#fff", cursor:"pointer", fontFamily:"inherit",
            }}>
              <MdAdd size={15}/> Add User
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
            gap:12, marginBottom:16 }}>
            {[
              { label:"Total Users",   value:users.length,                                       color:C.blue600 },
              { label:"Admin",         value:users.filter(u=>u.role==="Admin").length,           color:C.navy    },
              { label:"Managers",      value:users.filter(u=>u.role.includes("Manager")).length, color:C.amber   },
              { label:"Active",        value:users.filter(u=>u.status==="Active").length,        color:C.green   },
            ].map(s => (
              <div key={s.label} style={{
                background:"#fff", borderRadius:12,
                boxShadow:"0 1px 4px rgba(0,0,0,.07)",
                padding:"14px 18px",
              }}>
                <div style={{ fontSize:11.5, color:C.gray500, fontWeight:500, marginBottom:6 }}>
                  {s.label}
                </div>
                <div style={{ fontSize:24, fontWeight:800, color:s.color,
                  lineHeight:1, letterSpacing:-.4 }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:"#fff", borderRadius:14,
            boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:14 }}>

            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:13.5, fontWeight:700, color:C.gray800 }}>
                  System Users
                </div>
                <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>
                  {filtered.length} of {users.length} users
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{
                  display:"flex", alignItems:"center", gap:7,
                  padding:"6px 11px", borderRadius:7,
                  border:`1.5px solid ${C.blue100}`, background:"#fff",
                }}>
                  <MdSearch size={13} style={{ color:C.gray400 }}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="Search user..."
                    style={{ border:"none", outline:"none", background:"none",
                      fontFamily:"inherit", fontSize:12, color:C.gray700, width:150 }}/>
                </div>
                <select value={selRole} onChange={e=>setSelRole(e.target.value)}
                  style={{
                    padding:"6px 11px", borderRadius:7,
                    border:`1.5px solid ${C.blue100}`, background:"#fff",
                    fontFamily:"inherit", fontSize:12, color:C.gray700,
                    cursor:"pointer", outline:"none",
                  }}>
                  <option value="">All Roles</option>
                  {Object.keys(ROLE_STYLE).map(r=>(
                    <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                  ))}
                </select>
                {(search||selRole) && (
                  <button onClick={()=>{setSearch("");setSelRole("");}} style={{
                    padding:"5px 10px", borderRadius:7,
                    border:`1.5px solid #fca5a5`, background:C.redLt,
                    color:C.red, fontSize:12, fontWeight:600,
                    cursor:"pointer", fontFamily:"inherit",
                  }}>✕ Clear</button>
                )}
              </div>
            </div>

            {/* table */}
            <div style={{
              maxHeight:"calc(100vh - 380px)", overflowY:"auto",
              borderRadius:8, border:`1px solid ${C.blue100}`,
            }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    {["#","User","Email","Role","Status","Permissions","Actions"].map(h=>(
                      <th key={h} style={{
                        fontSize:11, fontWeight:700, color:C.blue600,
                        textTransform:"uppercase", letterSpacing:.5,
                        background:C.blue50, borderBottom:`1.5px solid ${C.blue100}`,
                        padding:"8px 12px", textAlign:"left",
                        position:"sticky", top:0, zIndex:1,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{
                      textAlign:"center", padding:40,
                      fontSize:12, color:C.gray400,
                    }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>👤</div>
                      {search||selRole ? "No users match your filters." : "No users found."}
                    </td></tr>
                  )}

                  {filtered.map((u, i) => {
                    const rs    = ROLE_STYLE[u.role] || ROLE_STYLE["Employee"];
                    const perms = ROLE_PERMISSIONS[u.role] || [];
                    const isHov = hovRow === i;
                    const isSelf = u.username === currentUser;

                    return (
                      <tr key={u.id}
                          onMouseEnter={()=>setHovRow(i)}
                          onMouseLeave={()=>setHovRow(null)}
                          style={{ cursor:"default" }}>

                        <td style={cell(isHov)}>
                          <span style={{
                            fontSize:11, color:C.gray400, fontFamily:"monospace",
                            background:"#f1f5f9", padding:"1px 7px", borderRadius:5,
                          }}>#{u.id}</span>
                        </td>

                        {/* User */}
                        <td style={cell(isHov)}>
                          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                            <div style={{
                              width:30, height:30, borderRadius:"50%", flexShrink:0,
                              background:`linear-gradient(135deg,${C.navy},${C.blue600})`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:11, fontWeight:700, color:"#fff",
                            }}>
                              {u.username.slice(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize:12.5, fontWeight:600, color:C.gray800 }}>
                                {u.username}
                                {isSelf && (
                                  <span style={{
                                    marginLeft:6, fontSize:10, fontWeight:700,
                                    padding:"1px 6px", borderRadius:10,
                                    background:C.blue100, color:C.blue600,
                                  }}>You</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ ...cell(isHov), color:C.gray500 }}>{u.email}</td>

                        {/* Role */}
                        <td style={cell(isHov)}>
                          <span style={{
                            padding:"3px 10px", borderRadius:20,
                            fontSize:11, fontWeight:600,
                            background:rs.bg, color:rs.text,
                          }}>
                            {u.role.replace(/_/g," ")}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={cell(isHov)}>
                          <span style={{
                            padding:"3px 10px", borderRadius:20,
                            fontSize:11, fontWeight:600,
                            background: u.status==="Active" ? C.greenLt : "#f1f5f9",
                            color:      u.status==="Active" ? C.green   : C.gray400,
                          }}>
                            {u.status}
                          </span>
                        </td>

                        <td style={cell(isHov)}>
                          <span style={{
                            padding:"3px 10px", borderRadius:20,
                            fontSize:11, fontWeight:600,
                            background:C.blue100, color:C.blue600,
                          }}>
                            {perms.length} modules
                          </span>
                        </td>

                        <td style={cell(isHov)} onClick={e=>e.stopPropagation()}>
                          <div style={{
                            display:"flex", gap:6,
                            opacity: isHov ? 1 : 0, transition:"opacity .15s",
                          }}>
                            <button title="Edit" onClick={()=>setModalUser(u)}
                              style={{
                                width:30, height:30, borderRadius:8, border:"none",
                                background:C.blue50, color:C.blue600,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                cursor:"pointer",
                              }}>
                              <MdEdit size={14}/>
                            </button>
                            <button title="Delete"
                              disabled={isSelf}
                              onClick={()=>!isSelf && setDelUser(u)}
                              style={{
                                width:30, height:30, borderRadius:8, border:"none",
                                background: isSelf ? "#f8fafc" : C.redLt,
                                color:      isSelf ? C.gray400  : C.red,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                cursor: isSelf ? "not-allowed" : "pointer",
                              }}>
                              <MdDelete size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {users.length > 0 && (
              <div style={{ marginTop:8, fontSize:11, color:C.gray400,
                display:"flex", justifyContent:"space-between" }}>
                <span>Showing {filtered.length} of {users.length} users</span>
                <span>Admin only · UC.02 RBAC</span>
              </div>
            )}
          </div>

        </main>
      </div>

      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSave={handleSave}
        />
      )}

      {delUser && (
        <ConfirmModal
          user={delUser}
          onConfirm={handleDelete}
          onCancel={() => setDelUser(null)}
          loading={delLoading}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}