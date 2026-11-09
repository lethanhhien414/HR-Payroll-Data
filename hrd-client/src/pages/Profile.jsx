
import { useEffect, useState } from "react";
import { useNavigate }         from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import {
  MdPerson, MdEmail, MdAdminPanelSettings,
  MdEdit, MdLogout, MdShield, MdAccessTime,
  MdVerified, MdLock, MdSchedule, MdDns,
} from "react-icons/md";
import { BsShieldFillCheck, BsPersonBadge, BsGrid3X3GapFill } from "react-icons/bs";
import { logoutApi } from "../services/authApi";

function getStored(key) {
  try { return localStorage.getItem(key) || sessionStorage.getItem(key) || null; }
  catch { return null; }
}

const C = {
  navy:"#1e3a8a", navyMid:"#1e40af", blue600:"#2563eb",
  blue100:"#dbeafe", blue50:"#eff6ff",
  gray900:"#0f172a", gray800:"#1e293b", gray700:"#334155",
  gray500:"#64748b", gray400:"#94a3b8", gray100:"#f1f5f9",
  green:"#16a34a", greenLt:"#dcfce7",
  amber:"#d97706", amberLt:"#fef3c7",
  red:"#dc2626", redLt:"#fee2e2",
};

const PERMISSIONS = [
  "Dashboard","Employees","Payroll","Attendance",
  "Departments","Positions","Reports","Alerts","User Management",
];

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
      <div style={{
        width:32, height:32, borderRadius:8, background:C.navy,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <Icon size={16} color="#fff"/>
      </div>
      <div>
        <div style={{ fontSize:13.5, fontWeight:700, color:C.gray800 }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:C.gray400, marginTop:1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate  = useNavigate();
  const username  = getStored("username") || "—";
  const role      = getStored("role")     || "Admin";
  const initials  = username.slice(0, 2).toUpperCase();

  const [sessionStart] = useState(() => {
    try {
      const t = getStored("loginTime");
      if (t) return new Date(t).toLocaleString("en-GB", { dateStyle:"medium", timeStyle:"short" });
    } catch {}
    return new Date().toLocaleString("en-GB", { dateStyle:"medium", timeStyle:"short" });
  });

  useEffect(() => {
    try {
      if (!getStored("loginTime")) {
        const s = localStorage.getItem("token") ? localStorage : sessionStorage;
        s.setItem("loginTime", new Date().toISOString());
      }
    } catch {}
  }, []);

  const handleLogout = async () => {
    await logoutApi();
    navigate("/", { replace: true });
  };

  return (
    <div style={{ display:"flex", width:"100%", height:"100vh", overflow:"hidden",
      fontFamily:"'Inter',sans-serif", background:"#f0f6ff" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <Sidebar/>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar/>

        <div style={{
          flex:1, overflowY:"auto", padding:"14px 16px",
          scrollbarWidth:"thin", scrollbarColor:"#dbeafe transparent",
        }}>

          <div style={{ display:"flex", alignItems:"flex-start",
            justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{
                  width:32, height:32, borderRadius:8, background:C.navy,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                }}>
                  <BsPersonBadge size={16} color="#fff"/>
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:C.gray900, letterSpacing:-.3 }}>
                  Account Profile
                </div>
              </div>
              <div style={{ fontSize:11, color:C.gray400, marginLeft:42, fontWeight:500 }}>
                Logged-in account details, permissions, and security settings
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                display:"inline-flex", alignItems:"center", gap:6,
                padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                background:C.redLt, color:C.red, border:`1.5px solid #fca5a5`,
                cursor:"pointer", fontFamily:"inherit",
              }}
            >
              <MdLogout size={13}/> Sign Out
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:12, alignItems:"start" }}>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              <div style={{
                background:"#fff", borderRadius:14,
                boxShadow:"0 2px 8px rgba(0,0,0,.06)", overflow:"hidden",
              }}>

                <div style={{
                  height:72,
                  background:`linear-gradient(135deg,${C.navy} 0%,${C.blue600} 100%)`,
                  position:"relative",
                }}>
                  <div style={{
                    position:"absolute", bottom:-28, left:20,
                    width:56, height:56, borderRadius:"50%",
                    background:`linear-gradient(135deg,${C.navy},${C.blue600})`,
                    border:"3px solid #fff",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:20, fontWeight:800, color:"#fff",
                    boxShadow:"0 4px 12px rgba(30,58,138,.3)",
                  }}>
                    {initials}
                  </div>
                </div>

                <div style={{ padding:"36px 20px 20px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:C.gray800 }}>{username}</span>
                    <MdVerified size={15} style={{ color:C.blue600, flexShrink:0 }}/>
                  </div>
                  <span style={{
                    display:"inline-block", padding:"2px 10px", borderRadius:20,
                    background:C.blue100, color:C.navy,
                    fontSize:11, fontWeight:700, marginBottom:16,
                  }}>
                    {role}
                  </span>

                  {[
                    { icon:<MdPerson size={13}/>,           label:"Username",      value: username },
                    { icon:<MdEmail size={13}/>,            label:"Email",         value: username },
                    { icon:<MdAdminPanelSettings size={13}/>,label:"Role",         value: role },
                    { icon:<MdAccessTime size={13}/>,       label:"Session start", value: sessionStart },
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{
                      display:"flex", gap:10, alignItems:"flex-start",
                      padding:"8px 0", borderBottom:`1px solid ${C.blue50}`,
                    }}>
                      <div style={{
                        width:26, height:26, borderRadius:7, flexShrink:0,
                        background:C.blue50, color:C.blue600,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        marginTop:1,
                      }}>{icon}</div>
                      <div>
                        <div style={{ fontSize:10, color:C.gray400, fontWeight:500, textTransform:"uppercase", letterSpacing:.4 }}>
                          {label}
                        </div>
                        <div style={{ fontSize:12.5, color:C.gray800, fontWeight:600, wordBreak:"break-all" }}>
                          {value}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{
                    marginTop:14, display:"flex", alignItems:"center", gap:8,
                    padding:"7px 12px", borderRadius:8, background:C.greenLt,
                  }}>
                    <div style={{
                      width:7, height:7, borderRadius:"50%", background:C.green,
                      boxShadow:`0 0 0 3px rgba(22,163,74,.2)`,
                    }}/>
                    <span style={{ fontSize:12, fontWeight:600, color:C.green }}>Active session</span>
                  </div>

                  <button
                    onClick={() => alert("Change password feature coming soon.")}
                    style={{
                      marginTop:10, width:"100%", padding:"8px 0", borderRadius:8,
                      border:`1.5px solid ${C.blue100}`, background:"#fff",
                      color:C.navy, fontSize:12, fontWeight:700,
                      cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                    }}
                  >
                    <MdEdit size={13}/> Change Password
                  </button>
                </div>
              </div>

            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              <div style={{
                background:"#fff", borderRadius:14,
                boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:14,
              }}>
                <SectionHeader
                  icon={BsGrid3X3GapFill}
                  title="Access Permissions"
                  subtitle={`${PERMISSIONS.length} modules granted to ${role}`}
                />
                <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {PERMISSIONS.map(p => (
                    <span key={p} style={{
                      padding:"4px 12px", borderRadius:20,
                      background:C.greenLt, color:C.green,
                      fontSize:12, fontWeight:600,
                      display:"flex", alignItems:"center", gap:5,
                    }}>
                      ✓ {p}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{
                background:"#fff", borderRadius:14,
                boxShadow:"0 2px 8px rgba(0,0,0,.06)", padding:14,
              }}>
                <SectionHeader
                  icon={BsShieldFillCheck}
                  title="Security"
                  subtitle="Authentication and authorization details"
                />

                {[
                  { icon:<MdLock size={14}/>,     label:"Authentication",  value:"JSON Web Token (JWT)" },
                  { icon:<MdShield size={14}/>,   label:"Authorization",   value:"Role-Based Access Control (RBAC)" },
                  { icon:<MdSchedule size={14}/>, label:"Token expiry",    value:"60 minutes" },
                  { icon:<MdDns size={14}/>,      label:"System",          value:"HR Data Dashboard · System Integration" },
                ].map(({ icon, label, value }, i, arr) => (
                  <div key={label} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"10px 0",
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.blue50}` : "none",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                      <div style={{
                        width:28, height:28, borderRadius:7,
                        background:C.blue50, color:C.blue600,
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                      }}>{icon}</div>
                      <span style={{ fontSize:12.5, color:C.gray500 }}>{label}</span>
                    </div>
                    <span style={{
                      fontSize:12.5, fontWeight:600, color:C.gray800,
                      textAlign:"right", maxWidth:"55%",
                    }}>{value}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}