import { useState } from "react";
import { BsSearch, BsBell, BsGear } from "react-icons/bs";

const C = {
  navy: "#1e3a8a", blue600: "#2563eb",
  blue500: "#3b82f6", blue300: "#93c5fd",
  blue100: "#dbeafe", blue50: "#eff6ff",
  gray700: "#334155", gray800: "#1e293b",
  red: "#dc2626",
};

export default function Navbar({ search, onSearch, alertCount = 0 }) {
  const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "Admin";
  const role     = sessionStorage.getItem("role")     || localStorage.getItem("role")     || "Admin";
  const initials = username.slice(0, 2).toUpperCase();

  const [focused, setFocused] = useState(false);

  return (
    <div style={{
      height: 48, background: "#fff",
      borderBottom: `1px solid ${C.blue100}`,
      display: "flex", alignItems: "center",
      padding: "0 22px", gap: 12, flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: focused ? "#fff" : C.blue50,
        border: `1.5px solid ${focused ? C.blue500 : C.blue100}`,
        borderRadius: 9, padding: "7px 13px", width: 260,
        boxShadow: focused ? "0 0 0 3px rgba(59,130,246,.1)" : "none",
        transition: "all .18s",
      }}>
        <BsSearch size={12} style={{ color: C.blue300, flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search employees, reports..."
          style={{
            border: "none", background: "none", outline: "none",
            fontFamily: "'Inter',sans-serif", fontSize: 12.5,
            color: C.gray700, width: "100%",
          }}
        />
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {/* Bell */}
        <div style={{
          width: 34, height: 34, background: C.blue50,
          border: `1.5px solid ${C.blue100}`, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: C.blue500, position: "relative",
        }}>
          <BsBell size={15} />
          {alertCount > 0 && (
            <span style={{
              position: "absolute", top: 5, right: 5,
              width: 7, height: 7, background: C.red,
              borderRadius: "50%", border: "2px solid #fff",
            }} />
          )}
        </div>

        {/* Gear */}
        <div style={{
          width: 34, height: 34, background: C.blue50,
          border: `1.5px solid ${C.blue100}`, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: C.blue500,
        }}>
          <BsGear size={15} />
        </div>

        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: "50%", background: C.navy,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff",
          border: `2px solid ${C.blue100}`, cursor: "pointer",
        }}>{initials}</div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gray800 }}>{username}</div>
          <div style={{ fontSize: 10.5, color: C.blue600, fontWeight: 600, textTransform: "capitalize" }}>{role}</div>
        </div>
      </div>
    </div>
  );
}