import { AppBar, Toolbar, Box, Button, Avatar, IconButton } from "@mui/material";
import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { text } from "stream/consumers";

export const AdminLayout: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { text: "Home", path: "/admin" },
    { text: "Exams", path: "/admin/exams" },
    { text: "Venues", path: "/admin/venues" },
    { text: "Calendar", path: "/admin/calendar" },
    { text: "Invigilators", path: "/admin/invigilators" }
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
                  sx= {{
                    fontWeight: "bold",
                    fontSize: "16px",
                    textDecoration: location.pathname === item.path ? "bold" : "none",
                    color: location.pathname === item.path ? "secondary.main" : "inherit",
                    backgroundColor: location.pathname === item.path ? "#006fcb" : "none",
                    "&:hover": {
                      color: "secondary.main",
                      backgroundColor: "#006fcb",
                    },
                  }}
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