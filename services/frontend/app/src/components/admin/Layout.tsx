import { AppBar, Toolbar, Box, Button, Avatar, IconButton, Tooltip, Menu, MenuItem, Divider, Typography } from "@mui/material";
import React from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { apiBaseUrl, apiFetch, clearAuthSession, getStoredUser } from "../../utils/api";
import { setAdminLayoutUi, useAppDispatch, useAppSelector } from "../../state/store";

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { accountMenuOpen } = useAppSelector((state) => state.adminTables.adminLayoutUi);
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);

  const menuItems = [
    { text: "Home", path: "/admin" },
    { text: "Exams", path: "/admin/exams" },
    { text: "Venues", path: "/admin/venues" },
    { text: "Calendar", path: "/admin/calendar" },
    { text: "Students", path: "/admin/students" },
    { text: "Invigilators", path: "/admin/invigilators" }
  ];

  const handleLogout = async () => {
    try {
      await apiFetch(`${apiBaseUrl}/auth/logout/`, { method: "POST" });
    } catch (_err) {
      // Ignore failures; still clear local state.
    } finally {
      clearAuthSession();
      navigate("/login", { replace: true });
    }
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
    dispatch(setAdminLayoutUi({ accountMenuOpen: true }));
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    dispatch(setAdminLayoutUi({ accountMenuOpen: false }));
  };

  const user = getStoredUser();
  const displayName = user?.username || user?.email || "User";
  const avatarSrc = (user as any)?.avatar || undefined;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
    
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

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title={displayName}>
                <IconButton onClick={openMenu} aria-label="Account menu">
                  <Avatar
                    src={avatarSrc}
                    sx={{ bgcolor: avatarSrc ? "transparent" : "secondary.main", width: 40, height: 40, color: "black", fontWeight: "bold" }}
                  >
                    {avatarSrc ? "" : initials}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={menuAnchor}
                open={accountMenuOpen}
                onClose={closeMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                  elevation: 4,
                  sx: {
                    borderRadius: 3,
                    minWidth: 220,
                    p: 1,
                  },
                }}
              >
                <Box sx={{ px: 1.5, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {displayName}
                  </Typography>
                  {user?.email && (
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  )}
                </Box>
                <Divider sx={{ mb: 0.5 }} />
                <MenuItem component={Link} to="/admin/profile" onClick={closeMenu} sx={{ borderRadius: 2 }}>
                  Account
                </MenuItem>
                {user?.invigilator_id && (
                  <MenuItem component={Link} to="/invigilator" onClick={closeMenu} sx={{ borderRadius: 2 }}>
                    View Invigilator Dashboard
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                  sx={{ borderRadius: 2, color: "error.main", fontWeight: 600 }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </Box>
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
