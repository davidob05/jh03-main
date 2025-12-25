import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Divider,
  Stack,
  Switch,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillButton } from "../../components/PillButton";
import { PhotoCamera, Visibility, VisibilityOff, Logout } from "@mui/icons-material";

export const AdminProfile: React.FC = () => {
  const navigate = useNavigate();

  const [profileDetails] = useState({
    name: "Test Name",
    email: "test@example.com",
    phone: "07123 456789",
  });

  const [name, setName] = useState(profileDetails.name);
  const [email, setEmail] = useState(profileDetails.email);
  const [phone, setPhone] = useState(profileDetails.phone);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [lastLogin] = useState("2025-12-25 09:12 (Glasgow, UK)");

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState<"instant" | "daily" | "off">("instant");
  const [notifySms, setNotifySms] = useState(false);
  const [notifyPush, setNotifyPush] = useState(true);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState(false);

  const sessions = [
    { device: "Chrome on Windows", location: "Glasgow, UK", lastActive: "Today 09:45" },
    { device: "Safari on iPhone", location: "Glasgow, UK", lastActive: "Yesterday 20:12" },
  ];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const passwordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score >= 4) return "Strong";
    if (score >= 3) return "Medium";
    if (score > 0) return "Weak";
    return "Not set";
  };

  const handlePhotoChange = (file?: File | null) => {
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setSnackbar({ open: true, message: "Photo selected (not uploaded in demo)", severity: "success" });
  };

  const handleSaveProfile = () => {
    setSnackbar({ open: true, message: "Profile details updated", severity: "success" });
    setLastUpdated("Just now");
  };

  const handleSavePassword = () => {
    if (passwords.next !== passwords.confirm) {
      setSnackbar({ open: true, message: "New passwords do not match", severity: "error" });
      return;
    }
    setSnackbar({ open: true, message: "Password updated", severity: "success" });
    setPasswords({ current: "", next: "", confirm: "" });
  };

  const handleTestNotification = () => {
    setSnackbar({ open: true, message: "Test notification sent", severity: "success" });
  };

  const handleExportData = () => {
    setSnackbar({ open: true, message: "Data export started", severity: "success" });
  };

  const handleDeleteAccount = () => {
    setSnackbar({ open: true, message: "Account deletion flow not implemented in demo", severity: "error" });
  };

  const handleSignOutAll = () => {
    setSnackbar({ open: true, message: "Signed out of all sessions", severity: "success" });
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", mt: 4, pb: 6 }}>

      {/* Profile overview */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ textAlign: "center" }}>
          <Avatar
            sx={{
              width: 110,
              height: 110,
              mx: "auto",
              bgcolor: "primary.main",
              fontSize: "3rem",
            }}
            src={photoPreview || undefined}
          >
            {getInitials(profileDetails.name)}
          </Avatar>

          <Typography variant="h5" sx={{ mt: 2, fontWeight: 600 }}>
            {profileDetails.name}
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            {profileDetails.email}
          </Typography>

          <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
            <PillButton
              variant="contained"
              color="primary"
              startIcon={<PhotoCamera />}
              component="label"
            >
              Upload / Change Photo
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
              />
            </PillButton>
            {photoPreview && (
              <PillButton variant="outlined" color="error" onClick={() => handlePhotoChange(null)}>
                Remove
              </PillButton>
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Last updated: {lastUpdated} • Last login: {lastLogin}
          </Typography>
        </Box>
      </Card>

      {/* Personal information */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Personal Information
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={3}>
          {/* Display Name */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Display Name
            </Typography>

            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
              <TextField fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} />
              <PillButton variant="contained" onClick={handleSaveProfile}>Save</PillButton>
            </Stack>
          </Box>

          {/* Email */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>

            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
              <TextField fullWidth size="small" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              <PillButton variant="contained" onClick={handleSaveProfile}>Save</PillButton>
            </Stack>
          </Box>

          {/* Phone */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Phone Number
            </Typography>

            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
              <TextField fullWidth size="small" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <PillButton variant="contained" onClick={handleSaveProfile}>Save</PillButton>
            </Stack>
          </Box>
        </Stack>
      </Card>

      {/* Security */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Password & Security
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={3}>
          <Stack spacing={1.5}>
            {["current", "next", "confirm"].map((key) => (
              <TextField
                key={key}
                type={showPasswords ? "text" : "password"}
                label={
                  key === "current"
                    ? "Current password"
                    : key === "next"
                    ? "New password"
                    : "Confirm new password"
                }
                value={(passwords as any)[key]}
                onChange={(e) => setPasswords((prev) => ({ ...prev, [key]: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPasswords((p) => !p)} edge="end">
                        {showPasswords ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            ))}
            <Typography variant="caption" color="text.secondary">
              Strength: {passwordStrength(passwords.next)}
            </Typography>
            <PillButton variant="contained" onClick={handleSavePassword}>
              Update Password
            </PillButton>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Two-Factor Authentication</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch disabled /> {/* placeholder */}
              <Tooltip title="Manage 2FA setup">
                <PillButton variant="outlined" size="small" onClick={() => navigate("/admin/profile/two-factor")}>
                  Manage
                </PillButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Active sessions</Typography>
            <Stack spacing={1}>
              {sessions.map((s, idx) => (
                <Card key={idx} variant="outlined">
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontWeight={600}>{s.device}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {s.location} • Last active {s.lastActive}
                        </Typography>
                      </Box>
                      <Tooltip title="Sign out this session (demo only)">
                        <IconButton size="small">
                          <Logout fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
            <PillButton variant="outlined" color="error" onClick={handleSignOutAll}>
              Sign out of all sessions
            </PillButton>
          </Stack>
        </Stack>
      </Card>

      {/* Preferences */}
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Preferences
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Dark Mode</Typography>
            <Switch
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Email Notifications</Typography>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Email frequency</InputLabel>
              <Select
                label="Email frequency"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value as any)}
              >
                <MenuItem value="instant">Instant</MenuItem>
                <MenuItem value="daily">Daily summary</MenuItem>
                <MenuItem value="off">Off</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>SMS Notifications</Typography>
            <Switch
              checked={notifySms}
              onChange={() => setNotifySms(!notifySms)}
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Push Notifications</Typography>
            <Switch
              checked={notifyPush}
              onChange={() => setNotifyPush(!notifyPush)}
            />
          </Stack>

          <PillButton variant="contained" onClick={handleTestNotification}>
            Send test notification
          </PillButton>

          <Divider />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <PillButton variant="outlined" onClick={handleExportData}>
              Export my data
            </PillButton>
            <PillButton variant="outlined" color="error" onClick={handleDeleteAccount}>
              Delete my account
            </PillButton>
          </Stack>
        </Stack>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          variant="filled"
          sx={
            snackbar.severity === "success"
              ? {
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  border: "1px solid #155724",
                  borderRadius: "50px",
                  fontWeight: 500,
                }
              : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
