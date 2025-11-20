import React, { useState } from "react";
import { Box, Button, TextField, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await axios.post("/api/auth/login/", {
        email,
        password,
      });

      // Expecting Django to return:
      // { token: "..." } or { access: "..." }
      const token = res.data.token || res.data.access;

      if (!token) {
        setErrorMsg("Invalid server response.");
        setLoading(false);
        return;
      }

      localStorage.setItem("authToken", token);

      navigate("/dashboard"); // Redirect after login
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Login failed.");
    }

    setLoading(false);
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
            label="Email"
            variant="outlined"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
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