import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authTokenKey, getStoredRole } from "../utils/api";

interface RequireRoleProps {
  role: "admin" | "invigilator";
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role }) => {
  const location = useLocation();
  const token = typeof localStorage !== "undefined" ? localStorage.getItem(authTokenKey) : null;
  const storedRole = getStoredRole();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!storedRole) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (storedRole !== role) {
    const redirectPath = storedRole === "admin" ? "/admin" : "/invigilator";
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};
