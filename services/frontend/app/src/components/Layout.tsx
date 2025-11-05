import { AppBar, Toolbar, Box, Button, Avatar, IconButton } from "@mui/material";
import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { text } from "stream/consumers";

export const Layout: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { text: "Home", path: "/" },
    { text: "Exams", path: "/exams" },
    { text: "Venues", path: "/venues" },
    { text: "Calendar", path: "/calendar" },
    { text: "Invigilators", path: "/invigilators" }
  ];
    
  return (
    <>
      <AppBar elevation={1} color="primary">
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  color={location.pathname === item.path ? "secondary" : "inherit"}
                  size="large"
                  style={{ fontWeight:"bold", fontSize: "16px", textDecoration: location.pathname === item.path ? "underline" : "none" }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>

            <IconButton component={Link} to="/profile">
              <Avatar sx={{ bgcolor: "secondary.main", width: 40, height: 40, color: "black", fontWeight: "bold" }}>A</Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* space */}
      <Toolbar />

      <Box component="main" sx={{ p: 2 }}>
        <Outlet />
      </Box>
    </>
  );
};