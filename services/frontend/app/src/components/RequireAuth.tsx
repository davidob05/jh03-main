import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authTokenKey } from "../utils/api";

export const RequireAuth: React.FC = () => {
  const location = useLocation();
  const token = typeof localStorage !== "undefined" ? localStorage.getItem(authTokenKey) : null;

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};
