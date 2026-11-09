// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login            from "./pages/Login";
import Dashboard        from "./pages/Dashboard";
import Employees        from "./pages/Employees";
import EmployeeAdd      from "./pages/EmployeeAdd";
import EmployeeEdit     from "./pages/EmployeeEdit";
import EmployeeDelete   from "./pages/EmployeeDelete";
import Departments      from "./pages/Departments";
import DepartmentAdd    from "./pages/DepartmentAdd";
import DepartmentEdit   from "./pages/DepartmentEdit";
import Positions        from "./pages/Positions";
import PositionAdd      from "./pages/PositionAdd";
import PositionEdit     from "./pages/PositionEdit";
import Attendance       from "./pages/Attendance";
import Payroll          from "./pages/Payroll";
import PayrollEdit      from "./pages/PayrollEdit";
import SalaryHistory    from "./pages/SalaryHistory";
import Reports          from "./pages/Reports";
import Alerts           from "./pages/Alerts";
import UserManagement   from "./pages/UserManagement";
import Profile          from "./pages/Profile";          
import DepartmentDetail from "./pages/DepartmentDetail";
import PositionDetail   from "./pages/PositionDetail";

function getStored(key) {
  try { return localStorage.getItem(key) || sessionStorage.getItem(key) || null; }
  catch { return null; }
}

function Guard({ children }) {
  const role  = getStored("role");
  const token = getStored("token");
  if (!role || !token) return <Navigate to="/" replace />;
  return children;
}

function AdminGuard({ children }) {
  const role  = getStored("role");
  const token = getStored("token");
  if (!role || !token)  return <Navigate to="/" replace />;
  if (role !== "Admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ── */}
        <Route path="/" element={<Login />} />

        {/* ── Dashboard ── */}
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />

        {/* ── Employee ── */}
        <Route path="/employees"            element={<Guard><Employees /></Guard>} />
        <Route path="/employees/add"        element={<Guard><EmployeeAdd /></Guard>} />
        <Route path="/employees/:id/edit"   element={<Guard><EmployeeEdit /></Guard>} />
        <Route path="/employees/:id/delete" element={<Guard><EmployeeDelete /></Guard>} />

        {/* ── Department ── */}
        <Route path="/departments"          element={<Guard><Departments /></Guard>} />
        <Route path="/departments/add"      element={<Guard><DepartmentAdd /></Guard>} />
        <Route path="/departments/:id/edit" element={<Guard><DepartmentEdit /></Guard>} />
        <Route path="/departments/:id" element={<DepartmentDetail />} />

        {/* ── Position ── */}
        <Route path="/positions"            element={<Guard><Positions /></Guard>} />
        <Route path="/positions/add"        element={<Guard><PositionAdd /></Guard>} />
        <Route path="/positions/:id"        element={<Guard><PositionDetail /></Guard>} />
        <Route path="/positions/:id/edit"   element={<Guard><PositionEdit /></Guard>} />

        {/* ── Attendance ── */}
        <Route path="/attendance"           element={<Guard><Attendance /></Guard>} />

        {/* ── Payroll ── */}
        <Route path="/payroll"              element={<Guard><Payroll /></Guard>} />
        <Route path="/payroll/edit/:id"     element={<Guard><PayrollEdit /></Guard>} />
        <Route path="/payroll/history/:id"  element={<Guard><SalaryHistory /></Guard>} />

        {/* ── Reports ── */}
        <Route path="/reports"              element={<Guard><Reports /></Guard>} />

        {/* ── Alerts ── */}
        <Route path="/alerts"               element={<Guard><Alerts /></Guard>} />

        {/* ── Profile ── */}
        <Route path="/profile"              element={<Guard><Profile /></Guard>} />  {/* ✅ thêm */}

        {/* ── User Management — Admin only (UC.02 RBAC) ── */}
        <Route path="/users"                element={<AdminGuard><UserManagement /></AdminGuard>} />

        {/* ── 404 fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}