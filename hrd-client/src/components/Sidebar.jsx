import { NavLink, useNavigate } from "react-router-dom";
import {
  BsGridFill, BsPeopleFill, BsCreditCard2FrontFill,
  BsCalendarCheckFill, BsBarChartLineFill, BsBellFill,
  BsPersonCircle, BsBoxArrowRight, BsBuildingFill, BsBriefcaseFill,
} from "react-icons/bs";

const C = {
  navy: "#1e3a8a", navyMid: "#1e40af",
  red: "#dc2626",
};

const NAV = [
  { icon: BsGridFill,             label: "Dashboard",  path: "/dashboard" },
  { icon: BsPeopleFill,           label: "Employee",   path: "/employees" },
  { icon: BsCreditCard2FrontFill, label: "Payroll",    path: "/payroll" },
  { icon: BsCalendarCheckFill,    label: "Attendance", path: "/attendance" },
  { icon: BsBuildingFill,         label: "Department", path: "/departments" },
  { icon: BsBriefcaseFill,        label: "Position",   path: "/positions" },
  { icon: BsBarChartLineFill,     label: "Reports",    path: "/reports" },
  { icon: BsBellFill,             label: "Alerts",     path: "/alerts", badge: true },
  { icon: BsPersonCircle,         label: "Profile",    path: "/profile" }, // ✅ route riêng
];

export default function Sidebar({ alertCount = 0 }) {
  const navigate = useNavigate();
  const role     = sessionStorage.getItem("role")     || localStorage.getItem("role")     || "admin";
  const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "Admin";
  const initials = username.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={{
      width: 210, flexShrink: 0,
      background: "linear-gradient(180deg,#dbeafe 0%,#93c5fd 100%)",
      display: "flex", flexDirection: "column",
      padding: "22px 12px", height: "100vh", overflowY: "auto",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px", marginBottom: 26 }}>
        <div style={{
          width: 34, height: 34, background: C.navy, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>SI</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, lineHeight: 1.3 }}>
          System<br/>Integration
        </div>
      </div>

      {/* Nav items */}
      {NAV.map(({ icon: Icon, label, path, badge }) => (
        <NavLink key={path} to={path} style={({ isActive }) => ({
          display: "flex", alignItems: "center", gap: 9,
          padding: "9px 12px", borderRadius: 9,
          color: C.navy, fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          cursor: "pointer", textDecoration: "none",
          marginBottom: 3,
          background: isActive ? "#fff" : "transparent",
          boxShadow: isActive ? "0 2px 8px rgba(0,0,0,.06)" : "none",
          transition: "all .18s",
        })}>
          <Icon size={15} style={{ flexShrink: 0 }}/>
          {label}
          {badge && alertCount > 0 && (
            <span style={{
              marginLeft: "auto", background: C.red, color: "#fff",
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
            }}>{alertCount}</span>
          )}
        </NavLink>
      ))}

      {/* Footer user */}
      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid rgba(30,58,138,.15)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "9px 10px", background: "rgba(255,255,255,.5)",
          borderRadius: 9, cursor: "pointer", marginBottom: 6,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", background: C.navy,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{username}</div>
            <div style={{ fontSize: 10, color: C.navyMid, opacity: .75, textTransform: "capitalize" }}>{role}</div>
          </div>
        </div>

        {/* Logout */}
        <div
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "8px 12px", borderRadius: 9,
            color: C.red, fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "background .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <BsBoxArrowRight size={14}/>
          Logout
        </div>
      </div>
    </div>
  );
}