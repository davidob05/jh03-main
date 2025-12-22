import React, { useState } from "react";
import { Box, Button, TextField, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { apiBaseUrl, authTokenKey } from "../utils/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  React.useEffect(() => {
    if (localStorage.getItem(authTokenKey)) {
      navigate(fromPath, { replace: true });
    }
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

      const token = data.token;
      if (!token) {
        setErrorMsg("Invalid server response.");
        setLoading(false);
        return;
      }

      localStorage.setItem(authTokenKey, token);
      navigate(fromPath, { replace: true });
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
