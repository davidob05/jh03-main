import React, { useState } from "react";
import { Box, Button, TextField, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { apiBaseUrl, getAuthToken, getStoredRole, setAuthSession } from "../utils/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const resolveRedirect = (role: string | null, requested: string) => {
    if (role === "admin") {
      return requested && requested.startsWith("/admin") ? requested : "/admin";
    }
    if (role === "invigilator") {
      return requested && requested.startsWith("/invigilator") ? requested : "/invigilator";
    }
    return "/login";
  };

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const role = getStoredRole();
    const target = resolveRedirect(role, fromPath);
    navigate(target, { replace: true });
  }, [fromPath, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${apiBaseUrl}/auth/token/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.detail || data?.non_field_errors?.[0] || "Login failed.");
        setLoading(false);
        return;
      }

      const sessionToken = data.session || data.token;
      if (!sessionToken) {
        setErrorMsg("Invalid server response.");
        setLoading(false);
        return;
      }

      // Use per-login UserSession token so DRF's UserSessionAuthentication accepts requests
      setAuthSession(sessionToken, data.user);
      const role = data.user?.role || (data.user?.is_staff || data.user?.is_superuser ? "admin" : "invigilator");
      const target = resolveRedirect(role, fromPath);
      navigate(target, { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: 400,
          p: 4,
          borderRadius: 3,
        }}
      >
        <Typography variant="h4" fontWeight={600} textAlign="center" mb={3}>
          Sign in
        </Typography>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Email or Username"
            variant="outlined"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Password"
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
            sx={{ mt: 3, py: 1.2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Log in"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
